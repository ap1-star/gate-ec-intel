import test from 'node:test';
import assert from 'node:assert/strict';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {createPortableServer,canonicalOrigin,loadPortableEnvironment} from '../server/portable-server.mjs';
import {mkdtemp,readFile,rm,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {proxyHostingRequest,staticHostingResponse} from '../server/hosting-proxy.mjs';
test('portable Node server serves public research, authenticates real credentials and isolates data from forged platform headers',async()=>{
 const db=await openSqliteDatabase(),origin='https://portal.example.test';
 const app=await createPortableServer({db,env:{PUBLIC_ORIGIN:origin,SESSION_SECRET:'disposable-test-secret-only-012345678901234567890123456789',RUN_SCHEDULER:'false'}});
 try{
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
  const catalog=await fetch(base+'/api/recruitment/catalog');assert.equal(catalog.status,200);assert.equal((await catalog.json()).data.examinations.length,104);
  const html=await fetch(base+'/');assert((await html.text()).startsWith('<!doctype html>'));
  const atlas=await fetch(base+'/career-atlas.json',{headers:{'accept-encoding':'gzip'}});assert.equal(atlas.headers.get('content-encoding'),'gzip');assert.equal((await atlas.json()).counts.rawCcmtObservations,56065);
  const spoof=await fetch(base+'/api/recruitment/preferences',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}});assert.equal(spoof.status,401);
  const registration=await fetch(base+'/api/auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:'portable_candidate@example.test',password:'DisposablePortablePassword123!',displayName:'Portable fixture'})});assert.equal(registration.status,201);
  const cookie=registration.headers.get('set-cookie').split(';')[0];assert.match(registration.headers.get('set-cookie'),/Secure/);
  const response=await fetch(base+'/api/session',{headers:{cookie}}),session=(await response.json()).data;assert.equal(session.authMode,'credentials');assert.equal(session.user.isOwner,false);
  const body=JSON.stringify({profile:{degree:'B.Tech',branch:'EC'},preferences:{organizationIds:['ssc'],channels:{in_app:false}}});
  const rejected=await fetch(base+'/api/recruitment/preferences',{method:'PUT',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':'wrong'},body});assert.equal(rejected.status,403);
  const saved=await fetch(base+'/api/recruitment/preferences',{method:'PUT',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':session.csrfToken},body});assert.equal(saved.status,200);assert.equal((await saved.json()).data.profile.branch,'EC');
  const health=await fetch(base+'/healthz');assert.deepEqual(await health.json(),{status:'ok',database:true,scheduler:false,setupRequired:[]});
 }finally{await app.close();db.close();}
});

test('Railway can infer its domain and reuse a generated session key across restarts',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'gate-railway-'));
 try{
  const env={RAILWAY_PUBLIC_DOMAIN:'example.up.railway.app',RAILWAY_VOLUME_MOUNT_PATH:folder};
  const first=await loadPortableEnvironment(env),second=await loadPortableEnvironment(env);
  assert.equal(first.origin,'https://example.up.railway.app');assert.equal(first.databasePath,join(folder,'workspace.sqlite'));
  assert.equal(first.secret.length,64);assert.equal(second.secret,first.secret);assert.equal(await readFile(first.databasePath+'.session-secret','utf8'),first.secret);
  assert.equal((await loadPortableEnvironment({...env,PUBLIC_ORIGIN:'https://custom.example.test',SESSION_SECRET:'x'.repeat(64)})).origin,'https://custom.example.test');
 }finally{await rm(join(folder,'workspace.sqlite.session-secret'),{force:true});await rmdir(folder);}
});

test('Railway first deploy without a public domain stays healthy with private services disabled',async()=>{
 const db=await openSqliteDatabase(),app=await createPortableServer({db,env:{RUN_SCHEDULER:'true'}});
 try{
  app.startScheduler();await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
  const health=await fetch(base+'/healthz',{headers:{host:'healthcheck.railway.app'}});assert.deepEqual(await health.json(),{status:'ok',database:true,scheduler:false,setupRequired:['public_origin']});
  assert.equal((await fetch(base+'/')).status,200);
  const session=(await (await fetch(base+'/api/session')).json()).data;assert.equal(session.status,'unavailable');assert.equal(session.capabilities.credentialAuth,false);
 }finally{await app.close();db.close();}
});

test('Render infers its HTTPS URL, persists the session key, and honors an explicit frontend origin',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'gate-render-'));
 try{
  const env={RENDER_EXTERNAL_URL:'https://gate-fixture.onrender.com',SQLITE_PATH:join(folder,'workspace.sqlite')};
  const first=await loadPortableEnvironment(env),restarted=await loadPortableEnvironment(env);
  assert.equal(first.origin,env.RENDER_EXTERNAL_URL);assert.equal(first.secret.length,64);assert.equal(restarted.secret,first.secret);
  const custom=await loadPortableEnvironment({...env,PUBLIC_ORIGIN:'https://terminal.example.test'});assert.equal(custom.origin,'https://terminal.example.test');
  await assert.rejects(loadPortableEnvironment({...env,RENDER_EXTERNAL_URL:'http://insecure.example.test'}),/HTTPS/);
  const db=await openSqliteDatabase(),app=await createPortableServer({db,env:{...env,RUN_SCHEDULER:'false'}});
  try{assert.equal(app.configuration.originConfigured,true);await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const session=(await (await fetch('http://127.0.0.1:'+app.server.address().port+'/api/session')).json()).data;assert.equal(session.capabilities.credentialAuth,true);}
  finally{await app.close();db.close();}
 }finally{await rm(join(folder,'workspace.sqlite.session-secret'),{force:true});await rmdir(folder);}
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
