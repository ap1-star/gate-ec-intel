import {first,run,fail,bodyJson} from './validation.mjs';
import {saveVerifiedRecruitmentContact,setRecruitmentConsent} from './recruitment-store.mjs';
import {validEmail,validPhone,publicOrigin,readScopedToken} from './recruitment-providers.mjs';
import {validatePushSubscription,base64url,decode64} from './recruitment-push.mjs';

const encoder=new TextEncoder();
const utc=now=>new Date(now).toISOString();
const json=(data,status=200)=>new Response(JSON.stringify({status:'ok',data}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=async value=>base64url(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const random=()=>base64url(crypto.getRandomValues(new Uint8Array(32)));
const providerBase64=value=>decode64(String(value).replaceAll('+','-').replaceAll('/','_'));
function confirmationPage(title,body,action,token){
 return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+escape(title)+'</title><style>body{font:16px/1.7 system-ui;background:#f5f3ee;color:#202631;max-width:560px;padding:48px 24px;margin:auto}button,a{font:inherit}button{padding:12px 20px;background:#223b35;color:white;border:0;border-radius:8px}h1{line-height:1.2}</style><h1>'+escape(title)+'</h1><p>'+escape(body)+'</p><form method="post" action="'+escape(action)+'"><input type="hidden" name="token" value="'+escape(token)+'"><button type="submit">Confirm</button></form><p><a href="/#recruitment-preferences">Return to preferences</a></p></html>',{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff'}});
}
async function requestToken(request,url){
 if(url.searchParams.has('token'))return url.searchParams.get('token');
 if(request.headers.get('content-type')?.includes('application/json'))return (await bodyJson(request)).token;
 const raw=await request.text();if(raw.length>5000)fail(413,'too_large','Verification request is too large.');return new URLSearchParams(raw).get('token');
}
export function isPublicRecruitmentContact(path,method){
 return method==='GET'&&['/api/recruitment/push/config','/recruitment/verify-email','/recruitment/unsubscribe'].includes(path)||method==='POST'&&['/api/recruitment/contact/confirm','/api/recruitment/unsubscribe','/api/recruitment/webhooks/resend','/api/recruitment/webhooks/twilio','/api/recruitment/webhooks/twilio-inbound'].includes(path);
}
export async function verifyResendWebhook(request,raw,secret,{now=Date.now()}={}){
 try{
  const id=request.headers.get('svix-id'),stamp=request.headers.get('svix-timestamp');
  if(!id||id.length>200||!/^\d+$/.test(stamp||'')||Math.abs(now/1000-Number(stamp))>300||!secret?.startsWith('whsec_'))return false;
  const key=await crypto.subtle.importKey('raw',providerBase64(secret.slice(6)),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  for(const signature of (request.headers.get('svix-signature')||'').split(' '))if(signature.startsWith('v1,')&&await crypto.subtle.verify('HMAC',key,providerBase64(signature.slice(3)),encoder.encode(id+'.'+stamp+'.'+raw)))return true;
 }catch{}return false;
}
export async function verifyTwilioWebhook(request,raw,env){
 try{
  const origin=publicOrigin(env),url=new URL(request.url);if(!origin||!env.TWILIO_AUTH_TOKEN)return false;
  const params=new URLSearchParams(raw);let signed=origin+url.pathname+url.search;
  for(const key of [...new Set(params.keys())].sort())for(const value of [...new Set(params.getAll(key))].sort())signed+=key+value;
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.TWILIO_AUTH_TOKEN),{name:'HMAC',hash:'SHA-1'},false,['verify']);
  return await crypto.subtle.verify('HMAC',key,providerBase64(request.headers.get('x-twilio-signature')||''),encoder.encode(signed));
 }catch{return false;}
}

/** Token-scoped confirmation and signed callbacks are the only mutation routes outside account CSRF. */
export async function handleRecruitmentContact({request,url=new URL(request.url),path=url.pathname,db,userId,now=Date.now(),env={},providers={}}){
 if(path==='/api/recruitment/push/config'&&request.method==='GET')return json({configured:!!providers.push?.configured,publicKey:providers.push?.configured?env.VAPID_PUBLIC_KEY:null});
 if(request.method==='GET'&&['/recruitment/verify-email','/recruitment/unsubscribe'].includes(path)){
  const verify=path.endsWith('verify-email');return confirmationPage(verify?'Verify your email':'Turn off email recruitment alerts',verify?'Confirm this recipient for your account. This does not enable alerts.':'Confirm to stop optional recruitment email alerts.',verify?'/api/recruitment/contact/confirm':'/api/recruitment/unsubscribe',url.searchParams.get('token')||'');
 }
 if(!path.startsWith('/api/recruitment/'))return null;
 const recognized=['/api/recruitment/contact/confirm','/api/recruitment/unsubscribe','/api/recruitment/contact/verify','/api/recruitment/contact/check','/api/recruitment/push/subscription','/api/recruitment/webhooks/resend','/api/recruitment/webhooks/twilio','/api/recruitment/webhooks/twilio-inbound'];
 if(!recognized.includes(path))return null;
 if(!db)fail(503,'database_unavailable','Recruitment storage is not configured.');
 if(path==='/api/recruitment/contact/confirm'&&request.method==='POST'){
  const token=await requestToken(request,url);if(typeof token!=='string'||token.length>200)fail(400,'invalid_token','Verification token is invalid.');
  const tokenHash=await hash(token),row=await first(db,"SELECT * FROM recruitment_verification_tokens WHERE token_hash=? AND channel='email' AND used_at IS NULL AND expires_at>?",tokenHash,utc(now));
  if(!row)fail(400,'invalid_token','This verification link has expired or has already been used.');
  const claimed=await run(db,'UPDATE recruitment_verification_tokens SET used_at=? WHERE token_hash=? AND used_at IS NULL',utc(now),tokenHash);if(!claimed.meta.changes)fail(409,'already_used','Verification link was already used.');
  await saveVerifiedRecruitmentContact(db,row.user_id,'email',row.recipient,{now});
  return new Response(null,{status:303,headers:{location:'/#recruitment-preferences','cache-control':'no-store'}});
 }
 if(path==='/api/recruitment/unsubscribe'&&request.method==='POST'){
  const token=await requestToken(request,url),scope=await readScopedToken(token,env.NOTIFICATION_SIGNING_SECRET);
  if(scope?.scope!=='unsubscribe'||scope?.channel!=='email'||scope.version!==1||typeof scope.userId!=='string')fail(400,'invalid_token','Unsubscribe link is invalid.');
  await setRecruitmentConsent(db,scope.userId,'email',false,{now,providers});return json({unsubscribed:true,channel:'email'});
 }
 if(path.startsWith('/api/recruitment/webhooks/')&&request.method==='POST'){
  const raw=await request.text();if(raw.length>100000)fail(413,'too_large','Callback is too large.');
  const resend=path.endsWith('resend'),verified=resend?await verifyResendWebhook(request,raw,env.RESEND_WEBHOOK_SECRET,{now}):await verifyTwilioWebhook(request,raw,env);
  if(!verified)fail(403,'invalid_signature','Callback signature was not verified.');
  if(path.endsWith('twilio-inbound')){
   const form=new URLSearchParams(raw),channel=url.searchParams.get('channel'),messageId=form.get('MessageSid'),recipient=String(form.get('From')||'').replace(/^whatsapp:/,''),stop=form.get('OptOutType')==='STOP'||/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test((form.get('Body')||'').trim());
   if(!['sms','whatsapp'].includes(channel)||!/^SM[a-fA-F0-9]{32}$/.test(messageId||'')||!validPhone(recipient))fail(400,'invalid_input','Invalid inbound callback identifiers.');
   if(stop){
    const eventId=messageId+':optout',fresh="NOT EXISTS(SELECT 1 FROM recruitment_provider_events WHERE provider='twilio' AND event_id=?)",owners='SELECT user_id FROM recruitment_contacts WHERE channel=? AND recipient=?';
    await db.batch([
     db.prepare('UPDATE recruitment_channel_consents SET revoked_at=?,updated_at=? WHERE channel=? AND user_id IN('+owners+') AND '+fresh).bind(utc(now),utc(now),channel,channel,recipient,eventId),
     db.prepare("UPDATE recruitment_preferences SET preferences_json=json_set(preferences_json,?,json('false')),updated_at=? WHERE user_id IN("+owners+') AND '+fresh).bind('$.channels.'+channel,utc(now),channel,recipient,eventId),
     db.prepare("UPDATE recruitment_jobs SET status='cancelled',last_error='recipient_opt_out',updated_at=? WHERE channel=? AND user_id IN("+owners+") AND status IN('queued','retry','blocked','leased') AND "+fresh).bind(utc(now),channel,channel,recipient,eventId),
     db.prepare('INSERT OR IGNORE INTO recruitment_provider_events(provider,event_id,received_at,outcome,provider_message_id,channel) VALUES(?,?,?,?,?,?)').bind('twilio',eventId,utc(now),'recipient_opt_out',messageId,channel)
    ]);
   }
   return new Response('<Response/>',{headers:{'content-type':'application/xml','cache-control':'no-store'}});
  }
  let messageId,eventId,status,channel;
  if(resend){let event;try{event=JSON.parse(raw);}catch{fail(400,'invalid_input','Invalid callback.');}messageId=event.data?.email_id;eventId=request.headers.get('svix-id');status=event.type==='email.delivered'?'delivered':['email.bounced','email.failed','email.complained'].includes(event.type)?'failed':null;channel='email';}
  else{const form=new URLSearchParams(raw);messageId=form.get('MessageSid');const state=form.get('MessageStatus');channel=url.searchParams.get('channel');if(!['sms','whatsapp'].includes(channel)||!/^SM[a-fA-F0-9]{32}$/.test(messageId||''))fail(400,'invalid_input','Invalid callback identifiers.');eventId=messageId+':'+state;status=state==='delivered'||state==='read'?'delivered':['failed','undelivered'].includes(state)?'failed':null;}
  if(typeof eventId!=='string'||eventId.length>200||typeof messageId!=='string'||messageId.length>200)fail(400,'invalid_input','Invalid callback identifiers.');
  const provider=resend?'resend':'twilio',statements=[];
  if(status)statements.push(db.prepare("UPDATE recruitment_jobs SET status=?,last_error=?,updated_at=? WHERE provider_message_id=? AND channel=? AND status='submitted' AND NOT EXISTS(SELECT 1 FROM recruitment_provider_events WHERE provider=? AND event_id=?)").bind(status==='delivered'?'delivered':'dead_letter',status==='failed'?'provider_delivery_failed':null,utc(now),messageId,channel,provider,eventId));
  statements.push(db.prepare('INSERT OR IGNORE INTO recruitment_provider_events(provider,event_id,received_at,outcome,provider_message_id,channel) VALUES(?,?,?,?,?,?)').bind(provider,eventId,utc(now),status||'ignored',messageId,channel));
  const results=await db.batch(statements);return json({received:true,duplicate:!results.at(-1).meta.changes});
 }
 if(!userId)fail(401,'authentication_required','Sign in to manage your recipients.');
 if(path==='/api/recruitment/push/subscription'){
  if(request.method==='POST'){
   if(!providers.push?.configured)fail(503,'provider_unavailable','Web push is not configured.');
   const input=await bodyJson(request);let subscription;try{subscription=await validatePushSubscription(input.subscription);}catch{fail(400,'invalid_input','Invalid web push subscription.');}
   await saveVerifiedRecruitmentContact(db,userId,'push',JSON.stringify(subscription),{now});return json({verified:true,consented:false});
  }
  if(request.method==='DELETE'){await setRecruitmentConsent(db,userId,'push',false,{now,providers});await run(db,"DELETE FROM recruitment_contacts WHERE user_id=? AND channel='push'",userId);return json({removed:true});}
 }
 if(path==='/api/recruitment/contact/verify'&&request.method==='POST'){
  const {channel,recipient}=await bodyJson(request);
  if(!['email','sms','whatsapp'].includes(channel)||!(channel==='email'?validEmail(recipient):validPhone(recipient)))fail(400,'invalid_input','Enter a valid email or international phone number.');
  if(!providers[channel]?.configured)fail(503,'provider_unavailable','The chosen delivery provider is not configured.');
  const recent=await first(db,'SELECT COUNT(*) AS n FROM recruitment_verification_tokens WHERE user_id=? AND channel=? AND created_at>?',userId,channel,utc(now-3600000));if(recent.n>=5)fail(429,'rate_limited','Wait before requesting another recipient verification.');
  const token=random(),tokenHash=await hash(token),origin=publicOrigin(env);if(!origin)fail(503,'provider_unavailable','The public verification origin is not configured.');
  await run(db,'INSERT INTO recruitment_verification_tokens(token_hash,user_id,channel,recipient,expires_at,created_at) VALUES(?,?,?,?,?,?)',tokenHash,userId,channel,recipient,utc(now+30*60000),utc(now));
  const result=channel==='email'?await providers.sendVerificationEmail(recipient,origin+'/recruitment/verify-email?token='+encodeURIComponent(token),'verify:'+tokenHash):await providers.requestPhoneVerification(channel,recipient);
  if(result.status!=='accepted'){await run(db,'UPDATE recruitment_verification_tokens SET used_at=? WHERE token_hash=?',utc(now),tokenHash);fail(503,'verification_unavailable','The verification provider did not accept this request.');}
  return json({accepted:true,message:channel==='email'?'A verification link was submitted to the email provider. Alerts remain off.':'A verification code was requested. Verify it, then enable the channel separately.'});
 }
 if(path==='/api/recruitment/contact/check'&&request.method==='POST'){
  const {channel,recipient,code}=await bodyJson(request);if(!['sms','whatsapp'].includes(channel)||!validPhone(recipient)||!/^\d{4,10}$/.test(code||''))fail(400,'invalid_input','Enter a valid recipient and verification code.');
  const pending=await first(db,'SELECT token_hash FROM recruitment_verification_tokens WHERE user_id=? AND channel=? AND recipient=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1',userId,channel,recipient,utc(now));if(!pending)fail(400,'verification_required','Request a new code for this recipient first.');
  const result=await providers.requestPhoneVerification(channel,recipient,code);if(result.status!=='verified')fail(400,'verification_failed','The code could not be verified.');
  await run(db,'UPDATE recruitment_verification_tokens SET used_at=? WHERE token_hash=?',utc(now),pending.token_hash);await saveVerifiedRecruitmentContact(db,userId,channel,recipient,{now});return json({verified:true,consented:false});
 }
 fail(405,'method_not_allowed','Unsupported recruitment contact operation.');
}
