import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {setImmediate as nextTick} from 'node:timers/promises';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {createLocalAuth} from '../server/local-auth.mjs';
import {createApi} from '../server/api.mjs';
import {createPersonalFeature} from '../src/features/personal.mjs';
import {createPyqFeature} from '../src/features/pyq.mjs';
import {predictRank,CAREER_DATA_VERSION} from '../src/domains/career/index.mjs';

// These tests simulate form/event boundaries in Node. All feature records come
// from the real API and a migrated disposable SQLite file, not a mocked service.
// They do not exercise layout, native constraint validation or browser behavior.
const context=vm.createContext({window:{UI_ICONS:{}}});
vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
const C=context.window.TerminalComponents;
vm.runInContext(readFileSync(new URL('../dist/research-data.js',import.meta.url),'utf8'),context);
vm.runInContext(readFileSync(new URL('../dist/difficulty-data.js',import.meta.url),'utf8'),context);
const corpus=context.window.RESEARCH.questions;
const toughnessById=new Map(context.window.TOUGHNESS.rows.map(row=>[row.id,row]));
for(const row of corpus)row.toughness=toughnessById.get(row.id);
const subjects=[...new Set(corpus.map(q=>q.subject))];
const topicsBySubject=Object.fromEntries(subjects.map(subject=>[subject,[...new Set(corpus.filter(q=>q.subject===subject).map(q=>q.topic_family))]]));
const question=corpus.find(q=>q.subject==='Networks')||corpus[0];
const password='Temporary-test-password-2026';

class FormDataSimulation{
 constructor(form){if(!form?.testValues)throw Error('A simulated test form is required.');this.values=Object.entries(form.testValues).map(([key,value])=>[key,String(value)]);}
 entries(){return this.values[Symbol.iterator]();}
 [Symbol.iterator](){return this.entries();}
 get(name){return this.values.find(([key])=>key===name)?.[1]??null;}
}
function formEvent(kind,values,domain='personal'){
 const form={dataset:{[domain+'Form']:kind},testValues:values};
 return {target:{closest:selector=>selector.includes('data-'+domain+'-form')?form:null},preventDefault(){}};
}
function clickEvent(selector,dataset){const element={dataset};return {target:{closest:value=>value===selector?element:null},preventDefault(){},stopPropagation(){}};}
async function settled(predicate){for(let tries=0;tries<100;tries++){if(predicate())return;await nextTick();}throw Error('The simulated asynchronous workflow did not settle.');}

