import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backendFixture} from './backend-fixture.mjs';
import {createApi} from '../server/api.mjs';
import {runDueReminders,nextOccurrence} from '../server/reminders.mjs';

const subject='Networks',topic='Transient Circuits';

test('real development credentials create signed sessions, reject spoofing and enforce CSRF/logout',async()=>{
 const f=await backendFixture();try{
  const anonymous=f.client();assert.equal((await anonymous.request('/api/profile',{headers:{'oai-authenticated-user-id':'forged-user','oai-authenticated-user-email':'x@example.test'}})).status,401);
  const alice=f.client(),session=await alice.register('alice','Alice test');assert.equal(session.status,'authenticated');assert.equal(session.user.development,true);assert.equal(session.user.isOwner,false);assert.match(alice.cookie,/gate_dev_session=/);assert.ok(session.csrfToken);
  const bad=await anonymous.request('/api/dev/login',{method:'POST',body:{username:'alice',password:'WrongPassword12345'}});assert.equal(bad.status,401);
  assert.equal((await alice.request('/api/profile',{method:'PATCH',csrfToken:'bad',body:{dailyMinutes:30}})).status,403);
  assert.equal((await alice.request('/api/profile',{method:'PATCH',origin:'https://hostile.test',body:{dailyMinutes:30}})).status,403);
  assert.equal((await alice.request('/api/profile',{method:'PATCH',body:{dailyMinutes:45,reminderPreference:'in_app'}})).data.dailyMinutes,45);
  const logged=await alice.request('/api/dev/logout',{method:'POST',body:{}});assert.equal(logged.status,200);assert.equal((await alice.request('/api/profile')).status,401);
 }finally{f.close();}
});

test('profile, canonical bookmarks and multi-collection ownership persist in actual SQL',async()=>{
 const f=await backendFixture();try{
  const a=f.client(),b=f.client();await a.register('alice');await b.register('bravo');
  const c1=(await a.request('/api/collections',{method:'POST',body:{name:'Revision'}})).data,c2=(await a.request('/api/collections',{method:'POST',body:{name:'Hard questions'}})).data;
  const targetId=f.catalogue.questionIds[0];const bookmark=(await a.request('/api/bookmarks',{method:'POST',body:{targetType:'question',targetId,collectionId:c1.id}})).data;
  const again=(await a.request('/api/bookmarks',{method:'POST',body:{targetType:'question',targetId,collectionId:c2.id}})).data;assert.equal(again.id,bookmark.id);assert.equal(again.collectionIds.length,2);
  assert.equal((await b.request('/api/bookmarks')).data.items.length,0);
  assert.equal((await b.request('/api/bookmarks',{method:'POST',body:{targetType:'question',targetId,collectionId:c1.id}})).status,404);
  assert.equal((await b.request('/api/bookmarks/'+bookmark.id,{method:'DELETE'})).status,404);
  assert.equal((await a.request('/api/bookmarks',{method:'POST',body:{targetType:'question',targetId:'GATE-EC-2099-EC-99'}})).status,400);
  await a.request('/api/bookmarks/'+bookmark.id+'?collectionId='+c1.id,{method:'DELETE'});assert.equal((await a.request('/api/bookmarks')).data.items[0].collectionIds.length,1);
  assert.equal((await a.request('/api/bookmarks',{method:'POST',body:{targetType:'paper',targetId:f.catalogue.papers[0].id}})).status,200);
  assert.equal((await a.request('/api/collections')).data.items.find(c=>c.id===c2.id).count,1);
  assert.equal((await a.request('/api/profile',{method:'PATCH',body:{examDate:'2026-02-30'}})).status,400);
  assert.equal((await a.request('/api/profile',{method:'PATCH',body:{reminderPreference:'email'}})).status,400);
 }finally{f.close();}
});

test('transactional planner validates dates and daily budgets, persists completion and isolates owners',async()=>{
 const f=await backendFixture();try{
  const a=f.client(),b=f.client();await a.register('alice');await b.register('bravo');
  const input={title:'Weekly revision',mode:'weekly',startDate:'2026-11-15',endDate:'2026-11-21',dailyMinutes:90,tasks:[{date:'2026-11-15',subject,topic,minutes:45}]};
  const created=await a.request('/api/planner',{method:'POST',body:input});assert.equal(created.status,201,JSON.stringify(created.json));const task=created.data.tasks[0];
  assert.equal((await a.request('/api/planner/'+task.id,{method:'PATCH',body:{completed:true}})).data.completed,true);
  assert.equal((await b.request('/api/planner/'+task.id,{method:'PATCH',body:{completed:true}})).status,404);
  assert.equal((await b.request('/api/planner')).data.tasks.length,0);
  assert.equal((await a.request('/api/planner',{method:'POST',body:{...input,tasks:[{...input.tasks[0],minutes:100}]}})).status,400);
  assert.equal((await a.request('/api/planner',{method:'POST',body:{...input,startDate:'2026-02-30'}})).status,400);
  assert.equal((await a.request('/api/planner')).data.plans.length,1);
  assert.equal((await a.request('/api/dashboard')).data.counts.completedTasks,1);
 }finally{f.close();}
});

