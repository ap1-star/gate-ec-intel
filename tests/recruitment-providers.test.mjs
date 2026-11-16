import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecruitmentProviders,notificationEmail,signScopedToken,readScopedToken} from '../server/recruitment-providers.mjs';
import {verifyResendWebhook,verifyTwilioWebhook} from '../server/recruitment-contact.mjs';
const env={PUBLIC_ORIGIN:'https://terminal.example.test',RECRUITMENT_EMAIL_FROM:'Terminal <alerts@example.test>',RESEND_API_KEY:'fixture-only',EMAIL_SENDER_VERIFIED:'true',NOTIFICATION_SIGNING_SECRET:'fixture-signing-secret-only-012345678901234567890'};
const input={userId:'candidate-a',channel:'email',recipient:'candidate@example.test',idempotencyKey:'fixture:one',payload:{title:'Technical update',body:'Exact notice rules apply.',officialUrl:'https://recruiter.example.test/notice'}};
test('providers remain blocked without configured approved sender/template; no send is attempted',async()=>{
 let calls=0;const providers=createRecruitmentProviders({}, {fetch:async()=>{calls++;throw Error();}});
 for(const channel of ['email','push','whatsapp','sms'])assert.equal((await providers.send({...input,channel})).status,'blocked');assert.equal(calls,0);
});
test('email submission uses stable idempotency body, verified recipient and scoped unsubscribe; accepted is not delivered',async()=>{
 const requests=[],providers=createRecruitmentProviders(env,{fetch:async(url,request)=>{requests.push({url,request});return Response.json({id:'fixture-message'});}});
 assert.equal((await providers.send(input)).status,'accepted');assert.equal((await providers.send(input)).status,'accepted');
 assert.equal(requests[0].url,'https://api.resend.com/emails');assert.equal(requests[0].request.body,requests[1].request.body);assert.equal(requests[0].request.headers['Idempotency-Key'],'fixture:one');
 const mail=JSON.parse(requests[0].request.body),url=mail.headers['List-Unsubscribe'].slice(1,-1),scope=await readScopedToken(new URL(url).searchParams.get('token'),env.NOTIFICATION_SIGNING_SECRET);assert.deepEqual(scope,{scope:'unsubscribe',userId:'candidate-a',channel:'email',version:1});
 assert.equal((await providers.send({...input,userId:null})).status,'blocked');
});
test('Resend retryable failures and Twilio ambiguous failures preserve different duplicate risks',async()=>{
 const mail=createRecruitmentProviders(env,{fetch:async()=>new Response('',{status:503})});assert.equal((await mail.send(input)).status,'retryable_failure');
 const mobile={...env,TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'fixture-only',TWILIO_WHATSAPP_FROM:'whatsapp:+15550000001',TWILIO_WHATSAPP_CONTENT_SID:'HX'+'2'.repeat(32),WHATSAPP_TEMPLATE_APPROVED:'true'};
 const provider=createRecruitmentProviders(mobile,{fetch:async()=>new Response('',{status:503})});assert.equal((await provider.send({...input,channel:'whatsapp',recipient:'+15550000002'})).status,'ambiguous');
});
test('notification email escapes supplied content and omits unsafe links; HMAC tokens reject tampering and wrong secrets',async()=>{
 const mail=notificationEmail({title:'<script>alert(1)</script>',body:'<img src=x onerror=x>',officialUrl:'javascript:alert(1)'});assert(!mail.html.includes('<script>'));assert(!mail.html.includes('<img'));assert(!mail.html.includes('javascript:'));
 const token=await signScopedToken({scope:'unsubscribe',userId:'a'},env.NOTIFICATION_SIGNING_SECRET);assert.equal(await readScopedToken(token+'x',env.NOTIFICATION_SIGNING_SECRET),null);assert.equal(await readScopedToken(token,'another-fixture-secret-01234567890123456789'),null);
});
const sign=async(algorithm,secret,value)=>{const key=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:algorithm},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))).toString('base64');};
test('Resend signed callbacks require exact raw body and fresh timestamp; standard Base64 signatures accepted',async()=>{
 const now=Date.parse('2026-11-16T00:00:00Z'),stamp=String(now/1000),raw=JSON.stringify({type:'email.delivered',data:{email_id:'fixture'}}),secret=crypto.getRandomValues(new Uint8Array(32)),signature=await sign('SHA-256',secret,'msg_fixture.'+stamp+'.'+raw),headers={'svix-id':'msg_fixture','svix-timestamp':stamp,'svix-signature':'v1,'+signature},request=new Request('https://terminal.example.test/api/recruitment/webhooks/resend',{headers});
 const configured='whsec_'+Buffer.from(secret).toString('base64');assert.equal(await verifyResendWebhook(request,raw,configured,{now}),true);assert.equal(await verifyResendWebhook(request,raw+' ',configured,{now}),false);assert.equal(await verifyResendWebhook(request,raw,configured,{now:now+301000}),false);
});
test('Twilio callback signature binds public origin, query and sorted form fields',async()=>{
 const url='https://terminal.example.test/api/recruitment/webhooks/twilio?channel=sms',raw='MessageStatus=delivered&MessageSid=SM'+ '3'.repeat(32),secret='fixture-twilio-token',signature=await sign('SHA-1',new TextEncoder().encode(secret),url+'MessageSidSM'+'3'.repeat(32)+'MessageStatusdelivered'),request=new Request(url,{headers:{'x-twilio-signature':signature}}),config={PUBLIC_ORIGIN:'https://terminal.example.test',TWILIO_AUTH_TOKEN:secret};
 assert.equal(await verifyTwilioWebhook(request,raw,config),true);assert.equal(await verifyTwilioWebhook(request,raw.replace('delivered','failed'),config),false);
});
