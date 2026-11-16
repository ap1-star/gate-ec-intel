import {createApi} from './api.mjs';
import {bootstrapRecruitmentCatalogue} from './recruitment-store.mjs';
import {runRecruitmentSourceChecks} from './recruitment-monitor.mjs';
import {runRecruitmentNotificationPhase} from './recruitment-queue.mjs';
import {createRecruitmentProviders} from './recruitment-providers.mjs';
import {runDueReminders} from './reminders.mjs';
import {run,first,id} from './validation.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export function createHostedWorker({assets={},catalogue={},research={},predictRank,evaluateTechnicalEligibility,careerDataVersion,fetch:fetcher=globalThis.fetch}={}){
 const boots=new WeakMap();
 const apis=new WeakMap();let unboundApi;
 const makeApi=()=>createApi({authMode:'sites',...research,predictRank,careerDataVersion,evaluateTechnicalEligibility,recruitmentCatalogue:catalogue,recruitmentProviderFactory:env=>createRecruitmentProviders(env,{fetch:fetcher})});
 function apiFor(env){if(!env.DB)return unboundApi||=makeApi();if(!apis.has(env.DB))apis.set(env.DB,makeApi());return apis.get(env.DB);}
 async function boot(env){
  if(!env.DB)return;
  if(!boots.has(env.DB)){const task=bootstrapRecruitmentCatalogue(env.DB,catalogue).catch(error=>{boots.delete(env.DB);console.error('recruitment_bootstrap_failed',String(error?.message||'unknown').slice(0,500));throw error;});boots.set(env.DB,task);}
  await boots.get(env.DB);
 }
 async function tick(env){
  if(!env.DB)throw Error('Persistent database is not configured.');await boot(env);
  const now=Date.now(),stamp=new Date(now).toISOString(),lease=id();
  await run(env.DB,"INSERT OR IGNORE INTO recruitment_runner_state(id) VALUES('main')");
  const claim=await run(env.DB,"UPDATE recruitment_runner_state SET lease_token=?,lease_until=?,last_run_at=? WHERE id='main' AND (lease_until IS NULL OR lease_until<=?)",lease,new Date(now+180000).toISOString(),stamp,stamp);
  if(!claim.meta.changes)return {status:'already_running'};
  const state=await first(env.DB,"SELECT next_phase FROM recruitment_runner_state WHERE id='main'"),phase=state.next_phase;
  try{
   const providers=createRecruitmentProviders(env,{fetch:fetcher});let result;
   if(phase===0)result=await runRecruitmentSourceChecks(env.DB,{now,sources:catalogue.sources,pathways:catalogue.examinations,fetch:fetcher,limit:1});
   else result=await runRecruitmentNotificationPhase(env.DB,{stage:['sources','fanout','reminders','delivery'][phase],now,providers,evaluateTechnicalEligibility,limit:phase===1?1:5,maxCandidates:10});
   if(phase===3)result.studyReminders=await runDueReminders(env.DB,{now,limit:5});
   await run(env.DB,"UPDATE recruitment_runner_state SET next_phase=?,lease_token=NULL,lease_until=NULL,last_success_at=?,last_error=NULL WHERE id='main' AND lease_token=?",(phase+1)%4,new Date().toISOString(),lease);
   return {status:'completed',phase:['sources','fanout','reminders','delivery'][phase],result};
  }catch(error){await run(env.DB,"UPDATE recruitment_runner_state SET lease_token=NULL,lease_until=NULL,last_error='runner_phase_failed' WHERE id='main' AND lease_token=?",lease).catch(()=>{});throw error;}
 }
 const toolList=[
  {name:'technical_source_health',description:'Read technical recruitment source health and persisted scheduler runs. Does not expose candidate profiles or recipients.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
  {name:'refresh_technical_sources',description:'Run a bounded official technical-source check and process explicitly consented recruitment notifications. Does not certify discovered eligibility or invent dates.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true}}
 ];
 async function health(env){
  if(!env.DB)return {database:false,schedulerConfigured:false};
  const sources=(await env.DB.prepare('SELECT id,last_checked_at,last_success_at,last_error,next_check_at FROM recruitment_sources ORDER BY id').all()).results;
  const latest=await env.DB.prepare('SELECT started_at,completed_at,outcome,stage FROM recruitment_scheduler_runs ORDER BY started_at DESC,rowid DESC LIMIT 1').first();
  const runner=await first(env.DB,"SELECT next_phase,last_run_at,last_success_at,last_error FROM recruitment_runner_state WHERE id='main'");
  return {database:true,schedulerConfigured:env.SCHEDULER_ACTIVE==='true',latestRun:latest,runner,sources};
 }
 return {
  async fetch(request,env={},context){
   const url=new URL(request.url);
   try{
    if(url.pathname==='/mcp'){
     if(request.method!=='POST')return json({error:'Use JSON-RPC POST.'},405);
     if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json({error:'Send application/json.'},415);
     const origin=request.headers.get('origin');
     if(origin&&origin!==url.origin&&!request.headers.get('authorization'))return json({error:'Cross-origin browser writes are not accepted.'},403);
     const raw=await request.text();if(raw.length>10000)return json({error:'Request is too large.'},413);
     let rpc;try{rpc=JSON.parse(raw);}catch{return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON.'}},400);}
     const reply=result=>json({jsonrpc:'2.0',id:rpc.id??null,result});
     if(rpc.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
     if(rpc.method==='initialize')return reply({protocolVersion:'2026-07-28',capabilities:{tools:{}},serverInfo:{name:'GATE EC Technical Careers',version:'4.0'}});
     if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
     if(rpc.method==='tools/list')return reply({tools:toolList});
     if(rpc.method==='tools/call'){
      if(!request.headers.get('oai-authenticated-user-id'))return json({error:'A verified Sites identity is required.'},401);
      const name=rpc.params?.name,args=rpc.params?.arguments||{};
      if(Object.keys(args).length||!toolList.some(tool=>tool.name===name))return reply({isError:true,content:[{type:'text',text:'Unknown tool or unsupported arguments.'}]});
      const owner=env.OWNER_SITE_USER_ID?request.headers.get('oai-authenticated-user-id')===env.OWNER_SITE_USER_ID:!!env.OWNER_EMAIL&&request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase()===env.OWNER_EMAIL.trim().toLowerCase();
      if(name==='refresh_technical_sources'&&!owner)return json({error:'The configured Site owner is required for source updates.'},403);
      await boot(env);const value=name==='technical_source_health'?await health(env):await tick(env);
      return reply({content:[{type:'text',text:JSON.stringify(value)}]});
     }
     return json({jsonrpc:'2.0',id:rpc.id??null,error:{code:-32601,message:'Method not found.'}});
    }
    if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/recruitment/')){
     await boot(env);
     return await apiFor(env)(request,env);
    }
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
    let path;try{path=decodeURIComponent(url.pathname);}catch{return new Response('Invalid path',{status:400});}
    if(path.includes('..')||path.includes('\\'))return new Response('Invalid path',{status:400});
    const key=path==='/'?'/index.html':path,asset=assets[key]||(!/\.[^/]+$/.test(path)?assets['/index.html']:null);
    if(!asset)return new Response('Not found',{status:404});
    const headers={'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','etag':'"'+asset.hash+'"'};
    if(key==='/recruitment-sw.js')headers['service-worker-allowed']='/';
    if(request.headers.get('if-none-match')===headers.etag)return new Response(null,{status:304,headers});
    headers['content-encoding']='gzip';
    const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
    // Cloudflare otherwise compresses these already-compressed bytes a second time.
    return new Response(request.method==='HEAD'?null:bytes,{headers,encodeBody:'manual'});
   }catch{return json({status:'error',code:'service_unavailable',message:'This service could not complete the request. Public research assets remain available.'},503);}
  },
  async scheduled(event,env,context){if(env.SCHEDULER_ACTIVE==='true')context.waitUntil(tick(env));},
  tick,health
 };
}