test('actual SQLite API records drive personal and PYQ feature forms, views and identity changes',{timeout:20000},async t=>{
 const directory=await mkdtemp(join(tmpdir(),'gate-feature-service-flow-'));
 let db;
 const previous=new Map(['FormData','location','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(async()=>{
  for(const [key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  db?.close();await rm(directory,{recursive:true,force:true});
 });
 Object.defineProperty(globalThis,'FormData',{value:FormDataSimulation,writable:true,configurable:true});
 Object.defineProperty(globalThis,'location',{value:{hash:'#profile'},writable:true,configurable:true});
 Object.defineProperty(globalThis,'document',{value:{querySelectorAll:()=>[],getElementById:()=>null},writable:true,configurable:true});
 db=await openSqliteDatabase(join(directory,'candidate-test.sqlite'));
 const localAuth=createLocalAuth({db,secret:'fixture-only-secret-'.repeat(4)});
 const api=createApi({db,localAuth,authMode:'development',questionIds:corpus.map(q=>q.id),paperIds:[...new Set(corpus.map(q=>'GATE-EC-'+q.year))],subjects,topicsBySubject,predictRank,careerDataVersion:CAREER_DATA_VERSION,now:()=>Date.parse('2026-11-15T12:00:00Z')});
 let cookie='',session={status:'anonymous'},pyq,personal,page=0,query='',scope=corpus,renderCount=0,holdBookmark=false,releaseBookmark;
 const calls=[];
 async function client(path,options={}){
  const method=options.method||'GET',headers={accept:'application/json',origin:'http://localhost'};
  if(cookie)headers.cookie=cookie;
  if(session.csrfToken)headers['x-csrf-token']=session.csrfToken;
  if(options.body!==undefined)headers['content-type']='application/json';
  const response=await api(new Request('http://localhost'+path,{method,headers,...(options.body===undefined?{}:{body:JSON.stringify(options.body)})}));
  const nextCookie=response.headers.get('set-cookie');if(nextCookie)cookie=nextCookie.split(';')[0];
  const result=await response.json();calls.push({path,method,body:options.body,status:response.status});
  if(!response.ok||result.status!=='ok')throw Object.assign(Error(result.message||'API failure'),{status:response.status,code:result.code});
  if(holdBookmark&&path.startsWith('/api/bookmarks?')){holdBookmark=false;return new Promise(resolve=>{releaseBookmark=()=>resolve(result.data);});}
  return result.data;
 }
 async function refreshSession(){const previous=session.user?.id;session=await client('/api/session');if(previous!==session.user?.id)pyq?.resetUser();return session;}
 const bridge={C,icon:()=>'',api:client,session:()=>session,refreshSession,render(){renderCount++;},toast(){},
  params:()=>new URLSearchParams(location.hash.split('?')[1]||''),navigate(id,params={}){location.hash='#'+id+(Object.keys(params).length?'?'+new URLSearchParams(params):'');},
  subjects:()=>subjects,questions:()=>corpus,scopeRows:()=>scope,rows:()=>pyq.filterRows(scope),query:()=>query,page:()=>page,setPage:value=>{page=value;},band:score=>score<40?'Easy':score<70?'Moderate':'Tough',
  applyQuestionParams(params){scope=params.has('subject')?corpus.filter(q=>q.subject===params.get('subject')):corpus;query='';page=0;}};
 personal=createPersonalFeature(bridge);pyq=createPyqFeature(bridge);
 await refreshSession();assert.equal(session.status,'anonymous');assert.match(personal.renderers.profile(),/Local development sign-in/);
 let firstUser,firstTask,firstCollection;

 await t.test('register, logout and login handlers use real session cookies and reload a stored profile',async()=>{
  await personal.handleSubmit(formEvent('register',{username:'feature-first',password,displayName:'First <candidate>'}));
  assert.equal(session.status,'authenticated');firstUser=session.user.id;assert(firstUser);
  let html=personal.renderers.profile();assert.match(html,/First &lt;candidate&gt;/);assert(!html.includes('First <candidate>'));
  await personal.handleClick(clickEvent('[data-personal-action]',{personalAction:'logout'}));assert.equal(session.status,'anonymous');
  await personal.handleSubmit(formEvent('login',{username:'feature-first',password}));assert.equal(session.user.id,firstUser);
  await personal.handleSubmit(formEvent('profile',{category:'OBC_NCL',targetYear:'2027',examDate:'2027-02-07',dailyMinutes:'90',reminderPreference:'in_app',displayName:'First <candidate>'}));
  const profile=await client('/api/profile');assert.equal(profile.category,'OBC_NCL');assert.equal(profile.dailyMinutes,90);assert.equal(profile.examDate,'2027-02-07');
  html=personal.renderers.profile();assert.match(html,/value="OBC_NCL" selected/);assert.match(html,/value="90"/);
 });

 await t.test('planner form creates calendar-date tasks and completion button persists its boolean',async()=>{
  location.hash='#planner';await personal.load('planner');assert.match(personal.renderers.planner(),/No saved tasks/);
  await personal.handleSubmit(formEvent('planner',{title:'Disposable plan <one>',mode:'daily',startDate:'2026-11-16',endDate:'2026-11-18',dailyMinutes:'60',weekday:'1',subject:question.subject,topic:question.topic_family}));
  const data=await client('/api/planner');assert.equal(data.plans.length,1);assert.equal(data.plans[0].title,'Disposable plan <one>');assert.equal(data.tasks.length,3);
  assert.deepEqual(data.tasks.map(task=>task.date),['2026-11-16','2026-11-17','2026-11-18']);assert(data.tasks.every(task=>task.minutes===60&&task.subject===question.subject&&task.topic===question.topic_family));firstTask=data.tasks[0];
  assert.match(personal.renderers.planner(),new RegExp('data-personal-id="'+firstTask.id+'"'));assert(!personal.renderers.planner().includes('No saved tasks'));
  await personal.handleClick(clickEvent('[data-personal-action]',{personalAction:'toggle-task',personalId:firstTask.id,personalCompleted:'true'}));
  const persisted=await client('/api/planner');assert.equal(persisted.tasks.find(task=>task.id===firstTask.id).completed,true);assert.match(personal.renderers.planner(),/Mark incomplete/);
  assert(calls.some(call=>call.path==='/api/planner/'+firstTask.id&&call.method==='PATCH'&&call.body.completed===true));
 });

 await t.test('mock form retains numeric breakdown and explicit error notes; server rejection stays visible',async()=>{
  location.hash='#mocks';await personal.load('mocks');assert.match(personal.renderers.mocks(),/No mock results yet/);
  const values={title:'Disposable <mock> one',takenAt:'2026-11-14T10:30',score:'64',total:'100',durationMinutes:'180',correct:'40',incorrect:'10',unattempted:'15',topicNotes:question.subject+' | '+question.topic_family+' | 3',['subject:'+question.subject]:'64'};
  await personal.handleSubmit(formEvent('mock',values));
  const {items}=await client('/api/mocks');assert.equal(items.length,1);assert.equal(items[0].score,64);assert.equal(items[0].durationMinutes,180);assert.equal(items[0].subjectScores[question.subject],64);assert.equal(items[0].correct,40);assert.equal(items[0].incorrect,10);
  assert.deepEqual(items[0].topicNotes,[{subject:question.subject,topic:question.topic_family,errors:3}]);assert.equal(items[0].provenance,'candidate_entered');
  const html=personal.renderers.mocks();assert.match(html,/Disposable &lt;mock&gt; one/);assert(!html.includes('Disposable <mock> one'));assert.match(html,/>80(?:\.0)?%<\/td>/);assert(!html.includes('No topic error evidence'));
  await personal.handleSubmit(formEvent('mock',{...values,title:'Rejected incomplete breakdown',['subject:'+question.subject]:'63'}));
  assert.match(personal.renderers.mocks(),/subject scores must reconcile/);assert.equal((await client('/api/mocks')).items.length,1);
  await personal.load('dashboard',true);const dashboard=personal.renderers.dashboard();assert.match(dashboard,/Disposable &lt;mock&gt; one/);assert(!dashboard.includes('No saved study tasks'));
 });

 await t.test('PYQ collection and bookmark handlers persist canonical identity and membership',async()=>{
  location.hash='#questions';await pyq.load();assert.equal(pyq.state.bookmarks.length,0);
  await pyq.handleSubmit(formEvent('collection',{name:'Private <revision> set'},'pyq'));
  const collections=await client('/api/collections');assert.equal(collections.items.length,1);firstCollection=collections.items[0];assert.equal(firstCollection.name,'Private <revision> set');
  pyq.handleChange({target:{id:'',dataset:{pyqFilter:'collection'},value:firstCollection.id,hasAttribute:()=>false}});
  assert.equal(pyq.handleClick(clickEvent('[data-pyq-action]',{pyqAction:'bookmark',pyqId:question.id})),true);await settled(()=>!pyq.state.busy);
  const bookmarks=await client('/api/bookmarks?limit=520');assert.equal(bookmarks.total,1);assert.equal(bookmarks.items[0].targetType,'question');assert.equal(bookmarks.items[0].targetId,question.id);assert.deepEqual(bookmarks.items[0].collectionIds,[firstCollection.id]);
  assert.deepEqual(Array.from(pyq.filterRows(corpus),q=>q.id),[question.id]);const html=pyq.renderers.questions();assert.match(html,/Private &lt;revision&gt; set/);assert(!html.includes('Private <revision> set'));assert.match(html,new RegExp('data-pyq-id="'+question.id+'"'));assert.match(html,/Remove bookmark/);
  location.hash='#dashboard';await personal.load('dashboard',true);const dashboard=personal.renderers.dashboard(),handoff=dashboard.match(/data-personal-go="questions" data-personal-params="([^"]+)"/);assert(handoff,'Dashboard exposes its bookmarked-question handoff');
  const parameters=JSON.parse(handoff[1].replaceAll('&quot;','"'));assert.deepEqual(parameters,{collection:'bookmarks'});
  await personal.handleClick(clickEvent('[data-personal-go]',{personalGo:'questions',personalParams:JSON.stringify(parameters)}));assert.equal(location.hash,'#questions?collection=bookmarks');
  pyq.renderers.questions();assert.deepEqual(Array.from(pyq.filterRows(corpus),q=>q.id),[question.id]);
 });

 await t.test('account switch clears caches and rejects late old-user SQL responses',async()=>{
  pyq.resetUser();holdBookmark=true;const oldLoad=pyq.load();await settled(()=>typeof releaseBookmark==='function');
  location.hash='#profile';await personal.handleClick(clickEvent('[data-personal-action]',{personalAction:'logout'}));
  await personal.handleSubmit(formEvent('register',{username:'feature-second',password,displayName:'Second candidate'}));assert.notEqual(session.user.id,firstUser);
  await pyq.load();releaseBookmark();await oldLoad;assert.equal(pyq.state.loadedFor,session.user.id);assert.equal(pyq.state.bookmarks.length,0);assert.equal(pyq.state.collections.length,0);
  for(const path of ['/api/bookmarks','/api/collections','/api/mocks'])assert.equal((await client(path)).items.length,0,path+' belongs to the second account');
  assert.equal((await client('/api/planner')).tasks.length,0);await personal.load('mocks',true);assert(!personal.renderers.mocks().includes('Disposable &lt;mock&gt; one'));
  await personal.load('planner',true);assert.match(personal.renderers.planner(),/No saved tasks/);
  await assert.rejects(()=>client('/api/planner/'+firstTask.id,{method:'PATCH',body:{completed:false}}),error=>error.status===404);
  await assert.rejects(()=>client('/api/bookmarks',{method:'POST',body:{targetType:'question',targetId:question.id,collectionId:firstCollection.id}}),error=>error.status===404);
  location.hash='#questions?collection=bookmarks';assert(!pyq.renderers.questions().includes('Private &lt;revision&gt; set'));
  location.hash='#profile';await personal.handleClick(clickEvent('[data-personal-action]',{personalAction:'logout'}));await personal.handleSubmit(formEvent('login',{username:'feature-first',password}));
  assert.equal(session.user.id,firstUser);assert.equal((await client('/api/planner')).tasks.length,3);assert.equal((await client('/api/mocks')).items.length,1);
  await pyq.load();assert.equal(pyq.state.bookmarks.length,1);assert.equal(pyq.state.collections[0].id,firstCollection.id);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n,2);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mock_attempts').first()).n,1);assert(renderCount>0);
 });
});
