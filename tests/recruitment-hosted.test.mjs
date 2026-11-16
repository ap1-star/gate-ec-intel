import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHostedWorker} from '../server/hosted-worker.mjs';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {ORGANIZATIONS,TECHNICAL_PATHWAYS,RECRUITMENT_SOURCES,RECRUITMENT_NOTICES,evaluateTechnicalEligibility} from '../src/domains/recruitment/index.mjs';
const catalogue={organizations:ORGANIZATIONS,examinations:TECHNICAL_PATHWAYS,sources:RECRUITMENT_SOURCES,notices:RECRUITMENT_NOTICES};
test('a browser receives readable HTML after one HTTP decode under Cloudflare automatic encoding semantics',async()=>{
 const NativeResponse=globalThis.Response,html='<!doctype html><title>Readable terminal</title>';
 class CloudflareResponse extends NativeResponse{
  constructor(body,init={}){
   const headers=new Headers(init.headers);
   super(body&&headers.get('content-encoding')==='gzip'&&init.encodeBody!=='manual'?gzipSync(body):body,init);
  }
 }
 globalThis.Response=CloudflareResponse;
 try{
  const worker=createHostedWorker({assets:{'/index.html':{data:gzipSync(html).toString('base64'),type:'text/html',hash:'fixture'}}});
  const response=await worker.fetch(new Request('https://terminal.example.test/'));
  assert.equal(gunzipSync(Buffer.from(await response.arrayBuffer())).toString(),html);
 }finally{globalThis.Response=NativeResponse;}
});
test('MCP accepts JSON service requests and rejects browser form or cross-origin write attempts',async()=>{
 const worker=createHostedWorker(),url='https://terminal.example.test/mcp',body=JSON.stringify({jsonrpc:'2.0',id:1,method:'server/discover'});
 assert.equal((await worker.fetch(new Request(url,{method:'POST',body}))).status,415);
 assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json',origin:'https://other.example.test','oai-authenticated-user-id':'owner'},body}),{OWNER_SITE_USER_ID:'owner'})).status,403);
 assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body}))).status,200);
});
test('hosted composition serves compressed public assets, all real seeds and anonymous directory; private API uses Sites identity and CSRF',async()=>{
 const db=await openSqliteDatabase();try{
  const assets={'/index.html':{data:gzipSync('<title>Fixture</title>').toString('base64'),type:'text/html',hash:'fixture'}};
  const worker=createHostedWorker({assets,catalogue,evaluateTechnicalEligibility}),env={DB:db};
  const asset=await worker.fetch(new Request('https://terminal.example.test/'),env);assert.equal(asset.status,200);assert.equal(gunzipSync(Buffer.from(await asset.arrayBuffer())).toString(),'<title>Fixture</title>');
  const catalog=await worker.fetch(new Request('https://terminal.example.test/api/recruitment/catalog'),env),data=(await catalog.json()).data;assert.equal(data.examinations.length,104);assert.equal(data.notices.length,8);assert.equal(data.capabilities.scheduler.configured,false);
  assert.equal((await worker.fetch(new Request('https://terminal.example.test/api/recruitment/preferences'),env)).status,401);
  const identity={'oai-authenticated-user-id':'fixture-sites-a'},sessionResponse=await worker.fetch(new Request('https://terminal.example.test/api/session',{headers:identity}),env),session=(await sessionResponse.json()).data,cookie=sessionResponse.headers.get('set-cookie').split(';')[0];assert.equal(session.status,'authenticated');assert.match(cookie,/gate_csrf=/);
  const input={profile:{degree:'B.Tech',branch:'ECE'},preferences:{organizationIds:['ssc'],channels:{in_app:false}}};
  const write=csrf=>worker.fetch(new Request('https://terminal.example.test/api/recruitment/preferences',{method:'PUT',headers:{...identity,cookie,origin:'https://terminal.example.test','content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify(input)}),env);
  assert.equal((await write('wrong')).status,403);assert.equal((await write(session.csrfToken)).status,200);
  const second=await worker.fetch(new Request('https://terminal.example.test/api/recruitment/preferences',{headers:{'oai-authenticated-user-id':'fixture-sites-b'}}),env);assert(!(await second.json()).data.profile.branch);
 }finally{db.close();}
});
test('MCP writer requires Sites identity and returns only source/runner aggregates; four phases persist observed progress',async()=>{
 const db=await openSqliteDatabase();try{
  const worker=createHostedWorker({catalogue:{sources:[],notices:[]}}),env={DB:db,OWNER_SITE_USER_ID:'fixture-sites-a'};
  const call=(name,identity=true)=>worker.fetch(new Request('https://terminal.example.test/mcp',{method:'POST',headers:{'content-type':'application/json',...(identity?{'oai-authenticated-user-id':'fixture-sites-a'}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{}}})}),env);
  assert.equal((await call('refresh_technical_sources',false)).status,401);
  for(const phase of ['sources','fanout','reminders','delivery']){const response=await call('refresh_technical_sources'),result=JSON.parse((await response.json()).result.content[0].text);assert.equal(result.phase,phase);assert.equal(result.status,'completed');}
  const response=await call('technical_source_health'),body=await response.text();assert(!body.includes('recipient'));assert(!body.includes('fixture-sites-a'));const result=JSON.parse(JSON.parse(body).result.content[0].text);assert.equal(result.runner.next_phase,0);assert(result.runner.last_success_at);assert.equal(result.latestRun.stage,'delivery');
 }finally{db.close();}
});
