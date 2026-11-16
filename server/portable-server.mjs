/** Independent Node deployment. No Sites identity headers or Sites runtime bindings are trusted. */
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openSqliteDatabase} from './sqlite.mjs';
import {createCredentialAuth} from './credential-auth.mjs';
import {createApi} from './api.mjs';
import {createHostedWorker} from './hosted-worker.mjs';
import {bootstrapRecruitmentCatalogue} from './recruitment-store.mjs';
import {predictRank,CAREER_DATA_VERSION} from '../src/domains/career/index.mjs';
import {ORGANIZATIONS,RECRUITING_BODIES,RECRUITMENT_CYCLES,TECHNICAL_PATHWAYS,RECRUITMENT_SOURCES,RECRUITMENT_NOTICES,evaluateTechnicalEligibility} from '../src/domains/recruitment/index.mjs';

const root=resolve(import.meta.dirname,'..');
export function canonicalOrigin(value,{allowLoopback=false}={}){
 let url;try{url=new URL(value);}catch{throw Error('Set PUBLIC_ORIGIN to the exact public HTTPS website origin.');}
 if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||allowLoopback&&url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw Error('PUBLIC_ORIGIN must be an HTTPS origin without a path, query or credentials.');
 return url.origin;
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.jpg':'image/jpeg','.png':'image/png'};
export async function createPortableServer({env=process.env,db:providedDb,publicDir=resolve(root,'public'),allowLoopback=false}={}){
 const configuredOrigin=env.PUBLIC_ORIGIN || (env.RENDER==='true' ? env.RENDER_EXTERNAL_URL : undefined);
 const origin=canonicalOrigin(configuredOrigin,{allowLoopback}),secret=env.SESSION_SECRET;
 if(typeof secret!=='string'||secret.length<48)throw Error('Set a persistent random SESSION_SECRET with at least 48 characters.');
 const db=providedDb||await openSqliteDatabase(resolve(env.SQLITE_PATH||'.data/workspace.sqlite'));
 const research=JSON.parse(await readFile(resolve(root,'src/domains/pyq/catalogue.json'),'utf8'));
 const catalogue={organizations:ORGANIZATIONS,recruitingBodies:RECRUITING_BODIES,cycles:RECRUITMENT_CYCLES,examinations:TECHNICAL_PATHWAYS,pathways:TECHNICAL_PATHWAYS,sources:RECRUITMENT_SOURCES,notices:RECRUITMENT_NOTICES};
 await bootstrapRecruitmentCatalogue(db,catalogue);
 const runtime={...env,PUBLIC_ORIGIN:origin,DB:db,SCHEDULER_ACTIVE:'false'},clientKeys=new WeakMap();
 const options={db,authMode:'credentials',credentialAuth:createCredentialAuth({db,secret,ownerUserId:env.OWNER_USER_ID||null}),schedulerActive:false,...research,predictRank,careerDataVersion:CAREER_DATA_VERSION,evaluateTechnicalEligibility,recruitmentCatalogue:catalogue,clientKey:request=>clientKeys.get(request)||'shared',log:entry=>console.error(JSON.stringify(entry))};
 const api=createApi(options),runner=createHostedWorker({catalogue,evaluateTechnicalEligibility});
 let timer=null,inFlight=null,stopping=false;
 function tick(){
  if(stopping||inFlight)return inFlight;
  inFlight=runner.tick(runtime).then(result=>{console.log(JSON.stringify({event:'recruitment_phase',status:result.status,phase:result.phase}));return result;}).catch(()=>{console.error(JSON.stringify({event:'recruitment_phase_failed'}));}).finally(()=>{inFlight=null;});return inFlight;
 }
 function startScheduler(){
  if(timer||env.RUN_SCHEDULER==='false')return;
  const interval=Math.max(60000,Math.min(3600000,Number(env.SCHEDULER_INTERVAL_MS)||60000));
  timer=setInterval(tick,interval);options.schedulerActive=true;runtime.SCHEDULER_ACTIVE='true';void tick();
 }
 const server=http.createServer(async(incoming,outgoing)=>{
  try{
   const address=incoming.url||'/';if(!address.startsWith('/')||address.startsWith('//')){outgoing.writeHead(400);outgoing.end();return;}
   const url=new URL(address,origin);
   if(url.origin!==origin){outgoing.writeHead(400);outgoing.end();return;}
   if(url.pathname==='/healthz'){await db.prepare('SELECT 1 AS ok').first();outgoing.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});outgoing.end(JSON.stringify({status:'ok',database:true,scheduler:!!timer}));return;}
   if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/recruitment/')){
    let length=0;const chunks=[];for await(const chunk of incoming){length+=chunk.length;if(length>100000){outgoing.writeHead(413,{'content-type':'application/json'});outgoing.end(JSON.stringify({status:'error',code:'too_large',message:'Request is too large.'}));return;}chunks.push(chunk);}
    const headers=new Headers();for(const [key,value] of Object.entries(incoming.headers)){if(!key.startsWith('oai-')&&key!=='host'&&key!=='connection'&&value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);}
    const request=new Request(url,{method:incoming.method,headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Buffer.concat(chunks)}:{})});clientKeys.set(request,incoming.socket.remoteAddress||'shared');
    const response=await api(request,runtime),responseHeaders=Object.fromEntries(response.headers),setCookies=response.headers.getSetCookie?.();
    if(setCookies?.length)responseHeaders['set-cookie']=setCookies;
    outgoing.writeHead(response.status,responseHeaders);outgoing.end(Buffer.from(await response.arrayBuffer()));return;
   }
   if(!['GET','HEAD'].includes(incoming.method)){outgoing.writeHead(405);outgoing.end();return;}
   let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{outgoing.writeHead(400);outgoing.end();return;}
   if(pathname.includes('\\')||pathname.includes('\0')){outgoing.writeHead(400);outgoing.end();return;}
   let file=resolve(publicDir,'.'+pathname);if(file!==publicDir&&!file.startsWith(publicDir+sep)){outgoing.writeHead(403);outgoing.end();return;}
   try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');}catch{if(!extname(pathname))file=resolve(publicDir,'index.html');else{outgoing.writeHead(404);outgoing.end();return;}}
   const body=await readFile(file);outgoing.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff',...(pathname==='/recruitment-sw.js'?{'service-worker-allowed':'/'}:{})});outgoing.end(incoming.method==='HEAD'?undefined:body);
  }catch{if(!outgoing.headersSent)outgoing.writeHead(500,{'content-type':'application/json'});outgoing.end(JSON.stringify({status:'error',code:'service_unavailable',message:'The service could not complete the request.'}));}
 });
 return {server,db,startScheduler,tick,async close(){stopping=true;if(timer)clearInterval(timer);await inFlight;await new Promise(resolve=>server.listening?server.close(resolve):resolve());if(!providedDb)db.close();}};
}
async function main(){
 const port=Number(process.env.PORT||8080);if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be 1–65535.');
 const app=await createPortableServer();app.server.listen(port,'0.0.0.0',()=>{app.startScheduler();console.log('Website listening on port '+port);});
 let closing=false;async function close(){if(closing)return;closing=true;const timeout=setTimeout(()=>process.exit(1),30000);timeout.unref();await app.close();clearTimeout(timeout);process.exit(0);}process.on('SIGTERM',close);process.on('SIGINT',close);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error.message);process.exitCode=1;});
