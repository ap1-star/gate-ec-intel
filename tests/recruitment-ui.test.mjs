import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRecruitmentFeature,recruitmentFallbackCatalog,isRecruitmentTechnical,filterRecruitmentDirectory,recruitmentNoticeStatus,recruitmentPreferencesInput,subscribeRecruitmentPush,decodeRecruitmentPushKey} from '../src/features/recruitment.mjs';
import {TECHNICAL_PATHWAYS,ORGANIZATIONS,EXAMINATIONS,RECRUITMENT_NOTICES} from '../src/domains/recruitment/index.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const channels=()=>({in_app:false,email:false,push:false,whatsapp:false,sms:false});
const defaultPrefs=()=>({organizationIds:[],examinationIds:[],states:[],routeTypes:[],channels:channels(),digest:'instant',reminderDays:[7,3,1,0],quietHours:null,language:'en'});
const capabilities=()=>Object.fromEntries(['in_app','email','push','whatsapp','sms'].map(channel=>[channel,{configured:channel==='in_app',recipientVerified:channel==='in_app',consented:channel==='in_app',reason:channel==='in_app'?null:'provider_not_configured'}]));
const catalog=()=>({organizations:clone(ORGANIZATIONS),examinations:clone(EXAMINATIONS),pathways:clone(TECHNICAL_PATHWAYS),notices:clone(RECRUITMENT_NOTICES),sourceHealth:[],capabilities:{channels:capabilities(),scheduler:{configured:false}}});
function fixture({authenticated=false,failPublic=false,failPrivate=false,customApi=null}={}){
 const context=vm.createContext({window:{UI_ICONS:{}}});vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
 let route='recruitment',params=new URLSearchParams(),renders=0,navigation=null,session=authenticated?{status:'authenticated',user:{id:'candidate-a'},capabilities:{platformAuth:true}}:{status:'anonymous',user:null,capabilities:{platformAuth:true}};
 const db={profile:{degree:'B.Tech.',branch:'Electronics and Communication Engineering'},preferences:defaultPrefs(),capabilities:capabilities(),saved:[],notifications:[]},requests=[];
 const api=async(path,options={})=>{
  requests.push({path,...options});if(customApi){const response=await customApi(path,options,db);if(response!==undefined)return response;}
  if(path==='/api/recruitment/catalog'){if(failPublic)throw Error('Public catalogue not connected.');return catalog();}
  if(!session.user)throw Error('Sign in required.');if(failPrivate)throw Error('Private database unavailable.');
  if(path==='/api/recruitment/preferences'){
   if(options.method==='PUT'){db.profile=clone(options.body.profile);db.preferences=clone(options.body.preferences);}
   if(options.method==='DELETE'){db.profile={};db.preferences=defaultPrefs();db.saved=[];}
   return {profile:clone(db.profile),preferences:clone(db.preferences),capabilities:clone(db.capabilities),updatedAt:'2026-11-16T00:00:00Z'};
  }
  if(path==='/api/recruitment/saved'){
   if(options.method==='POST'){const row=RECRUITMENT_NOTICES.find(notice=>notice.id===options.body.noticeId);db.saved=db.saved.filter(saved=>saved.noticeId!==row.id);db.saved.push({noticeId:row.id,reminderDays:options.body.reminderDays,savedAt:'2026-11-16T00:00:00Z',notice:clone(row)});return clone(db.saved.at(-1));}
   return {items:clone(db.saved),total:db.saved.length};
  }
  if(path.startsWith('/api/recruitment/saved/')&&options.method==='DELETE'){db.saved=db.saved.filter(row=>row.noticeId!==decodeURIComponent(path.split('/').at(-1)));return {removed:true};}
  if(path==='/api/recruitment/notifications'){
   if(options.method==='PATCH'){const row=db.notifications.find(item=>item.id===options.body.id);if(row)row.readAt='2026-11-16T00:00:00Z';return {id:options.body.id,readAt:'2026-11-16T00:00:00Z'};}
   return {items:clone(db.notifications),unread:db.notifications.filter(row=>!row.readAt).length,total:db.notifications.length};
  }
  if(path==='/api/recruitment/consent'){
   const {channel,enabled}=options.body;
   if(enabled&&(!db.capabilities[channel]?.configured||!db.capabilities[channel]?.recipientVerified))throw Error('Configure provider and verify recipient before subscribing.');
   db.preferences.channels[channel]=enabled;return {preferences:clone(db.preferences)};
  }
  if(path==='/api/account'&&options.method==='DELETE'){db.profile={};db.preferences=defaultPrefs();db.saved=[];db.notifications=[];return {deleted:true};}
  throw Error('Unexpected test API path: '+path);
 };
 const feature=createRecruitmentFeature({C:context.window.TerminalComponents,icon:()=>'',params:()=>params,currentRoute:()=>route,session:()=>session,api,render(){renders++;},navigate(id,values){navigation={id,values};route=id;params=new URLSearchParams(values);}});
 return {feature,db,requests,session:next=>{session=next;},route:(next,values={})=>{route=next;params=new URLSearchParams(values);},render(next='recruitment',values={}){route=next;params=new URLSearchParams(values);return feature.renderers[next]();},renders:()=>renders,navigation:()=>navigation};
}
test('an in-flight catalogue shows loading and keeps unreviewed source links separate from notices',async()=>{
 let resolve;const pending=new Promise(done=>{resolve=done;});
 const app=fixture({customApi:path=>path==='/api/recruitment/catalog'?pending:undefined});
 const initial=app.render();assert.match(initial,/Loading official notices/);assert(!initial.includes('live notices unavailable'));
 const loading=app.feature.load('recruitment');assert.match(app.render(),/Loading the official notice catalogue/);
 resolve({...catalog(),discovery:{pendingReviewCount:15}});await loading;
 const ready=app.render();assert.match(ready,/8 matching notices/);assert.match(ready,/15 source links await human review/);assert(!ready.includes('live notices unavailable'));
});
const click=(action,id,extras={})=>({target:{closest:()=>({dataset:{recruitmentAction:action,recruitmentId:id,...extras}})}});
const field=(filter,value)=>({target:{dataset:{recruitmentFilter:filter},value}});
function form(kind,rows){const target={dataset:{recruitmentForm:kind},rows};target.closest=()=>target;return {target,preventDefault(){}};}
async function withFormData(callback){const previous=globalThis.FormData;globalThis.FormData=class{constructor(form){this.rows=form.rows;}[Symbol.iterator](){return this.rows[Symbol.iterator]();}getAll(name){return this.rows.filter(([key])=>key===name).map(([,value])=>value);}};try{return await callback();}finally{globalThis.FormData=previous;}}

