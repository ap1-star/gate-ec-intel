import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createPersonalFeature,validCalendarDate,localDateValue,buildStudyTasks,summarizeMockAttempts,parseTopicNotes,zonedDateTimeToISO} from '../src/features/personal.mjs';
const ctx=vm.createContext({window:{UI_ICONS:{}}});
vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),ctx);
const C=ctx.window.TerminalComponents;
const auth=id=>({status:'authenticated',user:{id,displayName:'Candidate '+id,isOwner:false},capabilities:{database:true,devAuth:true}});
function fixture(api,initial=auth('a')){let s=initial,renders=0;const ui=createPersonalFeature({C,session:()=>s,api,render:()=>renders++,navigate(){},params:()=>new URLSearchParams(),refreshSession:async()=>s});return {ui,setSession:value=>s=value,renders:()=>renders};}
const click=(action,id='1')=>{const target={dataset:{personalAction:action,personalId:id},closest:selector=>selector==='[data-personal-action]'?target:null};return {target,preventDefault(){}};};

test('calendar dates remain exact through leap years and year boundaries',()=>{
 assert.equal(validCalendarDate('2024-02-29'),true);assert.equal(validCalendarDate('2025-02-29'),false);assert.equal(validCalendarDate('2026-13-01'),false);assert.equal(validCalendarDate('2026-04-31'),false);
 assert.equal(localDateValue(new Date(2026,11,31,23,59)),'2026-12-31');
 const tasks=buildStudyTasks({mode:'daily',startDate:'2026-12-31',endDate:'2027-01-02',dailyMinutes:60,subject:'Networks',topic:'Two-port networks'});
 assert.deepEqual(tasks.map(x=>x.date),['2026-12-31','2027-01-01','2027-01-02']);assert(tasks.every(t=>t.minutes===60));
});
test('weekly planning uses the explicit weekday and rejects invalid ranges and durations',()=>{
 const base={mode:'weekly',startDate:'2026-11-01',endDate:'2026-11-15',dailyMinutes:45,subject:'Networks',topic:'Circuits',weekday:1};
 assert.deepEqual(buildStudyTasks(base).map(t=>t.date),['2026-11-02','2026-11-09']);
 for(const overrides of [{endDate:'2026-10-01'},{dailyMinutes:0},{dailyMinutes:720.5},{weekday:9},{topic:''}])assert.throws(()=>buildStudyTasks({...base,...overrides}));
});
test('reminder clock times respect the selected zone and reject DST gaps or ambiguity',()=>{
 assert.equal(zonedDateTimeToISO('2026-11-15T09:00','Asia/Calcutta'),'2026-11-15T03:30:00.000Z');
 assert.equal(zonedDateTimeToISO('2026-07-01T09:00','America/New_York'),'2026-07-01T13:00:00.000Z');
 assert.throws(()=>zonedDateTimeToISO('2026-03-08T02:30','America/New_York'),/does not exist/);
 assert.throws(()=>zonedDateTimeToISO('2026-11-01T01:30','America/New_York'),/ambiguous/);
 assert.throws(()=>zonedDateTimeToISO('2026-11-15T09:00','Invalid/Zone'),/valid IANA/);
});
test('mock summaries use entered denominators, real dates and explicit error notes',()=>{
 assert.deepEqual(summarizeMockAttempts([]),{attempts:[],n:0,latest:null,mean:null,change:null,accuracy:[],recordedErrors:[]});
 const rows=[{id:'2',takenAt:'2026-11-03T00:00:00Z',score:60,total:100,correct:20,incorrect:5,topicNotes:[{subject:'Networks',topic:'Resonance',errors:2}]},{id:'1',takenAt:'2026-11-01T00:00:00Z',score:30,total:50,topicNotes:[{subject:'Networks',topic:'Resonance',errors:1}]}];
 const result=summarizeMockAttempts(rows);assert.equal(result.latest.id,'2');assert.equal(result.mean,60);assert.equal(result.change,0);assert.equal(result.accuracy[0].value,80);assert.equal(result.recordedErrors[0].errors,3);assert.equal(rows[0].percentage,undefined);
 assert.deepEqual(parseTopicNotes('Networks | Resonance | 2'),[{subject:'Networks',topic:'Resonance',errors:2}]);assert.throws(()=>parseTopicNotes('Networks|Resonance|not-a-number'));
});
test('unavailable and anonymous private workspaces never display fabricated account data',()=>{
 const missing=fixture(async()=>{throw Error('Unexpected API call');},{status:'unavailable'});const html=missing.ui.renderers.dashboard();assert(html.includes('not connected'));assert(!html.includes('Planned tasks'));
 const guest=fixture(async()=>{throw Error('Unexpected API call');},{status:'anonymous',capabilities:{devAuth:true}});const login=guest.ui.renderers.dashboard();assert(login.includes('Local development'));assert(login.includes('minlength="12"'));assert(login.includes('maxlength="64"'));assert(!login.includes('AIR 1,3'));
});
test('API failure remains an error rather than an empty discussion',async()=>{
 const f=fixture(async()=>{throw Error('Database unavailable');},{status:'anonymous',capabilities:{}});await f.ui.load('forum');const html=f.ui.renderers.forum();assert(html.includes('Database unavailable'));assert(!html.includes('No matching discussions'));
});
test('public forum text is escaped and owner data is not requested for a member',async()=>{
 let adminCalls=0;const f=fixture(async path=>{if(path.startsWith('/api/admin'))adminCalls++;return {items:[{id:'t',title:'<img src=x onerror=1>',body:'<script>alert(1)</script>',subject:'Networks',tags:['<tag>'],votes:0,replyCount:0,createdAt:'2026-11-01T00:00:00Z',authorDisplayName:'<author>'}],total:1};});
 await f.ui.load('forum');const html=f.ui.renderers.forum();assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('&lt;author&gt;'));await f.ui.load('admin');assert.equal(adminCalls,0);assert(f.ui.renderers.admin().includes('Owner access required'));
});
test('owner delivery rates convert API fractions into percentages and preserve missing values',async()=>{
 for(const [rate,expected] of [[.5,'50<span>%</span>'],[1,'100<span>%</span>'],[0,'0<span>%</span>'],[null,'—']]){
  const user=auth('owner');user.user.isOwner=true;
  const f=fixture(async()=>({registeredUsers:null,activeUsers:null,featureAdoption:[],usage:[],reminderHealth:{deliveryRate:rate,measurement:'observed_delivery_log'}}),user);
  await f.ui.load('admin');const html=f.ui.renderers.admin();
  const card=html.match(/<span class="metric-label">Occurrence delivery rate<\/span><strong class="metric-number">([\s\S]*?)<\/strong>/);
  assert.equal(card?.[1],expected);assert(html.includes('Tracked delivery occurrences'));assert(html.includes('Retries do not enlarge the denominator'));
 }
});
test('a reset invalidates an earlier account dashboard response',async()=>{
 let resolve;const delayed=new Promise(r=>resolve=r);let first=true;const f=fixture(async()=>{if(first){first=false;return delayed;}return {counts:{tasks:0,mocks:0,estimates:0},tasks:[],mocks:[],estimates:[],notifications:[]};});
 const pending=f.ui.load('dashboard');f.setSession(auth('b'));f.ui.resetUser();await f.ui.load('dashboard');resolve({counts:{tasks:1},tasks:[{subject:'PRIVATE_A_RECORD',topic:'Private',date:'2026-11-01',minutes:30}],mocks:[],estimates:[],notifications:[]});await pending;assert(!f.ui.renderers.dashboard().includes('PRIVATE_A_RECORD'));
});
test('reply responses and mutation errors cannot repopulate the next account',async()=>{
 let resolveReply,rejectMutation;const reply=new Promise(r=>resolveReply=r),mutation=new Promise((_,r)=>rejectMutation=r);let mutated=false;
 const f=fixture(async(path,options)=>{if(path.split('?')[0].endsWith('/replies'))return reply;if(options?.method==='PATCH'){mutated=true;return mutation;}if(path.startsWith('/api/planner'))return {tasks:[],plans:[]};return {items:[{id:'t',title:'Discussion',body:'Body',subject:'Networks',createdAt:'2026-11-01',votes:0,replyCount:0}],total:1};});
 await f.ui.load('forum');const pendingReply=f.ui.handleClick(click('toggle-replies','t'));f.setSession(auth('b'));f.ui.resetUser();await f.ui.load('forum');resolveReply({items:[{id:'r',body:'PRIVATE_OLD_REPLY',authorDisplayName:'A'}]});await pendingReply;assert(!f.ui.renderers.forum().includes('PRIVATE_OLD_REPLY'));
 await f.ui.load('planner');const pendingMutation=f.ui.handleClick(click('toggle-task','x'));assert.equal(mutated,true);f.setSession(auth('c'));f.ui.resetUser();await f.ui.load('planner');rejectMutation(Error('OLD_ACCOUNT_ERROR'));await pendingMutation;assert(!f.ui.renderers.planner().includes('OLD_ACCOUNT_ERROR'));
});
test('private histories collect every page before calculating 101-attempt and 366-task summaries',async()=>{
 const tasks=buildStudyTasks({mode:'daily',startDate:'2026-12-31',endDate:'2027-12-31',dailyMinutes:60,subject:'Networks',topic:'Circuits'}).map((t,i)=>({...t,id:'task-'+i,completed:i<101}));
 const mocks=Array.from({length:101},(_,i)=>({id:'mock-'+i,title:'Recorded mock '+i,takenAt:new Date(Date.UTC(2026,0,1+i)).toISOString(),score:i===100?100:50,total:100,durationMinutes:180,subjectScores:{}}));
 const calls=[];
 const f=fixture(async path=>{
  const url=new URL(path,'http://local'),offset=Number(url.searchParams.get('offset')),requested=Number(url.searchParams.get('limit')),limit=Math.min(requested||100,100);calls.push(url);
  if(url.pathname==='/api/planner')return {plans:offset?[{id:'later-plan'}]:[{id:'first-plan'}],tasks:tasks.slice(offset,offset+limit),limit,offset};
  if(url.pathname==='/api/mocks')return {items:mocks.slice(offset,offset+limit),limit,offset};
  if(url.pathname==='/api/mock-deadlines')return {items:[],limit,offset};
  throw Error('Unexpected path');
 });
 await f.ui.load('mocks');const mockHtml=f.ui.renderers.mocks();assert(mockHtml.includes('Recorded mock 100'));assert.match(mockHtml,/<span class="metric-label">Recorded attempts<\/span><strong class="metric-number">101<\/strong>/);assert.match(mockHtml,/<span class="metric-label">Mean normalized marks<\/span><strong class="metric-number">50.5<\/strong>/);
 assert.deepEqual(calls.filter(x=>x.pathname==='/api/mocks').map(x=>Number(x.searchParams.get('offset'))),[0,100]);
 await f.ui.load('planner');const plannerHtml=f.ui.renderers.planner();assert(plannerHtml.includes('2027-12-31'));assert.match(plannerHtml,/<span class="metric-label">Scheduled tasks<\/span><strong class="metric-number">366<\/strong>/);assert.match(plannerHtml,/<span class="metric-label">Planned duration<\/span><strong class="metric-number">21,960<span> min<\/span>/);
 const pages=calls.filter(x=>x.pathname==='/api/planner');assert.equal(pages[0].searchParams.get('limit'),'520');assert.deepEqual(pages.map(x=>Number(x.searchParams.get('offset'))),[0,100,200,300]);
});
test('reminder, notification and mock-deadline ledgers also collect later pages',async()=>{
 const f=fixture(async path=>{
  const url=new URL(path,'http://local');if(url.pathname==='/api/profile')return {reminderPreference:'in_app'};
  const limit=Number(url.searchParams.get('limit')),offset=Number(url.searchParams.get('offset'));
  if(url.pathname==='/api/mocks')return {items:[],limit,offset};
  const rows=Array.from({length:101},(_,i)=>({id:url.pathname+'-'+i,title:url.pathname+' record '+i,body:'Stored message',createdAt:'2026-11-01',dueAt:'2026-12-01T09:00:00Z',cadence:'once',enabled:true,timezone:'Asia/Calcutta'}));
  return {items:rows.slice(offset,offset+limit),scheduler:{active:false},limit,offset};
 });
 await f.ui.load('reminders');const html=f.ui.renderers.reminders();assert(html.includes('/api/reminders record 100'));assert(html.includes('/api/notifications record 100'));
 await f.ui.load('mocks');assert(f.ui.renderers.mocks().includes('/api/mock-deadlines record 100'));
});
test('ledgers over the explicit 10000-record bound show an error instead of partial statistics',async()=>{
 let requests=0;
 const f=fixture(async path=>{const url=new URL(path,'http://local'),limit=Number(url.searchParams.get('limit')),offset=Number(url.searchParams.get('offset'));if(url.pathname==='/api/mock-deadlines')return {items:[],limit,offset};requests++;return {items:Array.from({length:limit},(_,i)=>({id:'mock-'+(offset+i),title:'Should not appear as partial history',takenAt:'2026-11-01',score:50,total:100})),limit,offset};});
 await f.ui.load('mocks');const html=f.ui.renderers.mocks();assert(html.includes('10,000-record'));assert(html.includes('No partial statistics'));assert(!html.includes('Mean normalized marks'));assert.equal(requests,101);
});
test('a reset discards an earlier account while its second ledger page is pending',async()=>{
 let notifySecond,resolveOld,phase='old';const secondRequested=new Promise(r=>notifySecond=r),oldPage=new Promise(r=>resolveOld=r);
 const f=fixture(async path=>{const url=new URL(path,'http://local'),limit=Number(url.searchParams.get('limit')),offset=Number(url.searchParams.get('offset'));if(url.pathname==='/api/mock-deadlines')return {items:[],limit,offset};if(phase==='new')return {items:[{id:'new',title:'NEW_ACCOUNT_HISTORY',takenAt:'2026-11-01',score:20,total:100}],limit,offset};if(offset===0)return {items:Array.from({length:100},(_,i)=>({id:'old-'+i,title:'Old history',takenAt:'2026-11-01',score:50,total:100})),limit,offset};notifySecond();return oldPage;});
 const pending=f.ui.load('mocks');await secondRequested;phase='new';f.setSession(auth('new'));f.ui.resetUser();await f.ui.load('mocks');resolveOld({items:[{id:'old-late',title:'PRIVATE_OLD_PAGE',takenAt:'2026-11-01',score:100,total:100}],limit:100,offset:100});await pending;const html=f.ui.renderers.mocks();assert(html.includes('NEW_ACCOUNT_HISTORY'));assert(!html.includes('PRIVATE_OLD_PAGE'));
});
test('expanded discussions collect later reply pages rather than silently omitting posts',async()=>{
 const calls=[],replies=Array.from({length:101},(_,i)=>({id:'reply-'+i,body:'Stored reply '+i,authorDisplayName:'Candidate',createdAt:'2026-11-01T00:00:00Z',votes:0}));
 const f=fixture(async path=>{const url=new URL(path,'http://local');if(url.pathname.endsWith('/replies')){const limit=Number(url.searchParams.get('limit')),offset=Number(url.searchParams.get('offset'));calls.push(offset);return {items:replies.slice(offset,offset+limit),limit,offset};}return {items:[{id:'thread',title:'Discussion',body:'Real discussion body',subject:'Networks',createdAt:'2026-11-01',votes:0,replyCount:101}],total:1};});
 await f.ui.load('forum');await f.ui.handleClick(click('toggle-replies','thread'));const html=f.ui.renderers.forum();assert(html.includes('Stored reply 100'));assert.deepEqual(calls,[0,100]);assert.equal((html.match(/class="personal-reply"/g)||[]).length,101);
});
