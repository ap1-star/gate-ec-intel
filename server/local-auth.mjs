/** Local-development credential adapter only. Never bundled into the Sites Worker. */
import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHmac,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {ApiError,all,first,run,text,cookies,fail,id} from './validation.mjs';
const scrypt=promisify(scryptCallback);
const COOKIE='gate_dev_session';
export function createLocalAuth({db,secret,ownerUsername=null}){
 if(typeof secret!=='string'||secret.length<32)throw new Error('Local development auth requires a persistent random secret.');
 const sign=token=>createHmac('sha256',secret).update(token).digest('hex');
 const hash=token=>createHash('sha256').update(token).digest('hex');
 function cookie(value,{maxAge=604800,secure=false}={}){return COOKIE+'='+value+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(secure?'; Secure':'');}
 function tokenFrom(request){const value=cookies(request)[COOKIE];if(!value||!/^([a-f0-9]{64})\.([a-f0-9]{64})$/.test(value))return null;const [token,signature]=value.split('.');if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(token),'hex')))return null;return token;}
 async function newSession(user,now,secure){const token=randomBytes(32).toString('hex'),csrfToken=randomBytes(32).toString('hex');await run(db,'INSERT INTO dev_sessions(token_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,?)',hash(token),user.id,csrfToken,new Date(now+7*864e5).toISOString());return {data:{user:{id:user.id,displayName:user.display_name,development:true},csrfToken},cookie:cookie(token+'.'+sign(token),{secure})};}
 function credentials(input){const username=text(input.username,'Username',{min:3,max:64}).toLowerCase();if(!/^[a-z0-9][a-z0-9._@-]*$/.test(username))fail(400,'invalid_input','Use a username with letters, numbers, dot, dash or underscore.');const password=text(input.password,'Password',{min:12,max:128});return {username,password};}
 return {
  mode:'development',
  async register(input,now=Date.now(),secure=false){
   const {username,password}=credentials(input),displayName=text(input.displayName||(username.includes('@')?'Candidate':username),'Display name',{min:1,max:80});
   if(await first(db,'SELECT user_id FROM dev_credentials WHERE username=?',username))fail(409,'account_exists','That development username is already registered.');
   const salt=randomBytes(16).toString('hex'),passwordHash=Buffer.from(await scrypt(password,salt,32)).toString('hex'),user={id:id(),display_name:displayName};
   try{await db.batch([db.prepare('INSERT INTO users(id,display_name,created_at,last_seen_at) VALUES(?,?,?,?)').bind(user.id,displayName,new Date(now).toISOString(),new Date(now).toISOString()),db.prepare('INSERT INTO dev_credentials(username,user_id,salt,password_hash) VALUES(?,?,?,?)').bind(username,user.id,salt,passwordHash)]);}catch{fail(409,'account_exists','That development username is already registered.');}
   return newSession(user,now,secure);
  },
  async login(input,now=Date.now(),secure=false){
   const {username,password}=credentials(input),row=await first(db,'SELECT c.*,u.display_name FROM dev_credentials c JOIN users u ON u.id=c.user_id WHERE c.username=?',username);
   const actual=Buffer.from(await scrypt(password,row?.salt||'unknown-development-account',32));
   const expected=Buffer.from(row?.password_hash||'0'.repeat(64),'hex');
   if(!row||!timingSafeEqual(actual,expected))fail(401,'invalid_credentials','Development username or password is incorrect.');
   return newSession({id:row.user_id,display_name:row.display_name},now,secure);
  },
  async resolve(request,now=Date.now()){
   const token=tokenFrom(request);if(!token)return null;
   const row=await first(db,'SELECT s.user_id,s.csrf_token,s.expires_at,u.display_name,c.username FROM dev_sessions s JOIN users u ON u.id=s.user_id JOIN dev_credentials c ON c.user_id=u.id WHERE s.token_hash=?',hash(token));
   if(!row||Date.parse(row.expires_at)<=now)return null;
   return {user:{id:row.user_id,displayName:row.display_name,isOwner:!!ownerUsername&&row.username===ownerUsername.toLowerCase(),development:true},csrfToken:row.csrf_token};
  },
  async logout(request){const token=tokenFrom(request);if(token)await run(db,'DELETE FROM dev_sessions WHERE token_hash=?',hash(token));return {cookie:cookie('',{maxAge:0}),data:{signedOut:true}};}
 };
}
