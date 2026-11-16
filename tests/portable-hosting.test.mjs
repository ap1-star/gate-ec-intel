import test from 'node:test';
import assert from 'node:assert/strict';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {createPortableServer,canonicalOrigin} from '../server/portable-server.mjs';
import {proxyHostingRequest,staticHostingResponse} from '../server/hosting-proxy.mjs';
test('portable Node server serves public research, authenticates real credentials and isolates data from forged platform headers',async()=>{
 const db=await openSqliteDatabase(),origin='https://portal.example.test';
 const app=await createPortableServer({db,env:{PUBLIC_ORIGIN:origin,SESSION_SECRET:'disposable-test-secret-only-012345678901234567890123456789',RUN_SCHEDULER:'false'}});
 try{
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
  const catalog=await fetch(base+'/api/recruitment/catalog');assert.equal(catalog.status,200);assert.equal((await catalog.json()).data.examinations.length,104);
  const html=await fetch(base+'/');assert((await html.text()).startsWith('<!doctype html>'));
  const spoof=await fetch(base+'/api/recruitment/preferences',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}});assert.equal(spoof.status,401);
  const registration=await fetch(base+'/api/auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username:'portable_candidate',password:'DisposablePortablePassword123!',displayName:'Portable fixture'})});assert.equal(registration.status,201);
  const cookie=registration.headers.get('set-cookie').split(';')[0];assert.match(registration.headers.get('set-cookie'),/Secure/);
  const response=await fetch(base+'/api/session',{headers:{cookie}}),session=(await response.json()).data;assert.equal(session.authMode,'credentials');assert.equal(session.user.isOwner,false);
  const body=JSON.stringify({profile:{degree:'B.Tech',branch:'EC'},preferences:{organizationIds:['ssc'],channels:{in_app:false}}});
  const rejected=await fetch(base+'/api/recruitment/preferences',{method:'PUT',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':'wrong'},body});assert.equal(rejected.status,403);
  const saved=await fetch(base+'/api/recruitment/preferences',{method:'PUT',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':session.csrfToken},body});assert.equal(saved.status,200);assert.equal((await saved.json()).data.profile.branch,'EC');
  const health=await fetch(base+'/healthz');assert.deepEqual(await health.json(),{status:'ok',database:true,scheduler:false});
 }finally{await app.close();db.close();}
});
test('canonical production origin rejects insecure, credential-bearing or path-bearing URLs',()=>{
 for(const value of ['http://example.test','https://user:pass@example.test','https://example.test/path','https://example.test/?query=yes'])assert.throws(()=>canonicalOrigin(value));
 assert.equal(canonicalOrigin('https://example.test/'),'https://example.test');assert.equal(canonicalOrigin('http://127.0.0.1:8080',{allowLoopback:true}),'http://127.0.0.1:8080');
});
test('serverless frontends keep a truthful public snapshot when no persistent backend is configured',async()=>{
 const response=await staticHostingResponse(new Request('https://frontend.example.test/api/recruitment/catalog')),data=(await response.json()).data;assert.equal(data.examinations.length,104);assert.equal(data.capabilities.database,false);assert.equal(data.transport,'bundled_directory');
 const session=await staticHostingResponse(new Request('https://frontend.example.test/api/session'));assert.equal((await session.json()).data.status,'unavailable');
 assert.equal((await staticHostingResponse(new Request('https://frontend.example.test/api/auth/register',{method:'POST'}))).status,503);
});
test('frontend proxy preserves raw webhook bodies, cookies, signatures and redirect status without trusting Sites headers or double encoding',async()=>{
 const raw='{ "signed" : true }\n',request=new Request('https://frontend.example.test/api/recruitment/webhooks/resend?channel=email',{method:'POST',headers:{'content-type':'application/json',origin:'https://frontend.example.test',cookie:'gate_session=fixture','svix-signature':'fixture-signature','oai-authenticated-user-id':'forged'},body:raw});let captured;
 const response=await proxyHostingRequest(request,{BACKEND_ORIGIN:'https://backend.example.test'},async(url,options)=>{captured={url:String(url),...options};const headers=new Headers({'content-type':'application/json','content-encoding':'gzip',location:'/#recruitment-preferences'});headers.append('set-cookie','gate_session=next; Secure; HttpOnly; SameSite=Strict');return new Response('{"accepted":true}',{status:303,headers});});
 assert.equal(captured.url,'https://backend.example.test/api/recruitment/webhooks/resend?channel=email');assert.equal(new TextDecoder().decode(captured.body),raw);assert.equal(captured.headers.get('cookie'),'gate_session=fixture');assert.equal(captured.headers.get('svix-signature'),'fixture-signature');assert.equal(captured.headers.get('origin'),'https://frontend.example.test');assert.equal(captured.headers.get('oai-authenticated-user-id'),null);assert.equal(captured.redirect,'manual');assert.equal(response.status,303);assert.equal(response.headers.get('content-encoding'),null);assert.match(response.headers.get('set-cookie'),/Secure/);assert.equal(await response.text(),'{"accepted":true}');
 let calls=0;await proxyHostingRequest(new Request('https://front.example.test/api/session'),{BACKEND_ORIGIN:'http://unsafe.example.test'},()=>{calls++;});assert.equal(calls,0);
});
