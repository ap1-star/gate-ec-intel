import {encryptPush,vapidAuthorization,base64url,decode64} from './recruitment-push.mjs';
const encode=new TextEncoder();
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const present=value=>typeof value==='string'&&value.trim().length>0;
export const validEmail=value=>typeof value==='string'&&value.length<=254&&!/[\r\n]/.test(value)&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
export const validPhone=value=>typeof value==='string'&&/^\+[1-9]\d{7,14}$/.test(value);
const sid=(value,prefix)=>typeof value==='string'&&new RegExp('^'+prefix+'[a-fA-F0-9]{32}$').test(value);
export function publicOrigin(env){try{const u=new URL(env.PUBLIC_ORIGIN);return u.protocol==='https:'&&!u.username&&!u.password?u.origin:null;}catch{return null;}}
export async function signScopedToken(value,secret){
 if(!present(secret)||secret.length<32)throw Error('Notification signing secret is not configured.');
 const body=base64url(encode.encode(JSON.stringify(value))),key=await crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return body+'.'+base64url(await crypto.subtle.sign('HMAC',key,encode.encode(body)));
}
export async function readScopedToken(token,secret){
 try{if(!present(secret)||secret.length<32||typeof token!=='string'||token.length>3000)return null;const [body,signature,...extra]=token.split('.');if(extra.length)return null;const key=await crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('HMAC',key,decode64(signature),encode.encode(body)))return null;return JSON.parse(new TextDecoder().decode(decode64(body)));}catch{return null;}
}
function secureLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function notificationEmail(payload,{unsubscribeUrl=null}={}){
 const items=Array.isArray(payload.items)?payload.items.slice(0,50):[payload];
 const title=String(payload.title||'Technical recruitment update').slice(0,180);
 const rows=items.map(item=>{const url=secureLink(item.officialUrl),deadline=item.deadlineAt&&Number.isFinite(Date.parse(item.deadlineAt))?new Date(item.deadlineAt).toISOString():null;return {title:String(item.title||title),body:String(item.body||''),url,deadline};});
 const text=rows.map(row=>row.title+'\n'+row.body+(row.deadline?'\nOfficial deadline: '+row.deadline:'')+(row.url?'\nOfficial notice: '+row.url:'')).join('\n\n')+(unsubscribeUrl?'\n\nUnsubscribe: '+unsubscribeUrl:'');
 const html='<div style="font:15px/1.7 Arial,sans-serif;max-width:620px;margin:auto;color:#25282d"><p>GATE EC · Technical Career Intelligence</p><h1 style="font-size:24px">'+escape(title)+'</h1>'+rows.map(row=>'<section style="padding:16px 0;border-top:1px solid #ddd"><h2 style="font-size:18px">'+escape(row.title)+'</h2><p>'+escape(row.body)+'</p>'+(row.deadline?'<p>Official deadline (UTC): '+escape(row.deadline)+'</p>':'')+(row.url?'<a href="'+escape(row.url)+'">Read the official notice</a>':'')+'</section>').join('')+'<p>Check the exact post and published eligibility criteria before applying.</p>'+(unsubscribeUrl?'<p><a href="'+escape(unsubscribeUrl)+'">Unsubscribe from optional email alerts</a></p>':'')+'</div>';
 return {subject:title,text,html};
}
export function createRecruitmentProviders(env={}, {fetch:send=globalThis.fetch,now=()=>Date.now()}={}){
 const origin=publicOrigin(env),sender=String(env.RECRUITMENT_EMAIL_FROM||''),senderAddress=sender.match(/<([^>]+)>/)?.[1]||sender;
 const twilio=sid(env.TWILIO_ACCOUNT_SID,'AC')&&present(env.TWILIO_AUTH_TOKEN),verify=twilio&&sid(env.TWILIO_VERIFY_SERVICE_SID,'VA');
 const configured={
  in_app:{configured:true},
  email:{configured:!!origin&&validEmail(senderAddress)&&present(env.RESEND_API_KEY)&&env.EMAIL_SENDER_VERIFIED==='true'&&present(env.NOTIFICATION_SIGNING_SECRET),supportsIdempotency:true,idempotencyWindowMs:24*3600000},
  push:{configured:present(env.VAPID_PUBLIC_KEY)&&present(env.VAPID_PRIVATE_KEY)&&present(env.VAPID_SUBJECT)},
  whatsapp:{configured:twilio&&present(env.TWILIO_WHATSAPP_FROM)&&sid(env.TWILIO_WHATSAPP_CONTENT_SID,'HX')&&env.WHATSAPP_TEMPLATE_APPROVED==='true'},
  sms:{configured:twilio&&sid(env.TWILIO_SMS_MESSAGING_SERVICE_SID,'MG')&&sid(env.TWILIO_SMS_CONTENT_SID,'HX')&&env.SMS_DLT_APPROVED==='true'}
 };
 const blocked=code=>({status:'blocked',code});
 const basic=()=> 'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN);
 async function resend(recipient,mail,idempotencyKey,headers={}){
  if(!configured.email.configured)return blocked('email_provider_not_configured');
  if(!validEmail(recipient))return {status:'permanent_failure',code:'invalid_email'};
  try{
   const response=await send('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:sender,to:[recipient],...mail,...(Object.keys(headers).length?{headers}:{})})});
   if(response.ok){const value=await response.json();return value.id?{status:'accepted',providerMessageId:value.id}:{status:'ambiguous',code:'email_response_missing_id'};}
   return {status:response.status===429||response.status>=500?'retryable_failure':'permanent_failure',code:'email_http_'+response.status};
  }catch{return {status:'retryable_failure',code:'email_transport_error'};}
 }
 async function sendNotification(input){
  const {channel,recipient,payload,idempotencyKey,userId}=input;
  if(!configured[channel]?.configured)return blocked(channel+'_provider_not_configured');
  if(channel==='email'){
   if(!userId)return blocked('email_unsubscribe_scope_missing');
   const token=await signScopedToken({scope:'unsubscribe',userId,channel:'email',version:1},env.NOTIFICATION_SIGNING_SECRET),unsubscribeUrl=origin+'/recruitment/unsubscribe?token='+encodeURIComponent(token);
   return resend(recipient,notificationEmail(payload,{unsubscribeUrl}),idempotencyKey,{'List-Unsubscribe':'<'+origin+'/api/recruitment/unsubscribe?token='+encodeURIComponent(token)+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'});
  }
  if(channel==='push'){
   try{
    const subscription=JSON.parse(recipient),body=await encryptPush(subscription,{title:String(payload.title||'Technical recruitment update').slice(0,150),body:String(payload.body||'').slice(0,600),url:origin+'/#recruitment-detail?noticeId='+encodeURIComponent(payload.noticeId||''),officialUrl:secureLink(payload.officialUrl),tag:idempotencyKey}),authorization=await vapidAuthorization(subscription.endpoint,{publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT,now:now()});
    const response=await send(subscription.endpoint,{method:'POST',redirect:'error',headers:{authorization,'content-encoding':'aes128gcm','content-type':'application/octet-stream',TTL:'86400',Urgency:'normal',Topic:base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(idempotencyKey)))).slice(0,32)},body,signal:AbortSignal.timeout(15000)});
    if(response.ok)return {status:'accepted',providerMessageId:response.headers.get('location')||idempotencyKey};
    return {status:response.status===404||response.status===410?'permanent_failure':response.status===429||response.status>=500?'retryable_failure':'permanent_failure',code:response.status===404||response.status===410?'subscription_gone':'push_http_'+response.status};
   }catch{return {status:'ambiguous',code:'push_transport_or_subscription_error'};}
  }
  if(channel==='sms'||channel==='whatsapp'){
   if(!validPhone(recipient))return {status:'permanent_failure',code:'invalid_mobile_number'};
   const contentSid=channel==='sms'?env.TWILIO_SMS_CONTENT_SID:env.TWILIO_WHATSAPP_CONTENT_SID;
   const form=new URLSearchParams({To:(channel==='whatsapp'?'whatsapp:':'')+recipient,ContentSid:contentSid,ContentVariables:JSON.stringify({'1':String(payload.title||'Technical recruitment update').slice(0,180),'2':String(payload.deadlineAt||'See official notice'),'3':secureLink(payload.officialUrl)||origin})});
   if(channel==='sms')form.set('MessagingServiceSid',env.TWILIO_SMS_MESSAGING_SERVICE_SID);else form.set('From',env.TWILIO_WHATSAPP_FROM);
   if(origin)form.set('StatusCallback',origin+'/api/recruitment/webhooks/twilio?channel='+channel);
   try{
    const response=await send('https://api.twilio.com/2010-04-01/Accounts/'+env.TWILIO_ACCOUNT_SID+'/Messages.json',{method:'POST',redirect:'error',headers:{authorization:basic(),'content-type':'application/x-www-form-urlencoded'},body:form.toString(),signal:AbortSignal.timeout(15000)});
    if(response.ok){const value=await response.json();return value.sid?{status:'accepted',providerMessageId:value.sid}:{status:'ambiguous',code:'message_response_missing_id'};}
    return {status:response.status===429?'retryable_failure':response.status>=500?'ambiguous':'permanent_failure',code:'message_http_'+response.status};
   }catch{return {status:'ambiguous',code:'message_transport_error'};}
  }
  return blocked('unsupported_external_channel');
 }
 async function requestPhoneVerification(channel,recipient,code){
  if(!verify||!configured[channel]?.configured)return blocked('mobile_verification_provider_not_configured');
  if(!['sms','whatsapp'].includes(channel)||!validPhone(recipient)||code!==undefined&&!/^\d{4,10}$/.test(code))return {status:'permanent_failure',code:'invalid_verification_input'};
  const form=new URLSearchParams({To:recipient,...(code===undefined?{Channel:channel}:{Code:code})});
  try{const response=await send('https://verify.twilio.com/v2/Services/'+env.TWILIO_VERIFY_SERVICE_SID+'/'+(code===undefined?'Verifications':'VerificationCheck'),{method:'POST',redirect:'error',headers:{authorization:basic(),'content-type':'application/x-www-form-urlencoded'},body:form.toString(),signal:AbortSignal.timeout(15000)});if(!response.ok)return {status:'permanent_failure',code:'verification_http_'+response.status};const value=await response.json();return {status:value.status==='approved'?'verified':'accepted',providerMessageId:value.sid};}catch{return {status:'ambiguous',code:'verification_transport_error'};}
 }
 return {...configured,send:sendNotification,sendVerificationEmail:(recipient,url,key)=>resend(recipient,{subject:'Verify your recruitment alert email',text:'You requested email verification for GATE EC Technical Career Intelligence. Confirm within 30 minutes: '+url,html:'<p>You requested email verification for GATE EC Technical Career Intelligence.</p><p><a href="'+escape(url)+'">Verify your email</a></p><p>This link expires in 30 minutes. Verification does not subscribe you to alerts.</p>'},key),requestPhoneVerification};
}