test('public fallback contains actual technical routes and historical seeds, excluding general graduate routes',()=>{
 const data=recruitmentFallbackCatalog();assert.equal(data.examinations.length,TECHNICAL_PATHWAYS.length);assert.equal(data.organizations.length,ORGANIZATIONS.length);assert.equal(data.notices.length,RECRUITMENT_NOTICES.length);
 assert(data.examinations.every(isRecruitmentTechnical));
 for(const name of ['SSC CHSL','SSC CGL','RRB NTPC Graduate','Banking PO'])assert.equal(isRecruitmentTechnical({technical:true,name}),false);
 assert(isRecruitmentTechnical(TECHNICAL_PATHWAYS.find(row=>row.id==='ntpc_technical')));
 assert(isRecruitmentTechnical(TECHNICAL_PATHWAYS.find(row=>row.id==='ssc_je')));
});

test('public browsing survives an unavailable API without fabricating live vacancies or blanket ECE eligibility',async()=>{
 const app=fixture({failPublic:true});app.render();await app.feature.load('recruitment');const html=app.render();
 assert.match(html,/live notices unavailable/);assert.match(html,/live notice monitoring is not implied/);assert.match(html,/The notice feed is not confirmed/);assert(!html.includes('data-recruitment-action="save-notice"'));
 const directory=app.render('technical-exams');assert.match(directory,/post evidence/);assert.match(directory,/Historical route/);assert(!directory.includes('Eligible for all ECE candidates'));
 for(const route of ['recruitment','technical-exams','recruiters','recruitment-detail']){const page=app.render(route);assert(!page.includes('undefined'));assert(!page.includes('NaN'));}
 assert(app.requests.every(request=>request.path==='/api/recruitment/catalog'));
});

