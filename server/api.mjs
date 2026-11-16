/** Fetch-native API. No migration, session minting or provider setup occurs in this request handler. */
import {ApiError,fail,record,text,number,boolean,choice,calendarDate,instant,timezone,parseJson,id,first,all,run,page,cookies,sameOrigin,bodyJson} from './validation.mjs';
import {handleRecruitmentApi} from './recruitment-api.mjs';
import {handleRecruitmentContact,isPublicRecruitmentContact} from './recruitment-contact.mjs';
import {createRecruitmentProviders} from './recruitment-providers.mjs';
const CATEGORIES=['GEN','GEN_EWS','OBC_NCL','SC','ST'];
const MUTATIONS=new Set(['POST','PATCH','DELETE','PUT']);
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const ok=(data,status=200,headers)=>json({status:'ok',data},status,headers);
const changes=result=>Number(result?.meta?.changes||0);
const utc=(now)=>new Date(now).toISOString();
const isLoopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
const safeDisplay=(value)=>{try{return text(value,'Display name',{max:80})}catch{return 'Candidate'}};
export function createApi(options={}){
 const limits=new Map();
 const credentialLimits=new Map();
 const questionIds=new Set(options.questionIds||[]),paperIds=new Set(options.paperIds||[]),subjects=new Set(options.subjects||[]);
 function limit(key,max,windowMs,now){const current=limits.get(key);if(!current||now-current.start>=windowMs){limits.set(key,{start:now,n:1});return;}if(++current.n>max)fail(429,'rate_limited','Too many requests. Please try again later.');if(limits.size>10000)for(const [k,v] of limits)if(now-v.start>windowMs)limits.delete(k);}
 function limitCredentials(key,max,windowMs,now){
  for(const [storedKey,bucket] of credentialLimits)if(now>=bucket.expiresAt)credentialLimits.delete(storedKey);
  let bucket=credentialLimits.get(key);
  if(!bucket){
   if(credentialLimits.size>=1024)fail(429,'rate_limited','Too many requests. Please try again later.');
   bucket={expiresAt:now+windowMs,n:0};credentialLimits.set(key,bucket);
  }
  if(++bucket.n>max)fail(429,'rate_limited','Too many requests. Please try again later.');
 }
 async function identity(request,db,env,now){
  const mode=options.authMode||env.AUTH_MODE||'unavailable';
  if(mode==='development'){
   if(!isLoopback(new URL(request.url).hostname)||!options.localAuth)return {mode:'unavailable',session:null};
   return {mode,session:await options.localAuth.resolve(request,now)};
  }
  if(mode==='credentials'){
   if(!options.credentialAuth)return {mode:'unavailable',session:null};
   return {mode,session:await options.credentialAuth.resolve(request,now)};
  }
  if(mode==='sites'){
   // Only deploy this mode behind Sites' trusted dispatch, which owns these identity headers.
   const userId=request.headers.get('oai-authenticated-user-id');
   if(!userId)return {mode,session:null};
   if(!/^[A-Za-z0-9_.:@-]{1,200}$/.test(userId))fail(401,'invalid_identity','The session could not be verified.');
   const name=request.headers.get('oai-authenticated-user-full-name');let decoded;
   try{decoded=request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'?decodeURIComponent(name||''):name;}catch{}
   const token=cookies(request).gate_csrf;
   const verifiedEmail=request.headers.get('oai-authenticated-user-email');
   const isOwner=env.OWNER_SITE_USER_ID?userId===env.OWNER_SITE_USER_ID:!!env.OWNER_EMAIL&&!!verifiedEmail&&verifiedEmail.trim().toLowerCase()===env.OWNER_EMAIL.trim().toLowerCase();
   return {mode,session:{user:{id:userId,displayName:safeDisplay(decoded||'Candidate'),isOwner,development:false},csrfToken:/^[a-f0-9]{64}$/.test(token||'')?token:null}};
  }
  return {mode:'unavailable',session:null};
 }
 function caps(db,mode,session,env){return {database:!!db,devAuth:!!db&&mode==='development'&&!!options.localAuth,credentialAuth:!!db&&mode==='credentials'&&!!options.credentialAuth,platformAuth:mode==='sites',owner:!!session?.user?.isOwner,scheduler:!!db&&!!(options.schedulerActive||env.SCHEDULER_ACTIVE==='true')};}
 async function ensureUser(db,session,now){await run(db,'INSERT OR IGNORE INTO users(id,display_name,created_at,last_seen_at) VALUES(?,?,?,?)',session.user.id,session.user.displayName,utc(now),utc(now));await run(db,'UPDATE users SET last_seen_at=? WHERE id=?',utc(now),session.user.id);const stored=await first(db,'SELECT display_name FROM users WHERE id=?',session.user.id);session.user.displayName=stored.display_name;}
 const audit=(db,userId,feature,now)=>run(db,'INSERT INTO activity_events(id,user_id,feature,created_at) VALUES(?,?,?,?)',id(),userId,feature,utc(now));
 async function profile(db,userId,now){await run(db,'INSERT OR IGNORE INTO profiles(user_id,category,target_year,exam_date,daily_minutes,reminder_preference,updated_at) VALUES(?,?,?,?,?,?,?)',userId,'GEN',new Date(now).getUTCFullYear()+1,null,120,'none',utc(now));const p=await first(db,'SELECT p.*,u.display_name FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=?',userId);return {category:p.category,targetYear:p.target_year,examDate:p.exam_date,dailyMinutes:p.daily_minutes,reminderPreference:p.reminder_preference,displayName:p.display_name,updatedAt:p.updated_at};}
 const task=row=>({id:row.id,planId:row.plan_id,date:row.planned_date,subject:row.subject,topic:row.topic,minutes:row.minutes,completed:!!row.completed,createdAt:row.created_at});
 const plan=row=>({id:row.id,title:row.title,mode:row.mode,startDate:row.start_date,endDate:row.end_date,dailyMinutes:row.daily_minutes,createdAt:row.created_at});
 const mock=row=>({id:row.id,title:row.title,takenAt:row.taken_at,score:row.score,total:row.total,durationMinutes:row.duration_minutes,subjectScores:parseJson(row.subject_scores_json,{}),correct:row.correct_count,incorrect:row.incorrect_count,unattempted:row.unattempted_count,topicNotes:parseJson(row.topic_notes_json,[]),provenance:'candidate_entered',createdAt:row.created_at});
 const reminder=(row,scheduler)=>({id:row.id,title:row.title,dueAt:row.due_at,timezone:row.timezone,cadence:row.cadence,enabled:!!row.enabled,completed:!!row.completed,kind:row.kind,mockAttemptId:row.mock_attempt_id,scheduling:row.completed?'complete':!row.enabled?'paused':scheduler?'active':'not_configured',createdAt:row.created_at});
 const notification=row=>({id:row.id,kind:row.kind,title:row.title,body:row.body,readAt:row.read_at,createdAt:row.created_at});
 const estimate=row=>({id:row.id,input:parseJson(row.input_json),estimate:parseJson(row.estimate_json),datasetVersion:row.dataset_version,createdAt:row.created_at});
 function validSubject(value){const subject=text(value,'Subject',{max:120});if(subjects.size&&!subjects.has(subject))fail(400,'invalid_input','Select a known research subject.');return subject;}
 function validTopic(subject,value){const topic=text(value,'Topic',{max:200});const choices=options.topicsBySubject?.[subject];if(choices?.length&&!choices.includes(topic))fail(400,'invalid_input','Select a topic belonging to the selected subject.');return topic;}
 function validateTarget(input){const targetType=choice(input.targetType,['question','paper'],'Bookmark type'),targetId=text(input.targetId,'Bookmark target',{max:100});const valid=(targetType==='question'?questionIds:paperIds);if(!valid.size)fail(503,'catalogue_unavailable','Canonical research identifiers are not configured.');if(!valid.has(targetId))fail(400,'invalid_input','That research record does not exist.');return {targetType,targetId};}
 async function bookmarkRows(db,userId,url){const {limit,offset}=page(url,{defaultLimit:100,maxLimit:520});const rows=await all(db,'SELECT * FROM bookmarks WHERE user_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?',userId,limit,offset);const memberships=await all(db,'SELECT bookmark_id,collection_id FROM bookmark_collections WHERE user_id=?',userId);return {items:rows.map(row=>{const collectionIds=memberships.filter(m=>m.bookmark_id===row.id).map(m=>m.collection_id);return {id:row.id,targetType:row.target_type,targetId:row.target_id,collectionIds,collectionId:collectionIds[0]||null,createdAt:row.created_at}}),total:(await first(db,'SELECT COUNT(*) AS n FROM bookmarks WHERE user_id=?',userId)).n,limit,offset};}
 async function forumRows(db,url,session){
  const {limit,offset}=page(url),subject=url.searchParams.get('subject')||'',search=url.searchParams.get('search')||'';
  if(search.length>160)fail(400,'invalid_input','Search is too long.');
  // Literal substring search avoids D1's short LIKE/GLOB pattern limit and wildcard interpretation.
  const where="t.hidden=0 AND (?='' OR t.subject=?) AND (?='' OR instr(lower(t.title),lower(?))>0 OR instr(lower(t.body),lower(?))>0)",values=[subject,subject,search,search,search];
  const rows=await all(db,"SELECT t.*,u.display_name,(SELECT COUNT(*) FROM forum_votes v WHERE v.entity_type='thread' AND v.entity_id=t.id AND v.active=1) AS votes,(SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id=t.id AND r.hidden=0) AS reply_count FROM forum_threads t JOIN users u ON u.id=t.user_id WHERE "+where+' ORDER BY t.created_at DESC,t.id LIMIT ? OFFSET ?',...values,limit,offset);
  const total=(await first(db,'SELECT COUNT(*) AS n FROM forum_threads t WHERE '+where,...values)).n;
  return {items:rows.map(row=>({id:row.id,title:row.title,body:row.body,subject:row.subject,tags:parseJson(row.tags_json,[]),authorDisplayName:row.display_name,votes:row.votes,replyCount:row.reply_count,createdAt:row.created_at,canModerate:!!session?.user?.isOwner})),total,limit,offset};
 }
 return async function fetchApi(request,env={}){
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,''),now=options.now?.()??Date.now(),db=env.DB||options.db;let auth={mode:'unavailable',session:null};
  try{
   const providers=options.recruitmentProviders||options.recruitmentProviderFactory?.(env)||createRecruitmentProviders(env),recruitmentOptions={...options,recruitmentProviders:providers};
   if(isPublicRecruitmentContact(path,request.method))return await handleRecruitmentContact({request,url,path,db,now,env,providers});
   if(!path.startsWith('/api/'))return json({status:'error',code:'not_found',message:'API route not found.'},404);
   if(path==='/api/capabilities'){
    if(db)await first(db,'SELECT id FROM users LIMIT 1');
    auth=await identity(request,db,env,now);return ok({...caps(db,auth.mode,auth.session,env),authMode:auth.mode,reminderDelivery:options.schedulerActive?'local_process':env.SCHEDULER_ACTIVE==='true'?'configured_runner':'not_configured'});
   }
   if(request.method==='GET'&&(path==='/api/recruitment/catalog'||path==='/api/recruitment/notices'||/^\/api\/recruitment\/notices\/[^/]+$/.test(path)))return await handleRecruitmentApi({request,url,path,db,now,env,options:recruitmentOptions});
   if(!db)fail(503,'database_unavailable','Candidate services require a configured persistent database. Public research remains available.');
   auth=await identity(request,db,env,now);const session=auth.session,capabilities=caps(db,auth.mode,session,env);
   if(path==='/api/session'&&request.method==='GET'){
    if(session)await ensureUser(db,session,now);
    const headers={};if(session&&auth.mode==='sites'&&!session.csrfToken){session.csrfToken=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');headers['set-cookie']='gate_csrf='+session.csrfToken+'; Path=/; HttpOnly; SameSite=Strict; Secure';}
    return ok({status:session?'authenticated':auth.mode==='unavailable'?'unavailable':'anonymous',user:session?.user||null,csrfToken:session?.csrfToken||null,authMode:auth.mode,capabilities},200,headers);
   }
   if(path==='/api/dev/register'||path==='/api/dev/login'){
    if(auth.mode!=='development'||!options.localAuth||!isLoopback(url.hostname))fail(404,'not_found','API route not found.');
    if(request.method!=='POST')fail(405,'method_not_allowed','Use POST.');sameOrigin(request);limit('auth:'+(options.clientKey?.(request)||url.hostname),20,15*60000,now);
    const result=await options.localAuth[path.endsWith('register')?'register':'login'](await bodyJson(request),now,url.protocol==='https:');return ok(result.data,path.endsWith('register')?201:200,{'set-cookie':result.cookie});
   }
   if(path==='/api/auth/register'||path==='/api/auth/login'){
    if(auth.mode!=='credentials'||!options.credentialAuth)fail(404,'not_found','API route not found.');
    if(request.method!=='POST')fail(405,'method_not_allowed','Use POST.');
    sameOrigin(request);
    const registration=path.endsWith('register'),windowMs=15*60000;
    // Public hosts share ingress addresses. Bound credential work globally, then
    // throttle each normalized account independently of socket/forwarded IPs.
    limitCredentials('global',300,windowMs,now);
    if(registration)limitCredentials('registrations',50,windowMs,now);
    const input=await bodyJson(request);
    limitCredentials('account:'+options.credentialAuth.accountRateLimitKey(input),20,windowMs,now);
    const result=await options.credentialAuth[registration?'register':'login'](input,now);
    return ok(result.data,path.endsWith('register')?201:200,{'set-cookie':result.cookie});
   }
   if(path==='/api/auth/logout'&&request.method==='POST'){
    if(auth.mode!=='credentials'||!options.credentialAuth)fail(404,'not_found','API route not found.');
    sameOrigin(request);
    if(session&&(!session.csrfToken||request.headers.get('x-csrf-token')!==session.csrfToken))fail(403,'csrf_failed','Reload the session before signing out.');
    const result=await options.credentialAuth.logout(request);return ok(result.data,200,{'set-cookie':result.cookie});
   }
   const publicRead=request.method==='GET'&&(path==='/api/forum'||/^\/api\/forum\/[^/]+\/replies$/.test(path));
   if(!session&&!publicRead)fail(auth.mode==='unavailable'?503:401,auth.mode==='unavailable'?'authentication_unavailable':'authentication_required',auth.mode==='unavailable'?'Authentication is not configured.':'Sign in to access your workspace.');
   if(session)await ensureUser(db,session,now);
   if(MUTATIONS.has(request.method)){
    sameOrigin(request);if(!session?.csrfToken||request.headers.get('x-csrf-token')!==session.csrfToken)fail(403,'csrf_failed','Reload the session before submitting this action.');
    limit('write:'+session.user.id,120,60000,now);
   }
   const userId=session?.user.id;
   if(path.startsWith('/api/recruitment/')){
    const contact=await handleRecruitmentContact({request,url,path,db,userId,now,env,providers});if(contact)return contact;
    return await handleRecruitmentApi({request,url,path,db,session,userId,now,env,options:recruitmentOptions});
   }
   if(path==='/api/account'&&request.method==='DELETE'){
    if((await bodyJson(request)).confirmation!=='DELETE')fail(400,'confirmation_required','Type DELETE to confirm removal of your website account data.');
    // Preserve other people's replies while removing the deleted author's identity and contribution text.
    const tombstone='__deleted_community_author__';
    await db.batch([
     db.prepare('INSERT OR IGNORE INTO users(id,display_name,created_at,last_seen_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM forum_threads WHERE user_id=? UNION ALL SELECT 1 FROM forum_replies WHERE user_id=? UNION ALL SELECT 1 FROM moderation_events WHERE actor_id=?)').bind(tombstone,'Deleted member',utc(now),utc(now),userId,userId,userId),
     db.prepare("UPDATE forum_threads SET user_id=?,title='Deleted contribution',body='This contribution was removed by its author.',tags_json='[]',hidden=1 WHERE user_id=?").bind(tombstone,userId),
     db.prepare("UPDATE forum_replies SET user_id=?,body='This contribution was removed by its author.',hidden=1 WHERE user_id=?").bind(tombstone,userId),
     db.prepare('UPDATE moderation_events SET actor_id=? WHERE actor_id=?').bind(tombstone,userId),
     db.prepare('DELETE FROM reminders WHERE user_id=?').bind(userId),
     db.prepare('DELETE FROM users WHERE id=?').bind(userId)
    ]);return ok({deleted:true,communityContributions:'removed_and_anonymized',chatgptAccountUnchanged:true});
   }
   if(path==='/api/dev/logout'&&request.method==='POST'){
    if(auth.mode!=='development')fail(404,'not_found','API route not found.');const result=await options.localAuth.logout(request);return ok(result.data,200,{'set-cookie':result.cookie});
   }
   if(path==='/api/profile'){
    if(request.method==='GET')return ok(await profile(db,userId,now));
    if(request.method==='PATCH'){
     const input=await bodyJson(request);await profile(db,userId,now);
     const current=await profile(db,userId,now),next={...current};
     if(input.category!==undefined)next.category=choice(input.category,CATEGORIES,'Category');
     if(input.targetYear!==undefined)next.targetYear=number(input.targetYear,'Target year',{min:2020,max:2040,integer:true});
     if(input.examDate!==undefined)next.examDate=input.examDate===null?null:calendarDate(input.examDate,'Exam date');
     if(input.dailyMinutes!==undefined)next.dailyMinutes=number(input.dailyMinutes,'Daily minutes',{min:1,max:1440,integer:true});
     if(input.reminderPreference!==undefined)next.reminderPreference=choice(input.reminderPreference,['none','in_app'],'Reminder preference');
     if(input.displayName!==undefined)next.displayName=text(input.displayName,'Display name',{max:80});
     await db.batch([db.prepare('UPDATE profiles SET category=?,target_year=?,exam_date=?,daily_minutes=?,reminder_preference=?,updated_at=? WHERE user_id=?').bind(next.category,next.targetYear,next.examDate,next.dailyMinutes,next.reminderPreference,utc(now),userId),db.prepare('UPDATE users SET display_name=? WHERE id=?').bind(next.displayName,userId)]);await audit(db,userId,'profile',now);return ok(await profile(db,userId,now));
    }
   }
   if(path==='/api/collections'){
    if(request.method==='GET'){const rows=await all(db,'SELECT c.*,(SELECT COUNT(*) FROM bookmark_collections b WHERE b.collection_id=c.id AND b.user_id=c.user_id) AS count FROM collections c WHERE c.user_id=? ORDER BY c.created_at DESC',userId);return ok({items:rows.map(r=>({id:r.id,name:r.name,description:r.description,count:r.count,createdAt:r.created_at}))});}
    if(request.method==='POST'){const input=await bodyJson(request),name=text(input.name,'Collection name',{max:80}),description=text(input.description||'','Description',{min:0,max:500}),collectionId=id();if(await first(db,'SELECT id FROM collections WHERE user_id=? AND name=?',userId,name))fail(409,'duplicate','A collection with that name already exists.');await run(db,'INSERT INTO collections(id,user_id,name,description,created_at) VALUES(?,?,?,?,?)',collectionId,userId,name,description,utc(now));return ok({id:collectionId,name,description,count:0,createdAt:utc(now)},201);}
   }
   if(path==='/api/bookmarks'){
    if(request.method==='GET')return ok(await bookmarkRows(db,userId,url));
    if(request.method==='POST'){
     const input=await bodyJson(request),{targetType,targetId}=validateTarget(input),collectionId=input.collectionId?text(input.collectionId,'Collection',{max:100}):null;
     if(collectionId&&!await first(db,'SELECT id FROM collections WHERE id=? AND user_id=?',collectionId,userId))fail(404,'not_found','Collection not found.');
     let bookmark=await first(db,'SELECT * FROM bookmarks WHERE user_id=? AND target_type=? AND target_id=?',userId,targetType,targetId);
     if(!bookmark){const bookmarkId=id();await run(db,'INSERT OR IGNORE INTO bookmarks(id,user_id,target_type,target_id,created_at) VALUES(?,?,?,?,?)',bookmarkId,userId,targetType,targetId,utc(now));bookmark=await first(db,'SELECT * FROM bookmarks WHERE user_id=? AND target_type=? AND target_id=?',userId,targetType,targetId);}
     if(collectionId)await run(db,'INSERT OR IGNORE INTO bookmark_collections(bookmark_id,collection_id,user_id) VALUES(?,?,?)',bookmark.id,collectionId,userId);
     await audit(db,userId,'bookmarks',now);const ownMemberships=await all(db,'SELECT collection_id FROM bookmark_collections WHERE bookmark_id=? AND user_id=?',bookmark.id,userId);const collectionIds=ownMemberships.map(row=>row.collection_id);return ok({id:bookmark.id,targetType:bookmark.target_type,targetId:bookmark.target_id,collectionIds,collectionId:collectionIds[0]||null,createdAt:bookmark.created_at});
    }
   }
   const bookmarkMatch=path.match(/^\/api\/bookmarks\/([^/]+)$/);
   if(bookmarkMatch&&request.method==='DELETE'){
    const bookmarkId=bookmarkMatch[1];if(!await first(db,'SELECT id FROM bookmarks WHERE id=? AND user_id=?',bookmarkId,userId))fail(404,'not_found','Bookmark not found.');const collectionId=url.searchParams.get('collectionId');
    if(collectionId)await run(db,'DELETE FROM bookmark_collections WHERE bookmark_id=? AND collection_id=? AND user_id=?',bookmarkId,collectionId,userId);else await run(db,'DELETE FROM bookmarks WHERE id=? AND user_id=?',bookmarkId,userId);return ok({removed:true});
   }
   if(path==='/api/estimates'){
    if(request.method==='GET'){const {limit,offset}=page(url);return ok({items:(await all(db,'SELECT * FROM estimates WHERE user_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?',userId,limit,offset)).map(estimate),limit,offset});}
    if(request.method==='POST'){
     if(typeof options.predictRank!=='function')fail(503,'predictor_unavailable','The rank calculation adapter is unavailable.');
     const input=await bodyJson(request),requestInput={marks:number(input.marks,'Marks',{min:-20,max:100}),year:number(input.year,'Year',{min:2013,max:2027,integer:true}),category:choice(input.category,CATEGORIES,'Category')};
     if(input.toughness!==undefined)requestInput.toughness=number(input.toughness,'Toughness scenario',{min:-2,max:3,integer:true});
     let result;try{result=options.predictRank(requestInput);}catch(error){fail(400,'invalid_input',error.message||'The model does not support this input.');}
     const estimateId=id();await run(db,'INSERT INTO estimates(id,user_id,input_json,estimate_json,dataset_version,created_at) VALUES(?,?,?,?,?,?)',estimateId,userId,JSON.stringify(requestInput),JSON.stringify(result),result.datasetVersion||options.careerDataVersion||'unversioned',utc(now));await audit(db,userId,'rank',now);return ok(estimate(await first(db,'SELECT * FROM estimates WHERE id=? AND user_id=?',estimateId,userId)),201);
    }
   }
   if(path==='/api/planner'){
    if(request.method==='GET'){const {limit,offset}=page(url,{defaultLimit:100,maxLimit:520});return ok({plans:(await all(db,'SELECT * FROM study_plans WHERE user_id=? ORDER BY created_at DESC,id',userId)).map(plan),tasks:(await all(db,'SELECT * FROM study_tasks WHERE user_id=? ORDER BY planned_date,id LIMIT ? OFFSET ?',userId,limit,offset)).map(task),limit,offset});}
    if(request.method==='POST'){
     const input=await bodyJson(request),title=text(input.title,'Plan title',{max:160}),mode=choice(input.mode,['daily','weekly'],'Planning mode'),startDate=calendarDate(input.startDate,'Start date'),endDate=calendarDate(input.endDate,'End date'),dailyMinutes=number(input.dailyMinutes,'Daily minutes',{min:1,max:1440,integer:true});
     if(endDate<startDate||Date.parse(endDate)-Date.parse(startDate)>366*864e5)fail(400,'invalid_input','Use a plan interval of at most 366 days with the end after the start.');
     if(!Array.isArray(input.tasks)||!input.tasks.length||input.tasks.length>520)fail(400,'invalid_input','A plan needs between 1 and 520 tasks.');
     const planId=id(),budgets=new Map(),tasks=input.tasks.map(value=>{const t=record(value),date=calendarDate(t.date||t.plannedDate,'Task date'),subject=validSubject(t.subject),topic=validTopic(subject,t.topic),minutes=number(t.minutes,'Task minutes',{min:1,max:1440,integer:true});if(date<startDate||date>endDate)fail(400,'invalid_input','Task dates must belong to the plan interval.');budgets.set(date,(budgets.get(date)||0)+minutes);return {id:id(),planId,date,subject,topic,minutes,completed:false,createdAt:utc(now)};});
     if([...budgets.values()].some(minutes=>minutes>dailyMinutes))fail(400,'invalid_input','Task minutes exceed the daily plan budget.');
     await db.batch([db.prepare('INSERT INTO study_plans(id,user_id,title,mode,start_date,end_date,daily_minutes,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(planId,userId,title,mode,startDate,endDate,dailyMinutes,utc(now)),...tasks.map(t=>db.prepare('INSERT INTO study_tasks(id,user_id,plan_id,planned_date,subject,topic,minutes,completed,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(t.id,userId,planId,t.date,t.subject,t.topic,t.minutes,0,t.createdAt))]);await audit(db,userId,'planner',now);return ok({plan:{id:planId,title,mode,startDate,endDate,dailyMinutes,createdAt:utc(now)},tasks},201);
    }
   }
   const taskMatch=path.match(/^\/api\/planner\/([^/]+)$/);
   if(taskMatch&&request.method==='PATCH'){const input=await bodyJson(request),completed=boolean(input.completed,'Completed');const result=await run(db,'UPDATE study_tasks SET completed=? WHERE id=? AND user_id=?',Number(completed),taskMatch[1],userId);if(!changes(result))fail(404,'not_found','Task not found.');return ok(task(await first(db,'SELECT * FROM study_tasks WHERE id=? AND user_id=?',taskMatch[1],userId)));}
   if(path==='/api/mocks'){
    if(request.method==='GET'){const {limit,offset}=page(url,{defaultLimit:100});return ok({items:(await all(db,'SELECT * FROM mock_attempts WHERE user_id=? ORDER BY taken_at DESC,id LIMIT ? OFFSET ?',userId,limit,offset)).map(mock),limit,offset});}
    if(request.method==='POST'){
     const input=await bodyJson(request),title=text(input.title,'Mock title',{max:160}),takenAt=instant(input.takenAt,'Attempt time'),total=number(input.total,'Total marks',{min:.01,max:10000}),score=number(input.score,'Score',{min:-total,max:total}),duration=number(input.durationMinutes,'Duration',{min:1,max:1440,integer:true});
     if(Date.parse(takenAt)>now+864e5)fail(400,'invalid_input','An attempt cannot be recorded in the future.');
     const breakdown=record(input.subjectScores||{}),subjectScores={};
     for(const [key,value] of Object.entries(breakdown)){const subject=validSubject(key);subjectScores[subject]=number(value,'Subject score',{min:-total,max:total});}
     if(Object.keys(subjectScores).length&&Math.abs(Object.values(subjectScores).reduce((sum,n)=>sum+n,0)-score)>.02)fail(400,'invalid_input','Supplied subject scores must reconcile to the total score. Leave the breakdown empty if it is incomplete.');
     const countKeys=['correct','incorrect','unattempted'],provided=countKeys.filter(k=>input[k]!==undefined&&input[k]!==null),counts={correct:null,incorrect:null,unattempted:null};
     if(provided.length&&provided.length!==3)fail(400,'invalid_input','Provide all three accuracy counts or leave all blank.');
     if(provided.length){for(const key of countKeys)counts[key]=number(input[key],key+' count',{min:0,max:1000,integer:true});if(countKeys.reduce((sum,k)=>sum+counts[k],0)<1||countKeys.reduce((sum,k)=>sum+counts[k],0)>1000)fail(400,'invalid_input','Question counts must total from 1 to 1000.');}
     if(!Array.isArray(input.topicNotes||[])||(input.topicNotes||[]).length>100)fail(400,'invalid_input','Too many topic notes.');
     const topicNotes=(input.topicNotes||[]).map(value=>{const note=record(value),subject=validSubject(note.subject);return {subject,topic:validTopic(subject,note.topic),errors:number(note.errors,'Topic errors',{min:0,max:1000,integer:true})};});
     if(counts.incorrect!==null&&topicNotes.reduce((sum,note)=>sum+note.errors,0)>counts.incorrect)fail(400,'invalid_input','Topic errors cannot exceed the entered incorrect-question count.');
     const mockId=id();await run(db,'INSERT INTO mock_attempts(id,user_id,title,taken_at,score,total,duration_minutes,subject_scores_json,correct_count,incorrect_count,unattempted_count,topic_notes_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',mockId,userId,title,takenAt,score,total,duration,JSON.stringify(subjectScores),counts.correct,counts.incorrect,counts.unattempted,JSON.stringify(topicNotes),utc(now));await audit(db,userId,'mocks',now);return ok(mock(await first(db,'SELECT * FROM mock_attempts WHERE id=? AND user_id=?',mockId,userId)),201);
    }
   }
   if(path==='/api/reminders'||path==='/api/mock-deadlines'){
    const kind=path.endsWith('mock-deadlines')?'mock_deadline':'revision';
    if(request.method==='GET'){const {limit,offset}=page(url,{defaultLimit:100});return ok({items:(await all(db,'SELECT * FROM reminders WHERE user_id=? AND kind=? ORDER BY completed,due_at,id LIMIT ? OFFSET ?',userId,kind,limit,offset)).map(row=>reminder(row,capabilities.scheduler)),scheduler:{active:capabilities.scheduler,mode:options.schedulerActive?'local_process':env.SCHEDULER_ACTIVE==='true'?'configured_runner':'not_configured'},limit,offset});}
    if(request.method==='POST'){
     const input=await bodyJson(request),title=text(input.title,'Reminder title',{max:180}),dueAt=instant(input.dueAt,'Due time'),zone=timezone(input.timezone),cadence=kind==='mock_deadline'?'once':choice(input.cadence,['once','daily','weekly'],'Cadence');
     const mockAttemptId=input.mockAttemptId?text(input.mockAttemptId,'Mock attempt',{max:100}):null;
     if(mockAttemptId&&!await first(db,'SELECT id FROM mock_attempts WHERE id=? AND user_id=?',mockAttemptId,userId))fail(404,'not_found','Mock attempt not found.');
     await profile(db,userId,now);const reminderId=id();await run(db,'INSERT INTO reminders(id,user_id,title,due_at,timezone,cadence,kind,mock_attempt_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)',reminderId,userId,title,dueAt,zone,cadence,kind,mockAttemptId,utc(now));await audit(db,userId,kind==='mock_deadline'?'mocks':'reminders',now);return ok(reminder(await first(db,'SELECT * FROM reminders WHERE id=? AND user_id=?',reminderId,userId),capabilities.scheduler),201);
    }
   }
   const reminderMatch=path.match(/^\/api\/(reminders|mock-deadlines)\/([^/]+)$/);
   if(reminderMatch&&request.method==='PATCH'){
    const input=await bodyJson(request),row=await first(db,'SELECT * FROM reminders WHERE id=? AND user_id=? AND kind=?',reminderMatch[2],userId,reminderMatch[1]==='mock-deadlines'?'mock_deadline':'revision');if(!row)fail(404,'not_found','Reminder not found.');
    let enabled=row.enabled,completed=row.completed;
    if(input.enabled!==undefined){enabled=Number(boolean(input.enabled,'Enabled'));if(enabled)completed=0;}
    if(input.completed!==undefined){completed=Number(boolean(input.completed,'Completed'));if(completed)enabled=0;}
    if(input.enabled===undefined&&input.completed===undefined)fail(400,'invalid_input','Supply an enabled or completed status.');
    await run(db,'UPDATE reminders SET enabled=?,completed=? WHERE id=? AND user_id=?',enabled,completed,row.id,userId);return ok(reminder({...row,enabled,completed},capabilities.scheduler));
   }
   if(path==='/api/notifications'&&request.method==='GET'){const {limit,offset}=page(url,{defaultLimit:100});return ok({items:(await all(db,'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?',userId,limit,offset)).map(notification),limit,offset});}
   const notificationMatch=path.match(/^\/api\/notifications\/([^/]+)$/);
   if(notificationMatch&&request.method==='PATCH'){const input=await bodyJson(request);if(input.read!==true)fail(400,'invalid_input','Only a read acknowledgement is supported.');const result=await run(db,'UPDATE notifications SET read_at=? WHERE id=? AND user_id=?',utc(now),notificationMatch[1],userId);if(!changes(result))fail(404,'not_found','Notification not found.');return ok({id:notificationMatch[1],readAt:utc(now)});}
   if(path==='/api/dashboard'&&request.method==='GET'){
    const p=await profile(db,userId,now),count=async(sql,...args)=>(await first(db,sql,...args)).n;
    const counts={tasks:await count('SELECT COUNT(*) AS n FROM study_tasks WHERE user_id=?',userId),completedTasks:await count('SELECT COUNT(*) AS n FROM study_tasks WHERE user_id=? AND completed=1',userId),mocks:await count('SELECT COUNT(*) AS n FROM mock_attempts WHERE user_id=?',userId),bookmarks:await count('SELECT COUNT(*) AS n FROM bookmarks WHERE user_id=?',userId),estimates:await count('SELECT COUNT(*) AS n FROM estimates WHERE user_id=?',userId),reminders:await count('SELECT COUNT(*) AS n FROM reminders WHERE user_id=? AND enabled=1',userId),unreadNotifications:await count('SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND read_at IS NULL',userId)};
    return ok({profile:p,counts,tasks:(await all(db,'SELECT * FROM study_tasks WHERE user_id=? AND completed=0 ORDER BY planned_date,id LIMIT 8',userId)).map(task),mocks:(await all(db,'SELECT * FROM mock_attempts WHERE user_id=? ORDER BY taken_at DESC,id LIMIT 8',userId)).map(mock),estimates:(await all(db,'SELECT * FROM estimates WHERE user_id=? ORDER BY created_at DESC,id LIMIT 8',userId)).map(estimate),notifications:(await all(db,'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC,id LIMIT 8',userId)).map(notification)});
   }
   if(path==='/api/forum'){
    if(request.method==='GET')return ok(await forumRows(db,url,session));
    if(request.method==='POST'){
     const input=await bodyJson(request),title=text(input.title,'Discussion title',{min:3,max:240}),body=text(input.body,'Discussion text',{min:3,max:10000}),subject=input.subject==='General'?'General':validSubject(input.subject);
     if(!Array.isArray(input.tags||[])||(input.tags||[]).length>8)fail(400,'invalid_input','Use at most eight tags.');const tags=[...new Set((input.tags||[]).map(tag=>text(tag,'Tag',{max:40})))];
     const threadId=id();await run(db,'INSERT INTO forum_threads(id,user_id,title,body,subject,tags_json,created_at) VALUES(?,?,?,?,?,?,?)',threadId,userId,title,body,subject,JSON.stringify(tags),utc(now));await audit(db,userId,'community',now);return ok({id:threadId,title,body,subject,tags,authorDisplayName:session.user.displayName,votes:0,replyCount:0,createdAt:utc(now),canModerate:!!session.user.isOwner},201);
    }
   }
   const replyMatch=path.match(/^\/api\/forum\/([^/]+)\/replies$/);
   if(replyMatch){
    const thread=await first(db,'SELECT id FROM forum_threads WHERE id=? AND hidden=0',replyMatch[1]);if(!thread)fail(404,'not_found','Discussion not found.');
    if(request.method==='GET'){const {limit,offset}=page(url);const rows=await all(db,'SELECT r.*,u.display_name,(SELECT COUNT(*) FROM forum_votes v WHERE v.entity_type=\'reply\' AND v.entity_id=r.id AND v.active=1) AS votes FROM forum_replies r JOIN users u ON u.id=r.user_id WHERE r.thread_id=? AND r.hidden=0 ORDER BY r.created_at,r.id LIMIT ? OFFSET ?',thread.id,limit,offset);return ok({items:rows.map(row=>({id:row.id,threadId:row.thread_id,body:row.body,authorDisplayName:row.display_name,votes:row.votes,createdAt:row.created_at,canModerate:!!session?.user?.isOwner})),limit,offset});}
    if(request.method==='POST'){const input=await bodyJson(request),body=text(input.body,'Reply',{min:1,max:10000}),replyId=id();await run(db,'INSERT INTO forum_replies(id,thread_id,user_id,body,created_at) VALUES(?,?,?,?,?)',replyId,thread.id,userId,body,utc(now));await audit(db,userId,'community',now);return ok({id:replyId,threadId:thread.id,body,authorDisplayName:session.user.displayName,votes:0,createdAt:utc(now),canModerate:!!session.user.isOwner},201);}
   }
   if(path==='/api/forum/vote'&&request.method==='POST'){
    const input=await bodyJson(request),entity=choice(input.entity,['thread','reply'],'Vote target'),entityId=text(input.id,'Vote target',{max:100});const table=entity==='thread'?'forum_threads':'forum_replies';const target=await first(db,'SELECT id FROM '+table+' WHERE id=? AND hidden=0'+(entity==='reply'?' AND EXISTS(SELECT 1 FROM forum_threads t WHERE t.id=forum_replies.thread_id AND t.hidden=0)':''),entityId);if(!target)fail(404,'not_found','Vote target not found.');
    const state=await first(db,'INSERT INTO forum_votes(user_id,entity_type,entity_id,active,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,entity_type,entity_id) DO UPDATE SET active=1-forum_votes.active RETURNING active',userId,entity,entityId,1,utc(now));
    return ok({votes:(await first(db,'SELECT COUNT(*) AS n FROM forum_votes WHERE entity_type=? AND entity_id=? AND active=1',entity,entityId)).n,voted:!!state.active});
   }
   if(path==='/api/forum/moderate'&&request.method==='POST'){
    if(!session.user.isOwner)fail(403,'owner_required','Only the configured owner can moderate discussions.');
    const input=await bodyJson(request),entity=choice(input.entity,['thread','reply'],'Moderation target'),entityId=text(input.id,'Moderation target',{max:100}),hidden=boolean(input.hidden,'Hidden'),table=entity==='thread'?'forum_threads':'forum_replies';
    if(!await first(db,'SELECT id FROM '+table+' WHERE id=?',entityId))fail(404,'not_found','Moderation target not found.');
    await db.batch([db.prepare('UPDATE '+table+' SET hidden=? WHERE id=?').bind(Number(hidden),entityId),db.prepare('INSERT INTO moderation_events(id,actor_id,entity_type,entity_id,hidden,created_at) VALUES(?,?,?,?,?,?)').bind(id(),userId,entity,entityId,Number(hidden),utc(now))]);return ok({id:entityId,hidden});
   }
   if(path==='/api/admin/metrics'&&request.method==='GET'){
    if(!session.user.isOwner)fail(403,'owner_required','This workspace is restricted to the configured owner.');
    await audit(db,userId,'owner_metrics',now);
    const days=number(Number(url.searchParams.get('days')||28),'Metrics interval',{min:7,max:90,integer:true});if(![7,28,90].includes(days))fail(400,'invalid_input','Use a 7, 28 or 90 day interval.');const since=utc(now-days*864e5),threshold=options.privacyThreshold||5;
    const totalUsers=(await first(db,'SELECT COUNT(*) AS n FROM users')).n,active=(await first(db,'SELECT COUNT(DISTINCT user_id) AS n FROM activity_events WHERE created_at>=?',since)).n;
    const features=await all(db,'SELECT feature,COUNT(*) AS events,COUNT(DISTINCT user_id) AS users FROM activity_events WHERE created_at>=? GROUP BY feature ORDER BY feature',since);
    const usage=await all(db,'SELECT substr(created_at,1,10) AS day,COUNT(*) AS events,COUNT(DISTINCT user_id) AS users FROM activity_events WHERE created_at>=? GROUP BY day ORDER BY day',since);
    const health=await first(db,'SELECT SUM(attempt_count) AS attempted,COUNT(DISTINCT user_id) AS users,SUM(CASE WHEN status=\'delivered\' AND attempt_count>0 THEN 1 ELSE 0 END) AS delivered,SUM(CASE WHEN status=\'failed\' THEN attempt_count ELSE MAX(0,attempt_count-1) END) AS failed FROM reminder_deliveries WHERE attempted_at>=? AND status<>\'skipped\'',since),heartbeat=await first(db,'SELECT completed_at FROM scheduler_runs WHERE outcome=\'completed\' ORDER BY completed_at DESC LIMIT 1');
    const measured=health.attempted>0&&health.users>=threshold;
    return ok({days,generatedAt:utc(now),registeredUsers:totalUsers>=threshold?totalUsers:null,activeUsers:active>=threshold?active:null,featureAdoption:features.map(row=>({feature:row.feature,events:row.users>=threshold?row.events:null,distinctUsers:row.users>=threshold?row.users:null,suppressed:row.users<threshold})),usage:usage.map(row=>({date:row.day,events:row.users>=threshold?row.events:null,suppressed:row.users<threshold})),reminderHealth:{measurement:measured?'observed_delivery_log':'unavailable',attempted:measured?health.attempted:null,delivered:measured?health.delivered:null,failed:measured?health.failed:null,deliveryRate:measured?health.delivered/health.attempted:null,lastHeartbeatAt:heartbeat?.completed_at||null},privacy:{minimumDistinctUsers:threshold},system:{database:'connected',scheduler:capabilities.scheduler?'configured_runner':'not_configured'}});
   }
   fail(404,'not_found','API route not found.');
  }catch(error){
   const requestId=id();
   if(error instanceof ApiError)return json({status:error.status===503?'unavailable':'error',code:error.code,message:error.message,requestId},error.status,error.status===429?{'retry-after':'60'}:{});
   options.log?.({level:'error',code:'api_dependency_failed',path,requestId});
   return json({status:'unavailable',code:'dependency_failed',message:'The service could not complete this request. Please try again later.',requestId},503);
  }
 };
}
