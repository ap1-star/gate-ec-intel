/** Portable website credentials. This adapter never trusts Sites identity headers. */
import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHmac,createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {promisify} from 'node:util';
import {first,run,text,cookies,fail,id} from './validation.mjs';

const scrypt=promisify(scryptCallback);
const COOKIE='gate_session';
const SESSION_SECONDS=7*86400;

export function createCredentialAuth({db,secret,ownerUserId=null,requireEmailRegistration=true}){
 if(!db)throw Error('Credential authentication requires persistent SQL storage.');
 if(typeof secret!=='string'||secret.length<32)throw Error('Set a persistent random SESSION_SECRET of at least 32 characters.');
 if(ownerUserId!==null&&(typeof ownerUserId!=='string'||!ownerUserId.trim()||ownerUserId.length>200))throw Error('OWNER_USER_ID must be the exact stored website user ID.');
 const ownerId=ownerUserId?.trim()||null;
 const sign=token=>createHmac('sha256',secret).update(token).digest('hex');
 const hash=token=>createHash('sha256').update(token).digest('hex');
 const cookie=(value,maxAge=SESSION_SECONDS)=>COOKIE+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+maxAge;
 const preference=value=>'gate_auth_method='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+SESSION_SECONDS;
 const user=value=>({id:value.id,displayName:value.display_name,isOwner:!!ownerId&&value.id===ownerId,development:false,authProvider:'credentials'});

 function tokenFrom(request){
  const value=cookies(request)[COOKIE];
  if(!value||!/^([a-f0-9]{64})\.([a-f0-9]{64})$/.test(value))return null;
  const [token,signature]=value.split('.');
  return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(token),'hex'))?token:null;
 }
 function normalizedEmail(value){
  const email=text(value,'Email address',{min:3,max:254}).toLowerCase();
  const parts=email.split('@'),local=parts[0],labels=parts[1]?.split('.');
  if(parts.length!==2||local.length>64||!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+$/.test(local)||local.startsWith('.')||local.endsWith('.')||local.includes('..')||!labels||labels.length<2||labels.some(label=>!label||label.length>63||! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)))fail(400,'invalid_input','Enter a valid email address.');
  return email;
 }
 function credentials(input,{registration=false}={}){
  let username;
  if(registration&&requireEmailRegistration||input.email!==undefined)username=normalizedEmail(input.email);
  else{
   username=text(input.username,'Email or username',{min:3,max:254}).toLowerCase();
   // Legacy usernames remain valid. Email accounts allow plus-addresses and
   // longer identifiers without changing the original account's stored ID.
   if(username.includes('@')&&username.split('@')[1]?.includes('.'))username=normalizedEmail(username);
   else if(username.length>64||!/^[a-z0-9][a-z0-9._@-]*$/.test(username))fail(400,'invalid_input','Enter your email address or existing username.');
  }
  const password=input.password;
  if(typeof password!=='string'||password.trim().length<12||password.length>128||/[\u0000-\u001f]/.test(password))fail(400,'invalid_input','Use a password of 12–128 characters.');
  return {username,password};
 }
 async function newSession(value,now){
  const token=randomBytes(32).toString('hex'),csrfToken=randomBytes(32).toString('hex');
  await run(db,'INSERT INTO dev_sessions(token_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,?)',hash(token),value.id,csrfToken,new Date(now+SESSION_SECONDS*1000).toISOString());
  return {data:{user:user(value),csrfToken},cookie:cookie(token+'.'+sign(token)),preferenceCookie:preference('credentials')};
 }
 return {
  mode:'credentials',
  // Match credential normalization without storing usernames in the API limiter.
  // Network forwarding headers are deliberately unrelated to this identity.
  accountRateLimitKey(input){
   const identifier=input?.email??input?.username,username=typeof identifier==='string'?identifier.trim().toLowerCase():'';
   return createHmac('sha256',secret).update('auth-account:'+username).digest('hex');
  },
  async register(input,now=Date.now()){
   const {username,password}=credentials(input,{registration:true}),displayName=text(input.displayName||(username.includes('@')?'Candidate':username),'Display name',{min:1,max:80});
   if(await first(db,'SELECT user_id FROM dev_credentials WHERE username=?',username))fail(409,'account_exists','That email or username is already registered.');
   const salt=randomBytes(16).toString('hex'),passwordHash=Buffer.from(await scrypt(password,salt,32)).toString('hex'),value={id:id(),display_name:displayName};
   try{
    await db.batch([
     db.prepare('INSERT INTO users(id,display_name,created_at,last_seen_at) VALUES(?,?,?,?)').bind(value.id,displayName,new Date(now).toISOString(),new Date(now).toISOString()),
     db.prepare('INSERT INTO dev_credentials(username,user_id,salt,password_hash) VALUES(?,?,?,?)').bind(username,value.id,salt,passwordHash)
    ]);
   }catch(error){
    if(/UNIQUE constraint failed: dev_credentials\.(username|user_id)/i.test(String(error?.message)))fail(409,'account_exists','That email or username is already registered.');
    throw error;
   }
   return newSession(value,now);
  },
  async login(input,now=Date.now()){
   const {username,password}=credentials(input),row=await first(db,'SELECT c.*,u.display_name FROM dev_credentials c JOIN users u ON u.id=c.user_id WHERE c.username=?',username);
   const actual=Buffer.from(await scrypt(password,row?.salt||'unknown-website-account',32)),expected=Buffer.from(row?.password_hash||'0'.repeat(64),'hex');
   if(!row||!timingSafeEqual(actual,expected))fail(401,'invalid_credentials','Email, username or password is incorrect.');
   return newSession({id:row.user_id,display_name:row.display_name},now);
  },
  async resolve(request,now=Date.now()){
   const token=tokenFrom(request);if(!token)return null;
   const row=await first(db,'SELECT s.user_id,s.csrf_token,s.expires_at,u.display_name FROM dev_sessions s JOIN users u ON u.id=s.user_id JOIN dev_credentials c ON c.user_id=u.id WHERE s.token_hash=?',hash(token));
   if(!row||Date.parse(row.expires_at)<=now)return null;
   return {user:user({id:row.user_id,display_name:row.display_name}),csrfToken:row.csrf_token};
  },
  async logout(request){
   const token=tokenFrom(request);if(token)await run(db,'DELETE FROM dev_sessions WHERE token_hash=?',hash(token));
   return {cookie:cookie('',0),preferenceCookie:preference('guest'),data:{signedOut:true}};
  }
 };
}