test('catalogue loading preserves full pathway metadata beside compact examination DTOs',async()=>{
 const app=fixture();await app.feature.load('recruitment');app.render('technical-exams');app.feature.handleChange(field('sector','space'));
 const html=app.feature.renderers['technical-exams']();assert.match(html,/ICRB Scientist/);assert(!html.includes('OCES/DGFS'));
 const rows=filterRecruitmentDirectory(TECHNICAL_PATHWAYS,{sector:'space',routeType:'all'});assert(rows.length>0);assert(rows.every(row=>row.sector==='space'));
 const ssc=filterRecruitmentDirectory(TECHNICAL_PATHWAYS,{query:'SSC'});assert(ssc.some(row=>row.id==='ssc_je'));assert(ssc.some(row=>row.id==='ssc_selection_technical'));
 const friendly=app.render('technical-exams');assert.match(friendly,/value="psu"[^>]*>PSU/);assert.match(friendly,/Post-specific branch review/);
});

test('eligibility discovery matches individual post evidence without treating SSC JE or CEPTAM as blanket graduate eligibility',()=>{
 const profile={degree:'B.Tech.',branch:'Electronics and Communication Engineering'};
 const mismatch=filterRecruitmentDirectory(TECHNICAL_PATHWAYS,{eligibility:'ineligible'},profile);
 assert(mismatch.some(row=>row.id==='drdo_ceptam'));assert(!mismatch.some(row=>row.id==='drdo_rac'));
 const noProfile=filterRecruitmentDirectory(TECHNICAL_PATHWAYS,{eligibility:'insufficient'},{});assert(noProfile.some(row=>row.id==='ssc_je'));
 const app=fixture();const detail=app.render('technical-exams',{examId:'ssc_je'});assert.match(detail,/DoT Junior Engineer/);assert.match(detail,/BRO Junior Engineer/);assert.match(detail,/Partial rule mapping/);assert.match(detail,/Insufficient information/);
});

test('historical notices close deterministically and date-only sources never acquire invented times or reminders',async()=>{
 assert.equal(recruitmentNoticeStatus({status:'open',deadlineAt:'2025-06-16T12:00:00Z'},{now:'2026-11-16T00:00:00Z'}),'closed');
 assert.equal(recruitmentNoticeStatus({status:'cancelled',deadlineAt:'2027-01-01T00:00:00Z'},{now:'2026-11-16T00:00:00Z'}),'cancelled');
 const app=fixture();await app.feature.load('recruitment');const html=app.render('recruitment-detail',{noticeId:'isro_icrb_emc_2025'});
 assert.match(html,/application cycle closed/);assert.match(html,/2025-06-16 · date only \/ not scheduled/);assert(!html.includes('Official application link'));assert(!html.includes('class="recruitment-hero"'));assert(!html.includes('class="recruitment-filter-rail"'));assert(!/<span>Published<\/span><strong>[^<]*\b(?:am|pm)\b/i.test(html));
 const upsc=app.render('recruitment-detail',{notice:'upsc_ese_2027'});assert.match(upsc,/2027-01-31 · date only/);assert.match(upsc,/No guessed reminders|no guessed reminders/);
});

test('three-way examination comparison keeps real IDs and remains capped during filtering',()=>{
 const app=fixture();app.render('technical-exams');const ids=TECHNICAL_PATHWAYS.slice(0,4).map(row=>row.id);
 for(const id of ids)app.feature.handleClick(click('compare-exam',id));assert.deepEqual(app.feature.getSnapshot().selected,ids.slice(0,3));assert.match(app.feature.getSnapshot().error,/up to three/);
 app.feature.handleChange(field('sector','space'));assert.deepEqual(app.feature.getSnapshot().selected,ids.slice(0,3));
 app.feature.handleClick(click('compare-exam',ids[0]));assert.equal(app.feature.getSnapshot().selected.length,2);assert.equal(app.feature.getSnapshot().error,'');
});

test('private workspaces use real sign-in and fail honestly when private storage is unavailable',async()=>{
 const anonymous=fixture(),html=anonymous.render('recruitment-preferences');assert.match(html,/signin-with-chatgpt/);assert.match(html,/target="_top"/);assert(!html.includes('/api/dev/login'));assert(!html.includes('data-recruitment-pref="profile.degree"'));
 const app=fixture({authenticated:true,failPrivate:true});app.render('recruitment-preferences');await app.feature.load('recruitment-preferences');const failed=app.feature.renderers['recruitment-preferences']();assert.match(failed,/Private database unavailable/);assert(!failed.includes('preferences saved'));
});

