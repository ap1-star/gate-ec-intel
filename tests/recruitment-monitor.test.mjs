import test from 'node:test';
import assert from 'node:assert/strict';
import {backendFixture} from './backend-fixture.mjs';
import {first,all} from '../server/validation.mjs';
import {registerRecruitmentSources} from '../server/recruitment-store.mjs';
import {fetchOfficialSource,discoverOfficialNoticeLinks,runRecruitmentSourceChecks} from '../server/recruitment-monitor.mjs';
const source={id:'fixture_source',url:'https://official.example.test/careers',official:true,allowedHosts:['official.example.test'],allowed_hosts_json:'["official.example.test"]',adapter:'html_links'};
test('source access rejects redirects outside registered hosts, oversized bodies and CAPTCHA restrictions',async()=>{
 await assert.rejects(()=>fetchOfficialSource(source,{fetch:async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})}),/redirect_not_allowed/);
 await assert.rejects(()=>fetchOfficialSource(source,{fetch:async()=>new Response('x',{headers:{'content-type':'text/html','content-length':'9000000'}})}),/source_too_large/);
 await assert.rejects(()=>fetchOfficialSource(source,{fetch:async()=>new Response('<div class="g-recaptcha">Challenge</div>',{headers:{'content-type':'text/html'}})}),/access_restricted/);
 const links=discoverOfficialNoticeLinks('<a href="/notice/engineer.pdf">Electronics Engineer recruitment</a><a href="/notice/general.pdf">SSC CGL recruitment</a><a href="https://other.test/a.pdf">Technical scientist</a>',source);assert.equal(links.length,1);assert.equal(links[0].url,'https://official.example.test/notice/engineer.pdf');
});
test('official link discovery persists review-required notices once; 304 retains provenance and no vacancy alerts',async()=>{
 const f=await backendFixture();try{
  await registerRecruitmentSources(f.db,[source],{now:f.clock.now});let calls=0;
  const fetch=async()=>{calls++;return calls===1?new Response('<a href="/notice/engineer.pdf">Electronics Engineer recruitment</a>',{headers:{'content-type':'text/html',etag:'"fixture-v1"'}}):new Response(null,{status:304});};
  const options={now:f.clock.now,sources:[source],pathways:[{id:'fixture_exam',organizationId:'fixture_org',sourceIds:[source.id]}],fetch};
  assert.equal((await runRecruitmentSourceChecks(f.db,options)).results[0].discovered,1);const row=await first(f.db,'SELECT * FROM recruitment_notices');assert.equal(row.verification_status,'review_required');assert.equal(row.status,'unknown');assert.equal(row.deadline_at,null);
  assert.equal((await runRecruitmentSourceChecks(f.db,options)).checked,0);options.now+=25*3600000;
  assert.equal((await runRecruitmentSourceChecks(f.db,options)).results[0].status,'unchanged');assert.equal((await all(f.db,'SELECT * FROM recruitment_notices')).length,1);assert.equal((await first(f.db,'SELECT last_error FROM recruitment_sources')).last_error,null);
 }finally{f.close();}
});
test('restricted sources back off durably and manual-review adapters are never polled',async()=>{
 const f=await backendFixture();try{await registerRecruitmentSources(f.db,[source,{...source,id:'manual',adapter:'manual_review'}],{now:f.clock.now});const result=await runRecruitmentSourceChecks(f.db,{now:f.clock.now,fetch:async()=>new Response('',{status:403})});assert.equal(result.checked,1);const row=await first(f.db,'SELECT * FROM recruitment_sources WHERE id=?',source.id);assert.equal(row.last_error,'http_403');assert.equal(row.last_success_at,null);assert(Date.parse(row.next_check_at)>f.clock.now);assert.equal((await runRecruitmentSourceChecks(f.db,{now:f.clock.now})).checked,0);}finally{f.close();}
});
