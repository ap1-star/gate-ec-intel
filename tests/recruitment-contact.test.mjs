import test from 'node:test';
import assert from 'node:assert/strict';
import {backendFixture} from './backend-fixture.mjs';
import {createApi} from '../server/api.mjs';
import {first,all} from '../server/validation.mjs';
import {signScopedToken} from '../server/recruitment-providers.mjs';
import {getRecruitmentPreferences} from '../server/recruitment-store.mjs';
const env={PUBLIC_ORIGIN:'https://terminal.example.test',NOTIFICATION_SIGNING_SECRET:'fixture-signing-secret-only-012345678901234567890'};
async function setup(){const f=await backendFixture(),client=f.client(),session=await client.register('contact_candidate');let sent;
 const providers={email:{configured:true},push:{configured:true},sendVerificationEmail:async(recipient,url,key)=>{sent={recipient,url,key};return {status:'accepted'};}};
 f.options.recruitmentProviders=providers;const api=createApi(f.options);
 async function request(path,{method='GET',body,privateRequest=false}={}){const response=await api(new Request('http://127.0.0.1'+path,{method,headers:{...(privateRequest?{cookie:client.cookie,origin:'http://127.0.0.1','x-csrf-token':client.csrf}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);return {response,status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():null};}
 return {...f,client,session,request,providers,sent:()=>sent};
}
test('email verification is one-time and expiring, GET does not consume it, no token leaks or implicit subscription',async()=>{
 const f=await setup();try{
  const result=await f.request('/api/recruitment/contact/verify',{method:'POST',privateRequest:true,body:{channel:'email',recipient:'candidate@example.test'}});assert.equal(result.status,200);assert(!JSON.stringify(result.data).includes('token'));
  const token=new URL(f.sent().url).searchParams.get('token'),stored=await first(f.db,'SELECT * FROM recruitment_verification_tokens');assert.notEqual(stored.token_hash,token);
  assert.equal((await f.request('/recruitment/verify-email?token='+token)).status,200);assert.equal((await first(f.db,'SELECT used_at FROM recruitment_verification_tokens')).used_at,null);
  assert.equal((await f.request('/api/recruitment/contact/confirm',{method:'POST',body:{token}})).status,303);assert.equal((await first(f.db,'SELECT recipient FROM recruitment_contacts')).recipient,'candidate@example.test');
  assert.equal((await getRecruitmentPreferences(f.db,f.session.user.id)).preferences.channels.email,false);
  assert.equal((await f.request('/api/recruitment/contact/confirm',{method:'POST',body:{token}})).status,400);
  await f.request('/api/recruitment/contact/verify',{method:'POST',privateRequest:true,body:{channel:'email',recipient:'other@example.test'}});const expired=new URL(f.sent().url).searchParams.get('token');f.clock.now+=31*60000;
  assert.equal((await f.request('/api/recruitment/contact/confirm',{method:'POST',body:{token:expired}})).status,400);
 }finally{f.close();}
});
test('recipient writes require account CSRF, disabled providers send nothing, verification requests are bounded',async()=>{
 const f=await setup();try{
  assert.equal((await f.request('/api/recruitment/contact/verify',{method:'POST',body:{channel:'email',recipient:'candidate@example.test'}})).status,401);
  assert.equal((await f.request('/api/recruitment/contact/verify',{method:'POST',privateRequest:true,body:{channel:'sms',recipient:'+15550000001'}})).status,503);
  for(let i=0;i<5;i++)assert.equal((await f.request('/api/recruitment/contact/verify',{method:'POST',privateRequest:true,body:{channel:'email',recipient:'candidate@example.test'}})).status,200);
  assert.equal((await f.request('/api/recruitment/contact/verify',{method:'POST',privateRequest:true,body:{channel:'email',recipient:'candidate@example.test'}})).status,429);
 }finally{f.close();}
});
test('email unsubscribe is scoped, forged callbacks fail and account deletion cascades recipient and token data',async()=>{
 const f=await setup();try{
  const token=await signScopedToken({scope:'unsubscribe',userId:f.session.user.id,channel:'email',version:1},env.NOTIFICATION_SIGNING_SECRET);
  assert.equal((await f.request('/api/recruitment/unsubscribe?token='+token,{method:'POST'})).status,200);
  assert.equal((await f.request('/api/recruitment/unsubscribe?token='+token+'x',{method:'POST'})).status,400);
  assert.equal((await f.request('/api/recruitment/webhooks/resend',{method:'POST',body:{type:'email.delivered'}})).status,403);
  await f.request('/api/recruitment/contact/verify',{method:'POST',privateRequest:true,body:{channel:'email',recipient:'candidate@example.test'}});
  assert.equal((await f.request('/api/account',{method:'DELETE',privateRequest:true,body:{}})).status,400);
  assert.equal((await f.request('/api/account',{method:'DELETE',privateRequest:true,body:{confirmation:'DELETE'}})).status,200);
  for(const table of ['recruitment_contacts','recruitment_verification_tokens','recruitment_channel_consents'])assert.equal((await all(f.db,'SELECT * FROM '+table)).length,0);
 }finally{f.close();}
});