test('preferences keep all channels off until an explicit action, preserve dirty profile edits, and isolate server-owned identity',async()=>{
 const app=fixture({authenticated:true});app.render('recruitment-preferences');await app.feature.load('recruitment-preferences');
 assert.deepEqual(app.feature.getSnapshot().preferences.channels,channels());const html=app.feature.renderers['recruitment-preferences']();assert.match(html,/Every channel starts off/);assert.match(html,/The delivery provider is not connected/);
 app.feature.handleInput({target:{dataset:{recruitmentPref:'profile.branch'},value:'Unsaved Electronics branch'}});
 await app.feature.handleClick(click('channel',null,{recruitmentChannel:'in_app',recruitmentEnabled:'true'}));
 assert.equal(app.feature.getSnapshot().preferences.channels.in_app,true);assert.equal(app.feature.getSnapshot().draft.profile.branch,'Unsaved Electronics branch');assert.equal(app.db.profile.branch,'Electronics and Communication Engineering');
 await app.feature.handleClick(click('channel',null,{recruitmentChannel:'email',recruitmentEnabled:'true'}));
 assert.equal(app.feature.getSnapshot().preferences.channels.email,false);assert.match(app.feature.getSnapshot().error,/verify recipient/);
 app.session({status:'authenticated',user:{id:'candidate-b'}});app.feature.resetUser();const gated=app.render('recruitment-preferences');assert(!gated.includes('Unsaved Electronics branch'));assert.equal(app.feature.getSnapshot().profile.branch,null);
});

test('explicit follow and saved opportunity actions persist without turning notification channels on',async()=>{
 const app=fixture({authenticated:true});app.render('technical-exams');await app.feature.load('technical-exams');
 const exam=TECHNICAL_PATHWAYS[0];await app.feature.handleClick(click('follow-exam',exam.id));assert(app.db.preferences.examinationIds.includes(exam.id));assert.deepEqual(app.db.preferences.channels,channels());
 const row=RECRUITMENT_NOTICES.find(notice=>notice.id==='isro_icrb_emc_2025');await app.feature.handleClick(click('save-notice',row.id));assert.equal(app.db.saved.length,1);assert.deepEqual(app.db.saved[0].reminderDays,[]);assert.deepEqual(app.db.preferences.channels,channels());
 const request=app.requests.find(request=>request.path==='/api/recruitment/saved'&&request.method==='POST');assert.deepEqual(request.body,{noticeId:row.id,reminderDays:[]});
 assert(app.requests.filter(request=>request.method).every(request=>!Object.hasOwn(request.body||{},'userId')));
});

test('notification centre renders actual source links and acknowledges read status through the authenticated API',async()=>{
 const app=fixture({authenticated:true}),notice=RECRUITMENT_NOTICES[0];app.db.notifications=[{id:'fixture-notification',noticeId:notice.id,kind:'notice_updated',title:'Test event record',body:'Test-only server notification fixture.',officialUrl:notice.sourceUrl,createdAt:'2026-11-16T00:00:00Z',readAt:null}];
 app.render('recruitment-notifications');await app.feature.load('recruitment-notifications');const before=app.feature.renderers['recruitment-notifications']();assert(before.includes(notice.sourceUrl.replaceAll('&','&amp;')));assert.match(before,/unread/);
 await app.feature.handleClick(click('read-notification','fixture-notification'));assert.equal(app.feature.getSnapshot().notifications.unread,0);assert(app.db.notifications[0].readAt);
 const patch=app.requests.find(request=>request.path==='/api/recruitment/notifications'&&request.method==='PATCH');assert.deepEqual(patch.body,{id:'fixture-notification',read:true});
});

test('late private responses cannot restore a previous account profile after identity changes',async()=>{
 let resolve;const pending=new Promise(r=>{resolve=r;});const app=fixture({authenticated:true,customApi:(path,options)=>path==='/api/recruitment/preferences'&&!options.method?pending:undefined});
 app.render('recruitment-preferences');const loading=app.feature.load('recruitment-preferences');await new Promise(r=>setImmediate(r));app.session({status:'authenticated',user:{id:'candidate-b'}});app.feature.resetUser();resolve({profile:{branch:'Private old branch'},preferences:defaultPrefs(),capabilities:capabilities()});await loading;
 assert.equal(app.feature.getSnapshot().profile.branch,null);assert(!app.render('recruitment-preferences').includes('Private old branch'));
});

