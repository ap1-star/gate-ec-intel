/** Development server: actual SQLite persistence, optional loopback-only development credentials. */
import http from 'node:http';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {openSqliteDatabase} from '../server/sqlite.mjs';
import {createLocalAuth} from '../server/local-auth.mjs';
import {createApi} from '../server/api.mjs';
import {runDueReminders} from '../server/reminders.mjs';
import {predictRank,CAREER_DATA_VERSION} from '../src/domains/career/index.mjs';
import {ORGANIZATIONS,TECHNICAL_PATHWAYS,RECRUITMENT_SOURCES,RECRUITMENT_NOTICES,evaluateTechnicalEligibility} from '../src/domains/recruitment/index.mjs';
import {bootstrapRecruitmentCatalogue} from '../server/recruitment-store.mjs';
import {runRecruitmentSourceChecks} from '../server/recruitment-monitor.mjs';
import {processRecruitmentEvents,scheduleRecruitmentReminders,runNotificationJobs} from '../server/recruitment-queue.mjs';
const args=process.argv.slice(2),value=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1]};
const root=resolve(import.meta.dirname,'..'),port=Number(value('--port','8802')),database=resolve(root,value('--db','.openai/cache/part2-dev.sqlite')),development=args.includes('--dev-auth'),scheduler=args.includes('--scheduler'),ownerUsername=value('--owner',null);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Use a port from 1024 to 65535.');
const db=await openSqliteDatabase(database);
const recruitmentCatalogue={organizations:ORGANIZATIONS,examinations:TECHNICAL_PATHWAYS,pathways:TECHNICAL_PATHWAYS,sources:RECRUITMENT_SOURCES,notices:RECRUITMENT_NOTICES};
await bootstrapRecruitmentCatalogue(db,recruitmentCatalogue);
const catalogue=JSON.parse(await readFile(resolve(root,'src/domains/pyq/catalogue.json'),'utf8'));
let secret;
if(development){try{secret=await readFile(database+'.secret','utf8')}catch{secret=randomBytes(48).toString('hex');await writeFile(database+'.secret',secret,{mode:0o600});}}
const localAuth=development?createLocalAuth({db,secret,ownerUsername}):null;
const api=createApi({db,authMode:development?'development':'unavailable',localAuth,schedulerActive:scheduler,recruitmentCatalogue,evaluateTechnicalEligibility,questionIds:catalogue.questionIds,paperIds:catalogue.papers.map(p=>p.id),subjects:catalogue.subjects,topicsBySubject:catalogue.topicsBySubject,predictRank,careerDataVersion:CAREER_DATA_VERSION,clientKey:()=> 'loopback',log:entry=>process.stderr.write(JSON.stringify(entry)+'\n')});
const dist=resolve(root,'dist');
const mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(incoming,outgoing)=>{
 try{
  const url=new URL(incoming.url,'http://127.0.0.1:'+port);
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/recruitment/')){
   let size=0,chunks=[];for await(const chunk of incoming){size+=chunk.length;if(size>65536){outgoing.writeHead(413,{'content-type':'application/json'});outgoing.end(JSON.stringify({status:'error',code:'too_large',message:'Request is too large.'}));return;}chunks.push(chunk);}
   const request=new Request(url,{method:incoming.method,headers:incoming.headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Buffer.concat(chunks)}:{})});
   const response=await api(request);outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(incoming.method)){outgoing.writeHead(405);outgoing.end();return;}
  let requested;try{requested=decodeURIComponent(url.pathname)}catch{outgoing.writeHead(400);outgoing.end();return;}
  let file=resolve(dist,'.'+requested);if(file!==dist&&!file.startsWith(dist+String.fromCharCode(92))&&!file.startsWith(dist+'/')){outgoing.writeHead(403);outgoing.end();return;}
  try{const info=await stat(file);if(info.isDirectory())file=resolve(file,'index.html');}catch{if(!extname(requested))file=resolve(dist,'index.html');else{outgoing.writeHead(404);outgoing.end();return;}}
  const content=await readFile(file);outgoing.writeHead(200,{'content-type':mimes[extname(file)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});outgoing.end(incoming.method==='HEAD'?undefined:content);
 }catch{outgoing.writeHead(500,{'content-type':'application/json'});outgoing.end(JSON.stringify({status:'error',code:'server_error',message:'The local server could not complete this request.'}));}
});
let timer;
if(scheduler){let running=false;const tick=async()=>{if(running)return;running=true;try{await runDueReminders(db)}catch{process.stderr.write('Reminder runner failed; no successful delivery is claimed.\n')}finally{running=false}};timer=setInterval(tick,30000);await tick();}
server.listen(port,'127.0.0.1',()=>{console.log('Local: http://127.0.0.1:'+port);console.log('SQLite: '+database);console.log('Authentication: '+(development?'development credentials (loopback only)':'unavailable; use --dev-auth for local credential testing'));console.log('Reminder runner: '+(scheduler?'active in this Node process; stops with the server':'not configured; reminders remain saved records'));});
function close(){if(timer)clearInterval(timer);server.close(()=>{db.close();process.exit(0)});}
process.on('SIGINT',close);process.on('SIGTERM',close);