test('mock inputs remain candidate-entered and deadline links cannot cross users',async()=>{
 const f=await backendFixture();try{
  const a=f.client(),b=f.client();await a.register('alice');await b.register('bravo');
  const input={title:'Actual practice attempt',takenAt:'2026-11-14T12:00:00Z',score:40,total:100,durationMinutes:180,subjectScores:{Networks:40},correct:30,incorrect:5,unattempted:30,topicNotes:[{subject,topic,errors:2}]};
  const result=await a.request('/api/mocks',{method:'POST',body:input});assert.equal(result.status,201,JSON.stringify(result.json));assert.equal(result.data.provenance,'candidate_entered');assert.equal((await b.request('/api/mocks')).data.items.length,0);
  assert.equal((await a.request('/api/mocks',{method:'POST',body:{...input,subjectScores:{Networks:50}}})).status,400);
  assert.equal((await a.request('/api/mocks',{method:'POST',body:{...input,topicNotes:[{subject,topic,errors:10}]}})).status,400);
  assert.equal((await a.request('/api/mocks',{method:'POST',body:{...input,score:-5,subjectScores:{Networks:-5}}})).status,201);
  const deadline={title:'Review this mock',dueAt:'2026-11-16T12:00:00Z',timezone:'Asia/Calcutta',mockAttemptId:result.data.id};
  assert.equal((await a.request('/api/mock-deadlines',{method:'POST',body:deadline})).status,201);
  assert.equal((await b.request('/api/mock-deadlines',{method:'POST',body:deadline})).status,404);
 }finally{f.close();}
});

test('rank persistence recomputes results and does not accept a supplied rank',async()=>{
 const f=await backendFixture();try{const a=f.client();await a.register('alice');const result=await a.request('/api/estimates',{method:'POST',body:{marks:55,year:2025,category:'GEN',rank:1}});assert.equal(result.status,201,JSON.stringify(result.json));assert.equal(result.data.estimate.rank,550);assert.equal((await a.request('/api/estimates')).data.items.length,1);assert.equal((await a.request('/api/estimates',{method:'POST',body:{marks:5,year:2026,category:'GEN'}})).status,400);}finally{f.close();}
});

test('durable reminder runner delivers once, honors preferences and advances recurring wall time',async()=>{
 const f=await backendFixture({schedulerActive:true});try{
  const a=f.client();await a.register('alice');await a.request('/api/profile',{method:'PATCH',body:{reminderPreference:'in_app'}});
  const created=await a.request('/api/reminders',{method:'POST',body:{title:'Revise transients',dueAt:'2026-11-15T11:00:00Z',timezone:'Asia/Calcutta',cadence:'once'}});assert.equal(created.status,201,JSON.stringify(created.json));assert.equal(created.data.scheduling,'active');
  await Promise.all([runDueReminders(f.db,{now:f.clock.now}),runDueReminders(f.db,{now:f.clock.now})]);
  const notifications=(await a.request('/api/notifications')).data.items;assert.equal(notifications.length,1);assert.equal((await a.request('/api/reminders')).data.items[0].scheduling,'complete');
  assert.equal((await a.request('/api/notifications/'+notifications[0].id,{method:'PATCH',body:{read:true}})).status,200);
  await a.request('/api/profile',{method:'PATCH',body:{reminderPreference:'none'}});await a.request('/api/reminders',{method:'POST',body:{title:'Paused delivery choice',dueAt:'2026-11-15T11:00:00Z',timezone:'UTC',cadence:'daily'}});await runDueReminders(f.db,{now:f.clock.now});assert.equal((await a.request('/api/notifications')).data.items.length,1);
  assert.equal((await a.request('/api/reminders',{method:'POST',body:{title:'Invalid timezone',dueAt:'2026-11-15T11:00:00Z',timezone:'Mars/Olympus',cadence:'once'}})).status,400);
  assert.equal(nextOccurrence('2026-11-01T13:00:00Z','America/New_York','daily',Date.parse('2026-11-01T14:00:00Z')),'2026-11-02T13:00:00.000Z');
 }finally{f.close();}
});