test('profile serialization validates numbers and quiet hours without silently enabling channels',()=>{
 const result=recruitmentPreferencesInput({'profile.degree':'B.Tech.','profile.gateScore':'0','profile.graduationYear':'2026',quietEnabled:'on',quietStart:'22:00',quietEnd:'07:00',timezone:'Asia/Kolkata',digest:'daily'},{examinationIds:['gate_technical'],reminderDays:['7','3','0']});
 assert.equal(result.profile.gateScore,0);assert.deepEqual(result.preferences.reminderDays,[7,3,0]);assert(!Object.hasOwn(result.preferences,'channels'));assert.equal(result.preferences.quietHours.timezone,'Asia/Kolkata');
 assert.equal(recruitmentPreferencesInput({}).preferences.quietHours,null);
 assert.throws(()=>recruitmentPreferencesInput({'profile.gateScore':'1001'}),/gate score/);
 assert.throws(()=>recruitmentPreferencesInput({quietEnabled:'on',quietStart:'22:00',quietEnd:'22:00'}),/must differ/);
});

test('web push requests permission only on the explicit subscribe helper and records consent after a real subscription',async()=>{
 let permissions=0,registered=null,subscribed=null;const calls=[],identity={status:'authenticated',user:{id:'push-user'}},subscription={toJSON:()=>({endpoint:'https://push.example.test/token',keys:{p256dh:'fixture',auth:'fixture'}}),unsubscribe:async()=>true};
 const bridge={session:()=>identity,api:async(path,options)=>{calls.push({path,...options});return path.endsWith('/config')?{configured:true,publicKey:'AQID'}:{saved:true};}};
 const environment={Notification:{requestPermission:async()=>{permissions++;return 'granted';}},navigator:{serviceWorker:{register:async(path,options)=>{registered={path,options};return {pushManager:{getSubscription:async()=>null,subscribe:async options=>{subscribed=options;return subscription;}}};}}}};
 assert.equal(permissions,0);await subscribeRecruitmentPush(bridge,environment);assert.equal(permissions,1);assert.deepEqual(registered,{path:'/recruitment-sw.js',options:{scope:'/'}});assert.equal(subscribed.userVisibleOnly,true);assert.deepEqual([...subscribed.applicationServerKey],[1,2,3]);
 assert.deepEqual(calls.at(-1),{path:'/api/recruitment/consent',method:'PUT',body:{channel:'push',enabled:true}});assert.equal(calls.at(-2).path,'/api/recruitment/push/subscription');assert.deepEqual([...decodeRecruitmentPushKey('AQID')],[1,2,3]);
});

test('web push denial, missing provider and identity changes do not save a subscription or consent',async()=>{
 for(const mode of ['denied','unconfigured','identity']){
  const calls=[];let permissionCalls=0,identity={status:'authenticated',user:{id:'a'}};
  const bridge={session:()=>identity,api:async(path)=>{calls.push(path);if(mode==='identity')identity={status:'authenticated',user:{id:'b'}};return {configured:mode!=='unconfigured',publicKey:'AQID'};}};
  const env={Notification:{requestPermission:async()=>{permissionCalls++;return 'denied';}},navigator:{serviceWorker:{register:async()=>{throw Error('Must not register');}}}};
  await assert.rejects(subscribeRecruitmentPush(bridge,env));assert.deepEqual(calls,['/api/recruitment/push/config']);assert.equal(permissionCalls,mode==='denied'?1:0);
 }
});

test('typed account deletion requires DELETE, clears website state and does not reload private records after success',async()=>withFormData(async()=>{
 const app=fixture({authenticated:true});app.render('recruitment-preferences');await app.feature.load('recruitment-preferences');
 assert.match(app.feature.renderers['recruitment-preferences'](),/Type DELETE to confirm/);
 assert.equal(app.feature.handleSubmit(form('delete-account',[['confirmation','delete']])),true);assert(!app.requests.some(request=>request.path==='/api/account'));
 await app.feature.handleSubmit(form('delete-account',[['confirmation','DELETE']]));const after=app.feature.renderers['recruitment-preferences']();assert.match(after,/Your website records were removed/);assert.match(after,/Your ChatGPT account was not deleted/);assert.match(after,/href="\/signout-with-chatgpt" target="_top"/);
 const requestCount=app.requests.length;await app.feature.load('recruitment-preferences');assert.equal(app.requests.length,requestCount);assert.equal(app.feature.getSnapshot().profile.branch,null);assert.deepEqual(app.feature.getSnapshot().saved,[]);
}));

test('search debouncing does not rerender unrelated modules after navigation',async()=>{
 const app=fixture();app.render('technical-exams');const before=app.renders();assert.equal(app.feature.handleInput(field('query','Electronics')),true);app.route('rank');await new Promise(r=>setTimeout(r,155));assert.equal(app.renders(),before);
});
