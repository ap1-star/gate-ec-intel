import {all,first,run,id,parseJson} from './validation.mjs';
import {ingestRecruitmentNotice,recruitmentHash,getRecruitmentNotice} from './recruitment-store.mjs';

const utc=value=>new Date(value).toISOString();
const MAX_BYTES=8*1024*1024;
export function officialSourceUrl(value,hosts){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&!url.hash&&hosts.includes(url.hostname.toLowerCase())?url:null;}catch{return null;}
}
export async function fetchOfficialSource(source,{fetch:fetcher=globalThis.fetch}={}){
 const hosts=parseJson(source.allowed_hosts_json,source.allowedHosts||[]),headers={'user-agent':'GATE-EC-Technical-Research/4.0 (official public recruitment notices)'};
 if(source.etag)headers['if-none-match']=source.etag;if(source.last_modified)headers['if-modified-since']=source.last_modified;
 let url=officialSourceUrl(source.url,hosts);if(!url)throw Error('source_url_not_allowed');
 for(let redirects=0;redirects<=3;redirects++){
  const response=await fetcher(url.href,{headers,redirect:'manual',signal:AbortSignal.timeout(12000)});
  if([301,302,303,307,308].includes(response.status)){const next=officialSourceUrl(new URL(response.headers.get('location')||'',url).href,hosts);if(!next||redirects===3)throw Error('redirect_not_allowed');url=next;continue;}
  if(response.status===304)return {unchanged:true,response,url:url.href};
  if(!response.ok)throw Error('http_'+response.status);
  const type=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
  if(!['text/html','application/xhtml+xml','application/pdf','text/plain','application/octet-stream'].includes(type))throw Error('unsupported_content_type');
  if(Number(response.headers.get('content-length'))>MAX_BYTES)throw Error('source_too_large');
  const reader=response.body?.getReader(),chunks=[];let length=0;
  if(!reader)throw Error('empty_response');
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES)throw Error('source_too_large');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const html=type.includes('html')||type==='text/plain'?new TextDecoder().decode(bytes):null;
  if(html&&/cf-chl-|g-recaptcha|hcaptcha|captcha-container|verify you are human|access denied|<title>[^<]*(sign in|login)/i.test(html))throw Error('access_restricted_manual_review');
  const contentHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  return {response,url:url.href,type,html,contentHash,bytes:length,unchanged:source.content_hash===contentHash};
 }
 throw Error('redirect_not_allowed');
}
const decode=value=>value.replace(/&amp;/g,'&').replace(/&#0*39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ');
export function discoverOfficialNoticeLinks(html,source){
 const hosts=parseJson(source.allowed_hosts_json,source.allowedHosts||[]),found=new Map();
 for(const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi)){
  const title=decode(match[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).slice(0,300);let url;try{url=officialSourceUrl(new URL(decode(match[1]),source.url).href.split('#')[0],hosts);}catch{continue;}
  if(!url||!title||!/recruit|vacanc|advertis|scientist|engineer|technical|electronics|telecom|signal|OCES|DGFS|GATE|corrigendum|addendum/i.test(title))continue;
  if(!/engineer|technical|technician|scientist|scientific|electronics|telecom|signal|\b(?:JE|ESE|OCES|DGFS|RAC|CEPTAM|GATE|ALP)\b/i.test(title))continue;
  if(/CHSL|CGL|RRB\s*NTPC|non.?technical popular|clerical|banking|non.?technical|administrative officer|apprentice.*ITI|privacy policy/i.test(title))continue;
  if(!/\.pdf(?:$|\?)|notice|recruit|career|advert|vacanc/i.test(url.href))continue;
  found.set(url.href,{url:url.href,title});if(found.size>=5)break;
 }
 return [...found.values()];
}

/** Bounded official-source jobs; a fetch never certifies eligibility or guesses application dates. */
export async function runRecruitmentSourceChecks(db,{now=Date.now(),sources=[],pathways=[],fetch:fetcher=globalThis.fetch,limit=3}={}){
 const due=await all(db,"SELECT * FROM recruitment_sources WHERE official=1 AND adapter IN ('html_links','pdf_hash') AND (next_check_at IS NULL OR next_check_at<=?) AND (lease_until IS NULL OR lease_until<=?) ORDER BY COALESCE(last_checked_at,created_at),id LIMIT ?",utc(now),utc(now),Math.min(10,Math.max(1,limit))),results=[];
 for(const source of due){
  const lease=id(),claimed=await run(db,'UPDATE recruitment_sources SET lease_token=?,lease_until=? WHERE id=? AND (lease_until IS NULL OR lease_until<=?)',lease,utc(now+180000),source.id,utc(now));if(!claimed.meta.changes)continue;
  const runId=id();await run(db,'INSERT INTO recruitment_source_runs(id,source_id,started_at,outcome,discovered_count) VALUES(?,?,?,?,0)',runId,source.id,utc(now),'running');
  try{
   const value=await fetchOfficialSource(source,{fetch:fetcher}),config=sources.find(entry=>entry.id===source.id)||{},pathway=pathways.find(entry=>entry.sourceIds?.includes(source.id));let discovered=0;
   if(!value.unchanged){
    if(value.html){
     for(const link of discoverOfficialNoticeLinks(value.html,source)){
      // Unmapped or ambiguous source links remain a source review, never a guessed exam/post.
      if(!pathway)continue;
      const noticeId='source_'+(await recruitmentHash([source.id,link.url])).slice(0,48),existing=await first(db,'SELECT id FROM recruitment_notices WHERE source_id=? AND source_url=?',source.id,link.url);
      if(existing)continue;
      await ingestRecruitmentNotice(db,{id:noticeId,sourceId:source.id,organizationId:pathway.organizationId,examinationId:pathway.id,title:link.title,sourceUrl:link.url,verificationStatus:'review_required',status:'unknown',posts:[],contentHash:value.contentHash},{now});discovered++;
     }
    }else{
     const existing=await first(db,'SELECT id FROM recruitment_notices WHERE source_url=?',source.url);
     if(existing&&source.content_hash){const notice=await getRecruitmentNotice(db,existing.id,{now});await ingestRecruitmentNotice(db,{...notice,contentHash:value.contentHash,verificationStatus:'review_required',status:'unknown',verifiedAt:null},{now});discovered++;}
    }
   }
   const interval=Math.max(6,Number(config.checkIntervalHours)||24)*3600000;
   await run(db,'UPDATE recruitment_sources SET last_checked_at=?,last_success_at=?,last_error=NULL,etag=COALESCE(?,etag),last_modified=COALESCE(?,last_modified),content_hash=COALESCE(?,content_hash),next_check_at=?,attempt_count=0,lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?',utc(now),utc(now),value.response.headers.get('etag'),value.response.headers.get('last-modified'),value.contentHash||null,utc(now+interval),source.id,lease);
   await run(db,'UPDATE recruitment_source_runs SET completed_at=?,outcome=?,discovered_count=? WHERE id=?',utc(now),value.unchanged?'unchanged':'checked',discovered,runId);results.push({sourceId:source.id,status:value.unchanged?'unchanged':'checked',discovered});
  }catch(error){
   const code=/^(?:http_\d{3}|source_url_not_allowed|redirect_not_allowed|unsupported_content_type|source_too_large|empty_response|access_restricted_manual_review)$/.test(error.message)?error.message:'source_fetch_failed',attempt=source.attempt_count+1,delay=Math.min(7*86400000,Math.max(3600000,2**Math.min(attempt,8)*1800000));
   await run(db,'UPDATE recruitment_sources SET last_checked_at=?,last_error=?,attempt_count=?,next_check_at=?,lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?',utc(now),code,attempt,utc(now+delay),source.id,lease);
   await run(db,'UPDATE recruitment_source_runs SET completed_at=?,outcome=?,error_code=? WHERE id=?',utc(now),'error',code,runId);results.push({sourceId:source.id,status:'error',errorCode:code});
  }
 }
 return {checked:results.length,results};
}