test('forum permissions, atomic vote toggles and owner moderation remain separate from research',async()=>{
 const f=await backendFixture();try{
  const a=f.client(),b=f.client(),owner=f.client(),guest=f.client();await a.register('alice','Public alias');await b.register('bravo');await owner.register('owner');
  assert.equal((await guest.request('/api/forum')).status,200);assert.equal((await guest.request('/api/forum',{method:'POST',body:{title:'x',body:'x',subject}})).status,401);
  const created=await a.request('/api/forum',{method:'POST',body:{title:'Transient discussion',body:'<script>untrusted text remains plain data</script>',subject,tags:['revision']}});assert.equal(created.status,201,JSON.stringify(created.json));const thread=created.data;
  assert.equal((await guest.request('/api/forum?search=Transient')).data.items.length,1);
  const reply=await b.request('/api/forum/'+thread.id+'/replies',{method:'POST',body:{body:'Compare the time constants.'}});assert.equal(reply.status,201);
  const vote={entity:'thread',id:thread.id};assert.equal((await b.request('/api/forum/vote',{method:'POST',body:vote})).data.votes,1);assert.equal((await b.request('/api/forum/vote',{method:'POST',body:vote})).data.votes,0);
  assert.equal((await b.request('/api/forum/moderate',{method:'POST',body:{entity:'thread',id:thread.id,hidden:true}})).status,403);
  assert.equal((await owner.request('/api/forum/moderate',{method:'POST',body:{entity:'thread',id:thread.id,hidden:true}})).status,200);
  assert.equal((await guest.request('/api/forum')).data.items.length,0);assert.equal((await guest.request('/api/forum/'+thread.id+'/replies')).status,404);
 }finally{f.close();}
});

test('owner metrics deny nonowners and suppress small aggregates without private fields',async()=>{
 const f=await backendFixture();try{const owner=f.client(),a=f.client(),guest=f.client();const ownerSession=await owner.register('owner');const aSession=await a.register('alice');await a.request('/api/profile');assert.equal((await guest.request('/api/admin/metrics')).status,401);assert.equal((await a.request('/api/admin/metrics')).status,403);const result=await owner.request('/api/admin/metrics?days=7');assert.equal(result.status,200,JSON.stringify(result.json));assert.equal(result.data.registeredUsers,null);assert.equal(result.data.reminderHealth.measurement,'unavailable');const encoded=JSON.stringify(result.data);assert.ok(!encoded.includes(ownerSession.user.id));assert.ok(!encoded.includes(aSession.user.id));assert.ok(!encoded.includes('alice'));assert.equal((await owner.request('/api/admin/metrics?days=5')).status,400);}finally{f.close();}
});

test('database and identity dependencies fail honestly; SQLite records survive reopen',async()=>{
 const unavailable=createApi();const response=await unavailable(new Request('https://site.test/api/profile'));assert.equal(response.status,503);assert.equal((await response.json()).status,'unavailable');
 const dir=await mkdtemp(join(tmpdir(),'gate-part2-'));const filename=join(dir,'workspace.sqlite');let f=await backendFixture({filename});try{const a=f.client();await a.register('alice');await a.request('/api/collections',{method:'POST',body:{name:'Survives restart'}});f.close();f=await backendFixture({filename});const again=f.client();await again.login('alice');assert.equal((await again.request('/api/collections')).data.items[0].name,'Survives restart');}finally{f.close();await rm(dir,{recursive:true,force:true});}
});

test('failed delivery attempts are recorded and retries produce observed health rather than fabricated success',async()=>{
 const f=await backendFixture({schedulerActive:true,privacyThreshold:1});try{
  const a=f.client();await a.register('owner');await a.request('/api/profile',{method:'PATCH',body:{reminderPreference:'in_app'}});
  await a.request('/api/reminders',{method:'POST',body:{title:'Retry evidence',dueAt:'2026-11-15T11:00:00Z',timezone:'UTC',cadence:'once'}});
  const failing={...f.db,batch:async()=>{throw new Error('Disposable injected delivery failure')}};
  await assert.rejects(runDueReminders(failing,{now:f.clock.now}));
  assert.equal((await a.request('/api/notifications')).data.items.length,0);
  await runDueReminders(f.db,{now:f.clock.now+1000});
  assert.equal((await a.request('/api/notifications')).data.items.length,1);
  const health=(await a.request('/api/admin/metrics')).data.reminderHealth;
  assert.equal(health.attempted,2);assert.equal(health.delivered,1);assert.equal(health.failed,1);assert.equal(health.deliveryRate,.5);
  f.clock.now+=8*864e5;assert.equal((await a.request('/api/session')).data.status,'anonymous');assert.equal((await a.request('/api/profile')).status,401);
 }finally{f.close();}
});

test('adding a collection membership returns an older bookmark beyond the first page',async()=>{
 const f=await backendFixture();try{
  const a=f.client(),session=await a.register('alice'),userId=session.user.id;
  const records=[...f.catalogue.questionIds.map(targetId=>({targetType:'question',targetId})),...f.catalogue.papers.map(p=>({targetType:'paper',targetId:p.id}))];
  await f.db.batch(records.map((target,i)=>f.db.prepare('INSERT INTO bookmarks(id,user_id,target_type,target_id,created_at) VALUES(?,?,?,?,?)').bind('bookmark-'+i,userId,target.targetType,target.targetId,i===0?'2025-01-01T00:00:00Z':'2026-11-15T12:00:00Z')));
  const collection=(await a.request('/api/collections',{method:'POST',body:{name:'Old bookmark'}})).data;
  const result=await a.request('/api/bookmarks',{method:'POST',body:{...records[0],collectionId:collection.id}});
  assert.equal(result.status,200);assert.equal(result.data.id,'bookmark-0');assert.deepEqual(result.data.collectionIds,[collection.id]);
 }finally{f.close();}
});
