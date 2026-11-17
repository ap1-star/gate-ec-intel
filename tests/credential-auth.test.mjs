import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {createCredentialAuth} from '../server/credential-auth.mjs';
import {createApi} from '../server/api.mjs';
import {first,all} from '../server/validation.mjs';
import {createPersonalFeature} from '../src/features/personal.mjs';
import {createRecruitmentFeature,recruitmentFallbackCatalog} from '../src/features/recruitment.mjs';

const origin='https://terminal.example.test',secret='fixture-only-random-session-secret-012345678901234567890';
const password='PortableFixturePassword123!';
async function fixture({emailOnly=false,hybrid=false}={}){
 const db=await openSqliteDatabase(),clock={now:Date.parse('2026-11-16T12:00:00Z')};
 const options={db,authMode:hybrid?'sites_credentials':'credentials',credentialAuth:createCredentialAuth({db,secret,requireEmailRegistration:emailOnly}),now:()=>clock.now,clientKey:()=> 'fixture-client'};
 const api=createApi(options);
 function client(){let cookie='',methodCookie='',csrf='';return {
  get cookie(){return cookie},get csrf(){return csrf},
  async request(path,{method='GET',body,headers={},csrfToken=csrf,requestOrigin=origin}={}){
   const response=await api(new Request(origin+path,{method,headers:{...(cookie||methodCookie?{cookie:[cookie,methodCookie].filter(Boolean).join('; ')}:{}),...(['POST','PUT','PATCH','DELETE'].includes(method)?{origin:requestOrigin,'content-type':'application/json','x-csrf-token':csrfToken}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),{OWNER_EMAIL:'owner@example.test'});
   for(const setCookie of response.headers.getSetCookie()){if(setCookie.startsWith('gate_session='))cookie=setCookie.split(';')[0];else if(setCookie.startsWith('gate_auth_method='))methodCookie=setCookie.split(';')[0];}
   const json=await response.json();if(json.data?.csrfToken)csrf=json.data.csrfToken;return {status:response.status,data:json.data,json,response};
  },
  async register(username,displayName=username,chosenPassword=password){return this.request('/api/auth/register',{method:'POST',body:{username,password:chosenPassword,displayName}});}
 };}
 return {db,clock,options,api,client,close:()=>db.close()};
}

test('production credentials persist hashes and issue Secure sessions without first-user owner privilege',async()=>{
 const f=await fixture();try{
  const client=f.client(),registered=await client.register('owner');assert.equal(registered.status,201);assert.equal(registered.data.user.isOwner,false);assert.equal(registered.data.user.development,false);
  const setCookie=registered.response.headers.get('set-cookie');assert.match(setCookie,/^gate_session=/);for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/'])assert(setCookie.includes(flag));
  const stored=await first(f.db,'SELECT * FROM dev_credentials');assert.equal(stored.username,'owner');assert.match(stored.password_hash,/^[a-f0-9]{64}$/);assert.notEqual(stored.password_hash,password);
  const storedSession=await first(f.db,'SELECT * FROM dev_sessions');assert(!client.cookie.includes(storedSession.token_hash));assert.equal(storedSession.csrf_token,registered.data.csrfToken);
  const session=await client.request('/api/session');assert.equal(session.data.status,'authenticated');assert.equal(session.data.authMode,'credentials');assert.equal(session.data.capabilities.credentialAuth,true);assert.equal(session.data.capabilities.devAuth,false);assert.equal(session.data.capabilities.platformAuth,false);
  const tampered=await client.request('/api/session',{headers:{cookie:client.cookie.slice(0,-1)+(client.cookie.endsWith('0')?'1':'0')}});assert.equal(tampered.data.status,'anonymous');
 }finally{f.close();}
});

test('credential mode ignores spoofed Sites identity and owner headers and disables development routes',async()=>{
 const f=await fixture();try{
  const client=f.client(),headers={'oai-authenticated-user-id':'claimed-owner','oai-authenticated-user-email':'owner@example.test','oai-authenticated-user-full-name':'Owner'};
  const guest=await client.request('/api/session',{headers});assert.equal(guest.data.status,'anonymous');assert.equal(guest.data.user,null);
  assert.equal((await client.request('/api/profile',{headers})).status,401);
  assert.equal((await client.request('/api/dev/register',{method:'POST',body:{username:'spoof',password}})).status,404);
  assert.equal((await client.request('/api/dev/login',{method:'POST',body:{username:'spoof',password}})).status,404);
  assert.equal((await client.request('/api/auth/register',{method:'GET'})).status,405);
 }finally{f.close();}
});

test('production email registration normalizes addresses and preserves legacy username access without claiming email verification',async()=>{
 const f=await fixture({emailOnly:true});try{
  const client=f.client();assert.equal((await client.register('new_username')).status,400);
  const registered=await client.request('/api/auth/register',{method:'POST',body:{email:'  Candidate+Gate@Example.TEST  ',displayName:'Email candidate',password}});assert.equal(registered.status,201);assert.equal(registered.data.user.authProvider,'credentials');assert.equal(registered.data.user.isOwner,false);assert.notEqual(registered.data.user.emailVerified,true);
  assert.equal((await first(f.db,'SELECT username FROM dev_credentials')).username,'candidate+gate@example.test');
  await client.request('/api/auth/logout',{method:'POST',body:{}});
  assert.equal((await client.request('/api/auth/login',{method:'POST',body:{username:'CANDIDATE+GATE@EXAMPLE.TEST',password}})).status,200);
  assert.equal((await client.request('/api/auth/register',{method:'POST',body:{email:'candidate+gate@example.test',password}})).status,409);
  for(const email of ['bad','a@b','a@@example.test','a..b@example.test','a@-example.test','a@example..test','a b@example.test'])assert.equal((await client.request('/api/auth/register',{method:'POST',body:{email,password}})).status,400,email);
  const legacy=createCredentialAuth({db:f.db,secret,requireEmailRegistration:false});await legacy.register({username:'legacy_candidate',password},f.clock.now);
  assert.equal((await client.request('/api/auth/login',{method:'POST',body:{username:'LEGACY_CANDIDATE',password}})).status,200);
 }finally{f.close();}
});

test('hosted email and ChatGPT identities stay separate through logout, expiry and account deletion',async()=>{
 const f=await fixture({emailOnly:true,hybrid:true});try{
  const client=f.client(),platform={'oai-authenticated-user-id':'platform-owner','oai-authenticated-user-email':'owner@example.test'};
  const anonymous=await client.request('/api/session');assert.equal(anonymous.data.capabilities.credentialAuth,true);assert.equal(anonymous.data.capabilities.platformAuth,true);
  const signedPlatform=await client.request('/api/session',{headers:platform});assert.equal(signedPlatform.data.user.id,'platform-owner');assert.equal(signedPlatform.data.user.authProvider,'chatgpt');assert.equal(signedPlatform.data.user.isOwner,true);
  const registered=await client.request('/api/auth/register',{method:'POST',headers:platform,body:{email:'owner@example.test',password}});assert.equal(registered.status,201);assert.notEqual(registered.data.user.id,'platform-owner');assert.equal(registered.data.user.isOwner,false);
  const ownId=registered.data.user.id;assert.equal((await client.request('/api/session',{headers:platform})).data.user.id,ownId);
  await client.request('/api/auth/logout',{method:'POST',headers:platform,body:{}});assert.equal((await client.request('/api/session',{headers:platform})).data.status,'anonymous');
  await client.request('/api/auth/login',{method:'POST',headers:platform,body:{username:'owner@example.test',password}});f.clock.now+=8*86400000;
  assert.equal((await client.request('/api/session',{headers:platform})).data.status,'anonymous');
  await client.request('/api/auth/login',{method:'POST',headers:platform,body:{username:'owner@example.test',password}});
  assert.equal((await client.request('/api/account',{method:'DELETE',headers:platform,body:{confirmation:'DELETE'}})).status,200);
  assert.equal((await client.request('/api/session',{headers:platform})).data.status,'anonymous');
  const chosenPlatform=await client.request('/api/session',{headers:{...platform,cookie:'gate_auth_method=platform'}});assert.equal(chosenPlatform.data.user.id,'platform-owner');
 }finally{f.close();}
});

test('production sign-in preserves passwords, enforces CSRF, isolates records and revokes logout sessions',async()=>{
 const f=await fixture();try{
  const alice=f.client(),bob=f.client(),spacePassword=' '+password+' ';
  assert.equal((await alice.register('alice','Alice',spacePassword)).status,201);await bob.register('bob');
  assert.equal((await alice.request('/api/profile',{method:'PATCH',body:{dailyMinutes:45},csrfToken:'wrong'})).status,403);
  assert.equal((await alice.request('/api/profile',{method:'PATCH',body:{dailyMinutes:45}})).status,200);
  assert.equal((await bob.request('/api/profile')).data.dailyMinutes,120);
  const sessionCookie=alice.cookie;assert.equal((await alice.request('/api/auth/logout',{method:'POST',body:{},csrfToken:'wrong'})).status,403);
  const out=await alice.request('/api/auth/logout',{method:'POST',body:{}});assert.equal(out.status,200);assert.match(out.response.headers.get('set-cookie'),/Secure.*Max-Age=0/);
  assert.equal((await alice.request('/api/session',{headers:{cookie:sessionCookie}})).data.status,'anonymous');
  assert.equal((await alice.request('/api/auth/login',{method:'POST',body:{username:'alice',password}})).status,401);
  assert.equal((await alice.request('/api/auth/login',{method:'POST',body:{username:'ALICE',password:spacePassword}})).status,200);
  assert.equal((await alice.request('/api/profile')).data.dailyMinutes,45);
  assert.equal((await alice.register('ALICE')).status,409);
 }finally{f.close();}
});

test('owner privilege is granted only to an exact operator-configured user ID',async()=>{
 const f=await fixture();try{
  const alice=f.client(),bob=f.client(),a=await alice.register('owner'),b=await bob.register('admin');
  assert.equal(a.data.user.isOwner,false);assert.equal(b.data.user.isOwner,false);
  f.options.credentialAuth=createCredentialAuth({db:f.db,secret,ownerUserId:b.data.user.id});
  assert.equal((await alice.request('/api/session',{headers:{'oai-authenticated-user-id':b.data.user.id}})).data.user.isOwner,false);
  assert.equal((await bob.request('/api/session')).data.user.isOwner,true);
  assert.equal((await alice.request('/api/admin/metrics')).status,403);
  assert.equal((await bob.request('/api/admin/metrics')).status,200);
 }finally{f.close();}
});

test('expired or deleted accounts can clear their Secure cookie without restoring private rows',async()=>{
 const f=await fixture();try{
  const client=f.client();await client.register('expired');f.clock.now+=8*86400000;
  assert.equal((await client.request('/api/session')).data.status,'anonymous');
  assert.equal((await client.request('/api/auth/logout',{method:'POST',body:{},requestOrigin:'https://other.test'})).status,403);
  assert.equal((await client.request('/api/auth/logout',{method:'POST',body:{}})).status,200);
  await client.register('deleted');assert.equal((await client.request('/api/account',{method:'DELETE',body:{confirmation:'DELETE'}})).status,200);
  assert.equal((await client.request('/api/auth/logout',{method:'POST',body:{}})).status,200);assert.equal((await client.request('/api/session')).data.status,'anonymous');
  assert.equal((await all(f.db,"SELECT * FROM dev_credentials WHERE username='deleted'")).length,0);
 }finally{f.close();}
});

test('credentials configuration fails closed and same-origin registration requests are rate bounded',async()=>{
 const db=await openSqliteDatabase();try{assert.throws(()=>createCredentialAuth({db,secret:'short'}),/SESSION_SECRET/);}finally{db.close();}
 const f=await fixture();try{
  const client=f.client();assert.equal((await client.request('/api/auth/register',{method:'POST',body:{username:'blocked',password},requestOrigin:'https://other.test'})).status,403);
  for(let i=0;i<20;i++)assert.equal((await client.request('/api/auth/login',{method:'POST',body:{username:i%2?' BLOCKED ':'blocked',password:'short'},headers:{'x-forwarded-for':'192.0.2.'+i,'oai-authenticated-user-id':'spoof-'+i}})).status,400);
  assert.equal((await client.request('/api/auth/login',{method:'POST',body:{username:'Blocked',password:'short'},headers:{'x-forwarded-for':'198.51.100.1'}})).status,429);
  assert.equal((await client.request('/api/auth/login',{method:'POST',body:{username:'other_account',password:'short'}})).status,400);
 }finally{f.close();}
});

test('distinct production accounts can register and sign in behind one shared hosting ingress',async()=>{
 const f=await fixture();try{
  for(let i=0;i<25;i++){
   const client=f.client(),username='shared_ingress_'+i;
   const registered=await client.register(username);assert.equal(registered.status,201);
   const login=await client.request('/api/auth/login',{method:'POST',body:{username,password}});assert.equal(login.status,200);assert.equal(login.data.user.id,registered.data.user.id);
  }
  assert.equal((await first(f.db,'SELECT COUNT(*) AS n FROM dev_credentials')).n,25);
 }finally{f.close();}
});

test('varied account names cannot bypass registration or aggregate credential circuit breakers',async()=>{
 const f=await fixture();try{
  const client=f.client();
  const malformed=path=>f.api(new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{'}));
  for(let i=0;i<50;i++){
   const response=i%2?await client.request('/api/auth/register',{method:'POST',body:{username:'signup_attempt_'+i,password:'short'}}):await malformed('/api/auth/register');
   assert.equal(response.status,400);
  }
  assert.equal((await client.register('signup_over_limit')).status,429);
  assert.equal((await first(f.db,'SELECT COUNT(*) AS n FROM dev_credentials')).n,0);
  // An exhausted signup budget does not consume every account's sign-in bucket.
  assert.equal((await client.request('/api/auth/login',{method:'POST',body:{username:'existing_account',password:'short'}})).status,400);
  f.clock.now+=15*60000;
  for(let i=0;i<300;i++){
   const response=i%2?await client.request('/api/auth/login',{method:'POST',body:{username:'login_attempt_'+i,password:'short'}}):await malformed('/api/auth/login');
   assert.equal(response.status,400);
  }
  assert.equal((await client.request('/api/auth/login',{method:'POST',body:{username:'login_over_limit',password:'short'}})).status,429);
  f.clock.now+=15*60000;
  assert.equal((await client.register('signup_after_reset')).status,201);
 }finally{f.close();}
});

const components=()=>{const context=vm.createContext({window:{UI_ICONS:{}}});vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);return context.window.TerminalComponents;};
const withFormData=async run=>{const previous=globalThis.FormData;globalThis.FormData=class{constructor(form){this.rows=form.rows;}[Symbol.iterator](){return this.rows[Symbol.iterator]();}getAll(name){return this.rows.filter(([key])=>key===name).map(([,value])=>value);}};try{return await run();}finally{globalThis.FormData=previous;}};
const form=(kind,rows)=>{const node={rows,dataset:{personalForm:kind,recruitmentForm:kind},closest(){return this;}};return {target:node,preventDefault(){}};};

test('portable personal UI renders website accounts and uses production credential endpoints',async()=>withFormData(async()=>{
 let session={status:'anonymous',user:null,capabilities:{credentialAuth:true}},requests=[];
 const bridge={C:components(),icon:()=>'',render(){},params:()=>new URLSearchParams(),session:()=>session,navigate(){},async api(path,options={}){requests.push({path,...options});return path==='/api/dashboard'?{counts:{},tasks:[],mocks:[],estimates:[],notifications:[]}:{user:{id:'candidate',displayName:'Candidate'},csrfToken:'fixture'};},async refreshSession(){session={status:'authenticated',user:{id:'candidate',displayName:'Candidate',development:false},capabilities:{credentialAuth:true}};}};
 const feature=createPersonalFeature(bridge),html=feature.renderers.dashboard();assert.match(html,/Welcome back/);assert.match(html,/Create account/);assert.match(html,/Email or existing username/);assert.equal((html.match(/<form /g)||[]).length,1);assert(!html.includes('Sign in locally'));assert(!html.includes('signin-with-chatgpt'));
 await feature.handleClick({target:{closest:selector=>selector==='[data-personal-action]'?{dataset:{personalAction:'auth-register'}}:null},preventDefault(){}});const registration=feature.renderers.dashboard();assert.match(registration,/Email address/);assert.match(registration,/type="email"/);assert.equal((registration.match(/<form /g)||[]).length,1);assert(!registration.includes('data-personal-form="login"'));
 await feature.handleSubmit(form('register',[['email','candidate@example.test'],['password',password],['displayName','Candidate']]));assert.equal(requests[0].path,'/api/auth/register');assert.equal(requests[0].body.email,'candidate@example.test');assert(!requests.some(request=>request.path.startsWith('/api/dev/')));
 const click={target:{closest:selector=>selector==='[data-personal-action]'?{dataset:{personalAction:'logout'}}:null},preventDefault(){}};await feature.handleClick(click);assert(requests.some(request=>request.path==='/api/auth/logout'));
}));

test('portable recruitment gates and account-deletion completion never use Sites sign-in or sign-out',async()=>withFormData(async()=>{
 let session={status:'anonymous',user:null,capabilities:{credentialAuth:true}},route='recruitment-preferences',requests=[];
 const bridge={C:components(),icon:()=>'',render(){},params:()=>new URLSearchParams(),currentRoute:()=>route,session:()=>session,navigate(next){route=next;},async refreshSession(){session={status:'anonymous',user:null,capabilities:{credentialAuth:true}};},async api(path,options={}){requests.push({path,...options});if(path==='/api/recruitment/catalog')return recruitmentFallbackCatalog();if(path==='/api/recruitment/preferences')return {profile:{},preferences:{},capabilities:{}};if(path==='/api/recruitment/saved')return {items:[]};if(path==='/api/recruitment/notifications')return {items:[],unread:0};if(path==='/api/account')return {deleted:true};if(path==='/api/auth/logout')return {signedOut:true};throw Error(path);}};
 const feature=createRecruitmentFeature(bridge),gate=feature.renderers['recruitment-preferences']();assert.match(gate,/href="#dashboard"/);assert(!gate.includes('signin-with-chatgpt'));
 session={status:'authenticated',user:{id:'candidate'},capabilities:{credentialAuth:true}};await feature.load('recruitment-preferences');
 await feature.handleSubmit(form('delete-account',[['confirmation','DELETE']]));const removed=feature.renderers['recruitment-preferences']();assert.match(removed,/finish-signout/);assert(!removed.includes('signout-with-chatgpt'));assert(!removed.includes('ChatGPT account'));
 await feature.handleClick({target:{closest:()=>({dataset:{recruitmentAction:'finish-signout'}})}});assert.equal(requests.at(-1).path,'/api/auth/logout');assert.equal(route,'recruitment');
}));
