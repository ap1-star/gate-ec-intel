import {all,first,run,id,fail,text,record,bodyJson,sameOrigin,page,parseJson,number,instant} from './validation.mjs';
import {getRecruitmentPreferences,saveRecruitmentPreferences,deleteRecruitmentPreferences,channelCapabilities,setRecruitmentConsent,listRecruitmentNotices,getRecruitmentNotice,saveRecruitmentOpportunity,bootstrapRecruitmentCatalogue,ingestRecruitmentNotice,recruitmentNotice,officialUrl} from './recruitment-store.mjs';
import {scheduleRecruitmentReminders} from './recruitment-queue.mjs';
const utc=now=>new Date(now).toISOString();
const pendingDiscovery=notice=>notice.verificationStatus!=='verified'&&notice.status==='unknown'&&(!Array.isArray(notice.posts)||notice.posts.length===0);
const ok=(data,status=200)=>new Response(JSON.stringify({status:'ok',data}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
/** Isolated subhandler. Public catalog has a no-database fallback; private data still requires verified parent session and CSRF. */
export async function handleRecruitmentApi({request,url=new URL(request.url),path=url.pathname,db,session=null,userId=session?.user?.id,now=Date.now(),env={},options={}}){
 if(!path.startsWith('/api/recruitment/'))return null;
 const catalogue=options.recruitmentCatalogue||{},providers=options.recruitmentProviders||{},publicRead=request.method==='GET'&&(path==='/api/recruitment/catalog'||path==='/api/recruitment/notices'||/^\/api\/recruitment\/notices\/[^/]+$/.test(path));
 if(publicRead){
  const stored=db?await listRecruitmentNotices(db,{now}):[],combined=[...stored,...(catalogue.notices||[]).filter(notice=>!stored.some(row=>row.id===notice.id))],pendingReviewCount=combined.filter(pendingDiscovery).length,notices=combined.filter(notice=>!pendingDiscovery(notice));
  if(path==='/api/recruitment/catalog'){
   const sourceHealth=db?(await all(db,'SELECT id,url,adapter,last_checked_at,last_success_at,last_error FROM recruitment_sources ORDER BY id')).map(row=>({id:row.id,url:row.url,adapter:row.adapter,lastCheckedAt:row.last_checked_at,lastSuccessAt:row.last_success_at,status:row.last_error?'error':row.last_success_at?'checked':'not_checked',errorCode:row.last_error||null})):[];
   return ok({organizations:catalogue.organizations||[],examinations:catalogue.examinations||[],recruitingBodies:catalogue.recruitingBodies||[],cycles:catalogue.cycles||[],pathways:catalogue.pathways||[],notices:notices.slice(0,500),discovery:{pendingReviewCount},sourceHealth,capabilities:{database:!!db,authenticated:!!session,channels:db?await channelCapabilities(db,userId,providers):Object.fromEntries(['in_app','email','push','whatsapp','sms'].map(channel=>[channel,{configured:false,recipientVerified:false,consented:false,reason:'database_not_configured'}])),scheduler:{configured:!!db&&!!(options.schedulerActive||env.SCHEDULER_ACTIVE==='true')}}});
  }
  if(path==='/api/recruitment/notices'){const {limit,offset}=page(url,{defaultLimit:100,maxLimit:500});return ok({items:notices.slice(offset,offset+limit),total:notices.length,limit,offset});}
  const noticeId=decodeURIComponent(path.split('/').at(-1)),notice=notices.find(row=>row.id===noticeId);if(!notice)fail(404,'not_found','Recruitment notice not found.');return ok(notice);
 }
 if(!db)fail(503,'database_unavailable','Persistent recruitment preferences require a configured SQL database.');
 if(!session?.user?.id||userId!==session.user.id)fail(401,'authentication_required','Sign in to manage private recruitment preferences.');
 if(['POST','PUT','PATCH','DELETE'].includes(request.method)){sameOrigin(request);if(!session.csrfToken||request.headers.get('x-csrf-token')!==session.csrfToken)fail(403,'csrf_failed','Reload your session before changing recruitment preferences.');}
 if(path==='/api/recruitment/review'||path.startsWith('/api/recruitment/review/')){
  if(!session.user.isOwner)fail(403,'owner_required','Official notice review is restricted to the configured owner.');
  if(path==='/api/recruitment/review'&&request.method==='GET'){const {limit,offset}=page(url,{defaultLimit:25,maxLimit:100}),rows=await all(db,"SELECT * FROM recruitment_notices WHERE verification_status='review_required' ORDER BY checked_at DESC,id LIMIT ? OFFSET ?",limit,offset);return ok({items:rows.map(row=>recruitmentNotice(row,{now})),total:(await first(db,"SELECT COUNT(*) AS n FROM recruitment_notices WHERE verification_status='review_required'")).n,limit,offset});}
  const reviewMatch=path.match(/^\/api\/recruitment\/review\/([^/]+)$/);
  if(reviewMatch&&request.method==='PUT'){
   const noticeId=decodeURIComponent(reviewMatch[1]),current=await getRecruitmentNotice(db,noticeId,{now});if(!current)fail(404,'not_found','Review notice not found.');
   if(current.verificationStatus!=='review_required')fail(409,'not_pending_review','This notice is not waiting for official-source review.');
   const input=await bodyJson(request),expectedVersion=number(input.expectedVersion,'Expected notice version',{min:1,max:1000000000,integer:true});if(expectedVersion!==current.version)fail(409,'revision_changed','Reload and review the current source revision.');
   const attestation=record(input.attestation),reviewedAt=instant(attestation.reviewedAt,'Human review time');
   if(attestation.reviewedByHuman!==true||attestation.officialSourceConfirmed!==true||attestation.technicalPostsVerified!==true)fail(400,'review_attestation_required','Explicit human, official-source and post-specific technical review attestations are required.');
   if(Date.parse(reviewedAt)>now||Date.parse(reviewedAt)<Date.parse(current.checkedAt))fail(400,'stale_review','Review the currently checked source revision before approving.');
   if(officialUrl(attestation.sourceUrl)!==current.sourceUrl)fail(400,'source_mismatch','The attested URL must be the exact registered notice URL.');
   if(current.contentHash&&attestation.sourceContentHash!==current.contentHash)fail(409,'source_hash_changed','The attestation must match the current source content hash.');
   const notes=text(attestation.notes,'Review notes',{min:20,max:2000}),source=await first(db,'SELECT * FROM recruitment_sources WHERE id=?',current.sourceId),hosts=parseJson(source?.allowed_hosts_json,[]),noticeInput=record(input.notice||input);
   const evidenceUrls=[current.sourceUrl,...(Array.isArray(noticeInput.additionalSourceUrls)?noticeInput.additionalSourceUrls:[])].map(value=>officialUrl(value));if(evidenceUrls.length>11||evidenceUrls.some(value=>!hosts.includes(new URL(value).hostname)))fail(400,'source_not_allowed','Every reviewed document must belong to the registered official source hosts.');
   const posts=validatedReviewPosts(noticeInput.posts,current,evidenceUrls,attestation,reviewedAt);
   if(noticeInput.deadlineVerified===true&&(attestation.exactDeadlineVerified!==true||!noticeInput.deadlineAt||!noticeInput.deadlineTimezone))fail(400,'deadline_evidence_required','An exact official closing instant and timezone require a separate explicit deadline attestation.');
   const auditId=id(),vetted={...current,...noticeInput,id:current.id,sourceId:current.sourceId,sourceUrl:current.sourceUrl,contentHash:current.contentHash,additionalSourceUrls:evidenceUrls.filter(value=>value!==current.sourceUrl),posts,verificationStatus:'verified',verifiedAt:reviewedAt};
   const review={id:auditId,actorId:userId,officialSourceAttested:true,attestation:{reviewedByHuman:true,officialSourceConfirmed:true,technicalPostsVerified:true,completeCriteriaReviewed:attestation.completeCriteriaReviewed===true,exactDeadlineVerified:attestation.exactDeadlineVerified===true,sourceUrl:current.sourceUrl,sourceContentHash:current.contentHash||null,reviewedAt,notes,evidenceUrls}};
   const result=await ingestRecruitmentNotice(db,vetted,{now,expectedVersion,reviewAudit:review});return ok({notice:result.notice,audit:{id:auditId,reviewedAt,previousVersion:expectedVersion,approvedVersion:result.notice.version}});
  }
  fail(405,'method_not_allowed','Use GET for the review queue or PUT for a specific pending notice.');
 }
 const privatePreferences=async()=>({...await getRecruitmentPreferences(db,userId),capabilities:await channelCapabilities(db,userId,providers)});
 if(path==='/api/recruitment/preferences'){
  if(request.method==='GET')return ok(await privatePreferences());
  if(request.method==='PUT'){await saveRecruitmentPreferences(db,userId,await bodyJson(request),{now});await scheduleRecruitmentReminders(db,{now,userId});return ok(await privatePreferences());}
  if(request.method==='DELETE'){return ok(await deleteRecruitmentPreferences(db,userId,{now}));}
 }
 if(path==='/api/recruitment/consent'&&request.method==='PUT'){const input=await bodyJson(request);await setRecruitmentConsent(db,userId,input.channel,input.enabled,{now,providers});await scheduleRecruitmentReminders(db,{now,userId});return ok(await privatePreferences());}
 if(path==='/api/recruitment/saved'){
  if(request.method==='GET'){const rows=await all(db,'SELECT s.*,n.payload_json,n.source_url,n.organization_id,n.examination_id,n.title,n.status,n.verified_at,n.verification_status,n.deadline_at,n.deadline_timezone,n.deadline_verified,n.version,n.source_id,n.application_url,n.published_at,n.checked_at FROM recruitment_saved s JOIN recruitment_notices n ON n.id=s.notice_id WHERE s.user_id=? ORDER BY s.created_at DESC',userId);const notices=await listRecruitmentNotices(db,{now});return ok({items:rows.map(row=>({noticeId:row.notice_id,reminderDays:parseJson(row.reminder_days_json,[]),savedAt:row.created_at,notice:notices.find(n=>n.id===row.notice_id)})),total:rows.length});}
  if(request.method==='POST'){const input=await bodyJson(request),noticeId=text(input.noticeId,'Notice ID',{max:160});
   if(!await getRecruitmentNotice(db,noticeId,{now})&&(catalogue.notices||[]).some(notice=>notice.id===noticeId))await bootstrapRecruitmentCatalogue(db,catalogue,{now});
   const saved=await saveRecruitmentOpportunity(db,userId,noticeId,input.reminderDays||[],{now});await scheduleRecruitmentReminders(db,{now,userId,noticeId});return ok({...saved,notice:await getRecruitmentNotice(db,noticeId,{now})},201);}
 }
 const savedMatch=path.match(/^\/api\/recruitment\/saved\/([^/]+)$/);
 if(savedMatch&&request.method==='DELETE'){const noticeId=decodeURIComponent(savedMatch[1]),existing=await first(db,'SELECT notice_id FROM recruitment_saved WHERE user_id=? AND notice_id=?',userId,noticeId);if(!existing)fail(404,'not_found','Saved opportunity not found.');await db.batch([db.prepare('DELETE FROM recruitment_saved WHERE user_id=? AND notice_id=?').bind(userId,noticeId),db.prepare("UPDATE recruitment_jobs SET status='cancelled',last_error='opportunity_unsaved',updated_at=? WHERE user_id=? AND notice_id=? AND kind='deadline_reminder' AND status IN('queued','retry','blocked','leased')").bind(utc(now),userId,noticeId)]);return ok({removed:true,noticeId});}
 if(path==='/api/recruitment/notifications'){
  if(request.method==='GET'){const {limit,offset}=page(url,{defaultLimit:100}),rows=await all(db,'SELECT * FROM recruitment_notifications WHERE user_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?',userId,limit,offset);return ok({items:rows.map(row=>({id:row.id,noticeId:row.notice_id,kind:row.kind,title:row.title,body:row.body,officialUrl:row.official_url,sourceUrl:row.official_url,readAt:row.read_at,createdAt:row.created_at})),total:(await first(db,'SELECT COUNT(*) AS n FROM recruitment_notifications WHERE user_id=?',userId)).n,unread:(await first(db,'SELECT COUNT(*) AS n FROM recruitment_notifications WHERE user_id=? AND read_at IS NULL',userId)).n,limit,offset});}
  if(request.method==='PATCH'){const input=await bodyJson(request);if(input.read!==true)fail(400,'invalid_input','Only read acknowledgements are supported.');const notificationId=text(input.id,'Notification ID',{max:160}),changed=await run(db,'UPDATE recruitment_notifications SET read_at=? WHERE id=? AND user_id=?',utc(now),notificationId,userId);if(!changed.meta.changes)fail(404,'not_found','Notification not found.');return ok({id:notificationId,readAt:utc(now)});}
 }
 fail(404,'not_found','Recruitment API route not found.');
}

function reviewedStrings(value,label,{max=50,required=false}={}){if(value===undefined&&!required)return [];if(!Array.isArray(value)||value.length>max||required&&!value.length)fail(400,'invalid_input',label+' must be an explicit list.');return value.map(item=>text(item,label,{max:160}));}
function validatedReviewPosts(value,notice,evidenceUrls,attestation,reviewedAt){
 if(!Array.isArray(value)||!value.length||value.length>100)fail(400,'post_evidence_required','Review at least one exact technical post with its qualification rules.');
 const ids=new Set();return value.map(raw=>{
  const post=record(raw),postId=text(post.id,'Post ID',{max:160}),title=text(post.title,'Post title',{max:240});if(ids.has(postId))fail(400,'invalid_input','Post IDs must be unique within the notice.');ids.add(postId);
  if(post.technical!==true)fail(400,'technical_post_required','Only verified individual technical posts can be approved.');
  const rule=record(post.eligibility),sourceUrl=officialUrl(rule.sourceUrl);if(!evidenceUrls.includes(sourceUrl))fail(400,'post_evidence_required','Each post rule must cite an explicitly reviewed official document.');
  const sourceSection=text(rule.sourceSection,'Exact post source section',{min:3,max:500}),degrees=reviewedStrings(rule.acceptedDegrees,'Accepted degrees'),branches=reviewedStrings(rule.acceptedBranches,'Accepted branches'),alternatives=rule.qualificationAlternatives===undefined?[]:rule.qualificationAlternatives;
  if(!Array.isArray(alternatives)||alternatives.length>20)fail(400,'invalid_input','Qualification alternatives are invalid.');
  const normalizedAlternatives=alternatives.map(rawAlternative=>{const alternative=record(rawAlternative);return {...alternative,acceptedDegrees:reviewedStrings(alternative.acceptedDegrees,'Alternative degrees',{required:true}),...(alternative.acceptedBranches!==undefined?{acceptedBranches:reviewedStrings(alternative.acceptedBranches,'Alternative branches')}:{})};});
  if(!degrees.length&&!normalizedAlternatives.length)fail(400,'qualification_evidence_required','Each post needs explicit documented degree or alternative-qualification rules.');
  if(rule.complete===true&&attestation.completeCriteriaReviewed!==true)fail(400,'complete_review_required','Complete criteria require an explicit full-criteria review attestation.');
  for(const [field,max] of [['minimumPercentage',100],['minimumCgpa',100],['experienceMonths',1200]])if(rule[field]!==undefined&&rule[field]!==null)number(rule[field],field,{min:0,max});
  if(rule.age!==undefined){const age=record(rule.age);if(age.minimum!==undefined)number(age.minimum,'Minimum age',{min:0,max:120});if(age.maximum!==undefined)number(age.maximum,'Maximum age',{min:0,max:120});if((age.minimum!==undefined||age.maximum!==undefined)&&!/^\d{4}-\d{2}-\d{2}$/.test(age.asOfDate||''))fail(400,'age_evidence_required','Age rules need the official criteria date.');}
  const eligibility={...rule,acceptedDegrees:degrees,acceptedBranches:branches,qualificationAlternatives:normalizedAlternatives,sourceUrl,sourceSection,verified:true,verifiedAt:reviewedAt,complete:rule.complete===true,verificationMethod:'owner_human_official_document_review'};
  return {...post,id:postId,title,technical:true,noticeId:notice.id,sourceId:notice.sourceId,organizationId:post.organizationId||notice.organizationId,examinationId:post.examinationId||notice.examinationId,eligibility};
 });
}
