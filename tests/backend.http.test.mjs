import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('local HTTP server serves one application and performs real cookie-authenticated SQL writes',{timeout:20000},async()=>{
 const allocation=createServer();await new Promise(resolve=>allocation.listen(0,'127.0.0.1',resolve));const port=allocation.address().port;await new Promise(resolve=>allocation.close(resolve));
 const directory=await mkdtemp(join(tmpdir(),'gate-http-')),db=join(directory,'workspace.sqlite'),origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['scripts/dev-server.mjs','--port',String(port),'--db',db,'--dev-auth'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe'],windowsHide:true});
 let output='';
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Local server startup timed out: '+output)),15000);child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('Local: ')){clearTimeout(timer);resolve();}});child.stderr.on('data',chunk=>{output+=chunk});child.once('exit',code=>{clearTimeout(timer);reject(new Error('Local server exited: '+code+' '+output));});});
  const home=await fetch(origin+'/');assert.equal(home.status,200);assert.match(await home.text(),/features\.js/);
  const script=await fetch(origin+'/features.js');assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);
  const registration=await fetch(origin+'/api/dev/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username:'http_test',password:'DisposableHttpPassword123!',displayName:'HTTP fixture'})});
  assert.equal(registration.status,201);const cookie=registration.headers.get('set-cookie').split(';')[0],registered=await registration.json();assert.ok(/HttpOnly/.test(registration.headers.get('set-cookie')));
  const response=await fetch(origin+'/api/collections',{method:'POST',headers:{origin,cookie,'content-type':'application/json','x-csrf-token':registered.data.csrfToken},body:JSON.stringify({name:'HTTP persisted'})});assert.equal(response.status,201);
  const list=await fetch(origin+'/api/collections',{headers:{cookie}});assert.equal((await list.json()).data.items[0].name,'HTTP persisted');
  const session=await (await fetch(origin+'/api/session',{headers:{cookie}})).json();assert.equal(session.data.status,'authenticated');
  const headers={origin,cookie,'content-type':'application/json','x-csrf-token':session.data.csrfToken};
  const saved=await fetch(origin+'/api/profile',{method:'PATCH',headers,body:JSON.stringify({displayName:'Persisted HTTP Candidate',dailyMinutes:75})});assert.equal(saved.status,200);
  const profile=await (await fetch(origin+'/api/profile',{headers:{cookie}})).json();assert.equal(profile.data.displayName,'Persisted HTTP Candidate');assert.equal(profile.data.dailyMinutes,75);
  assert.equal((await fetch(origin+'/api/profile')).status,401);
  const foreignOrigin=await fetch(origin+'/api/profile',{method:'PATCH',headers:{...headers,origin:'https://different.example'},body:JSON.stringify({dailyMinutes:99})});assert.equal(foreignOrigin.status,403);
  const forged=await fetch(origin+'/api/profile',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}});assert.equal(forged.status,401);
  assert.equal((await fetch(origin+'/api/dev/logout',{method:'POST',headers,body:'{}'})).status,200);
  assert.equal((await fetch(origin+'/api/profile',{headers:{cookie}})).status,401);
 }finally{
  child.kill();await new Promise(resolve=>{if(child.exitCode!==null)return resolve();const timer=setTimeout(resolve,5000);child.once('exit',()=>{clearTimeout(timer);resolve();})});await rm(directory,{recursive:true,force:true});
 }
});
