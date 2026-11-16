import {all,first,run,id,parseJson} from './validation.mjs';
import {getRecruitmentPreferences,getRecruitmentNotice,RECRUITMENT_CHANNELS,CLOSED_NOTICE_STATUSES,validateRecruitmentPreferences,setRecruitmentConsent} from './recruitment-store.mjs';
const utc=now=>new Date(now).toISOString();
function parts(epoch,zone){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(epoch).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
function wall(p){return Date.UTC(p.year,p.month-1,p.day,p.hour||0,p.minute||0,p.second||0);}
function zoned(p,zone,after=0){
 const desired=wall(p);let value=desired;
 for(let i=0;i<6;i++){const delta=desired-wall(parts(value,zone));if(!delta&&value>=after)return value;value+=delta;}
 // Resolve a DST gap to the first valid local minute, or a repeated wall time after the current instant.
 let best=null,bestWall=Infinity;
 for(let minutes=-180;minutes<=180;minutes++){const candidate=value+minutes*60000,current=wall(parts(candidate,zone));if(candidate>=after&&current>=desired&&(current<bestWall||(current===bestWall&&candidate<best))){best=candidate;bestWall=current;}}
 if(best===null)throw new Error('Unable to resolve notification wall time.');return best;
}
function dateShift(p,days){const d=new Date(Date.UTC(p.year,p.month-1,p.day+days));return {...p,year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};}
export function deferQuietHours(at,quiet){if(!quiet)return at;const p=parts(at,quiet.timezone),minute=p.hour*60+p.minute,[sh,sm]=quiet.start.split(':').map(Number),[eh,em]=quiet.end.split(':').map(Number),start=sh*60+sm,end=eh*60+em,inside=start<end?minute>=start&&minute<end:minute>=start||minute<end;if(!inside)return at;return zoned({...dateShift(p,start>end&&minute>=start?1:0),hour:eh,minute:em,second:0},quiet.timezone,at);}
export function officialReminderInstant(notice,days){if(!notice.deadlineVerified||!notice.deadlineAt||!notice.deadlineTimezone)return null;const deadline=Date.parse(notice.deadlineAt);if(!Number.isFinite(deadline))return null;const local=parts(deadline,notice.deadlineTimezone),at=zoned({...dateShift(local,-days),hour:9,minute:0,second:0},notice.deadlineTimezone);return days===0&&at>=deadline?deadline-3600000:at;}
function digestDue(now,preferences){const zone=preferences.quietHours?.timezone||'Asia/Kolkata',p=parts(now,zone);let day=0;if(preferences.digest==='weekly'){const weekday=new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay();day=(8-weekday)%7;}let at=zoned({...dateShift(p,day),hour:9,minute:0,second:0},zone);if(at<=now)at=zoned({...dateShift(p,day+(preferences.digest==='weekly'?7:1)),hour:9,minute:0,second:0},zone);return deferQuietHours(at,preferences.quietHours);}
async function enqueue(db,{userId,noticeId=null,eventId=null,noticeVersion=null,channel,kind,key,payload,dueAt,now}){
 const jobId=id(),timestamp=utc(now),due=utc(dueAt);
 await run(db,"INSERT INTO recruitment_jobs(id,user_id,notice_id,event_id,notice_version,channel,kind,idempotency_key,payload_json,status,due_at,available_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'queued',?,?,?,?) ON CONFLICT(idempotency_key) DO UPDATE SET status='queued',due_at=excluded.due_at,available_at=excluded.available_at,payload_json=excluded.payload_json,updated_at=excluded.updated_at WHERE recruitment_jobs.status IN('cancelled','superseded')",jobId,userId,noticeId,eventId,noticeVersion,channel,kind,key,JSON.stringify(payload),due,due,timestamp,timestamp);
 return (await first(db,'SELECT id FROM recruitment_jobs WHERE idempotency_key=?',key)).id;
}
function candidateMatches(profile,preferences,notice,saved,evaluateTechnicalEligibility,now){
 if(!saved&&!preferences.organizationIds.includes(notice.organizationId)&&!preferences.examinationIds.includes(notice.examinationId))return false;
 if(!saved&&preferences.states.length&&!(notice.states||[]).some(s=>preferences.states.includes(s)))return false;
 if(!saved&&preferences.routeTypes.length&&!preferences.routeTypes.includes(notice.routeType))return false;
 const posts=(notice.posts||[]).filter(post=>post.technical===true);if(!posts.length)return false;
 if(saved)return true;
 if(typeof evaluateTechnicalEligibility==='function')return posts.some(post=>evaluateTechnicalEligibility(profile,post,{now}).status!=='ineligible');
 // An absent rules adapter never grants eligibility. Explicit follows may still receive source announcements.
 return true;
}
export async function processRecruitmentEvents(db,{now=Date.now(),limit=10,maxCandidates=10,evaluateTechnicalEligibility}={}){
 const events=await all(db,'SELECT * FROM recruitment_notice_events WHERE fanout_completed_at IS NULL ORDER BY created_at,id LIMIT ?',limit);let queued=0;
 for(const event of events){
  const notice=await getRecruitmentNotice(db,event.notice_id,{now});
  if(!notice||notice.verificationStatus!=='verified'||event.event_type==='notice_recorded'||event.notice_version!==notice.version){await run(db,'UPDATE recruitment_notice_events SET fanout_completed_at=? WHERE id=?',utc(now),event.id);continue;}
  const candidateLimit=Math.max(1,Math.min(100,Math.floor(maxCandidates))),candidates=await all(db,"SELECT p.user_id,p.profile_json,p.preferences_json,CASE WHEN s.user_id IS NULL THEN 0 ELSE 1 END AS saved FROM recruitment_preferences p LEFT JOIN recruitment_saved s ON s.user_id=p.user_id AND s.notice_id=? WHERE p.user_id>? UNION ALL SELECT s.user_id,'{}' AS profile_json,'{}' AS preferences_json,1 AS saved FROM recruitment_saved s WHERE s.notice_id=? AND s.user_id>? AND NOT EXISTS(SELECT 1 FROM recruitment_preferences p WHERE p.user_id=s.user_id) ORDER BY user_id LIMIT ?",notice.id,event.fanout_cursor||'',notice.id,event.fanout_cursor||'',candidateLimit+1);
  for(const candidate of candidates.slice(0,candidateLimit)){
   const userId=candidate.user_id,profile=parseJson(candidate.profile_json,{}),preferences=validateRecruitmentPreferences(parseJson(candidate.preferences_json,{})),saved=!!candidate.saved;
   if(!candidateMatches(profile,preferences,notice,!!saved,evaluateTechnicalEligibility,now)||(event.event_type==='new_opportunity'&&CLOSED_NOTICE_STATUSES.includes(notice.status))){await run(db,'UPDATE recruitment_notice_events SET fanout_cursor=? WHERE id=? AND fanout_cursor<?',userId,event.id,userId);continue;}
   for(const channel of RECRUITMENT_CHANNELS.filter(c=>preferences.channels[c])){
    const digest=preferences.digest!=='instant',due=digest?digestDue(now,preferences):deferQuietHours(now,preferences.quietHours),key=digest?'digest:'+userId+':'+channel+':'+preferences.digest+':'+utc(due).slice(0,16):'event:'+event.id+':'+userId+':'+channel;
    const jobId=await enqueue(db,{userId,noticeId:digest?null:notice.id,eventId:digest?null:event.id,noticeVersion:digest?null:notice.version,channel,kind:digest?'digest':'notice_event',key,payload:{eventType:event.event_type},dueAt:due,now});
    await run(db,'INSERT OR IGNORE INTO recruitment_job_events(job_id,event_id) VALUES(?,?)',jobId,event.id);queued++;
   }
   await run(db,'UPDATE recruitment_notice_events SET fanout_cursor=? WHERE id=? AND fanout_cursor<?',userId,event.id,userId);
  }
  if(candidates.length<=candidateLimit)await run(db,'UPDATE recruitment_notice_events SET fanout_completed_at=? WHERE id=?',utc(now),event.id);
 }
 return {events:events.length,queued};
}
async function enqueueReminderBatch(db,jobs){
 // At most 91 bound values per SQL statement, below D1's 100 parameter ceiling.
 for(let offset=0;offset<jobs.length;offset+=7){const rows=jobs.slice(offset,offset+7),values=[];
  for(const job of rows){const due=utc(job.dueAt),timestamp=utc(job.now);values.push(id(),job.userId,job.noticeId,null,job.noticeVersion,job.channel,'deadline_reminder',job.key,JSON.stringify(job.payload),due,due,timestamp,timestamp);}
  await run(db,"INSERT INTO recruitment_jobs(id,user_id,notice_id,event_id,notice_version,channel,kind,idempotency_key,payload_json,status,due_at,available_at,created_at,updated_at) VALUES "+rows.map(()=>"(?,?,?,?,?,?,?,?,?,'queued',?,?,?,?)").join(',')+" ON CONFLICT(idempotency_key) DO UPDATE SET status='queued',due_at=excluded.due_at,available_at=excluded.available_at,payload_json=excluded.payload_json,updated_at=excluded.updated_at WHERE recruitment_jobs.status IN('cancelled','superseded')",...values);
 }
}
export async function scheduleRecruitmentReminders(db,{now=Date.now(),userId=null,noticeId=null,limit=10}={}){
 const global=!userId&&!noticeId,rowLimit=Math.max(1,Math.min(100,Math.floor(limit))),bindings=[],conditions=[];let state=null;
 if(userId){conditions.push('s.user_id=?');bindings.push(userId)}if(noticeId){conditions.push('s.notice_id=?');bindings.push(noticeId)}
 if(global){
  await run(db,"INSERT OR IGNORE INTO recruitment_scheduler_state(id,updated_at) VALUES('reminders',?)",utc(now));state=await first(db,"SELECT * FROM recruitment_scheduler_state WHERE id='reminders'");
  conditions.push('(s.user_id>? OR (s.user_id=? AND s.notice_id>?))');bindings.push(state.cursor_user_id,state.cursor_user_id,state.cursor_notice_id);
 }
 const saved=await all(db,'SELECT s.* FROM recruitment_saved s'+(conditions.length?' WHERE '+conditions.join(' AND '):'')+' ORDER BY s.user_id,s.notice_id LIMIT ?',...bindings,global?rowLimit:100);let scheduled=0;
 for(const entry of saved){
  const notice=await getRecruitmentNotice(db,entry.notice_id,{now}),{preferences}=await getRecruitmentPreferences(db,entry.user_id);
  const days=parseJson(entry.reminder_days_json,[]),valid=notice?.verificationStatus==='verified'&&!CLOSED_NOTICE_STATUSES.includes(notice.status)&&notice.deadlineVerified&&Date.parse(notice.deadlineAt)>now;
  const pending=await all(db,"SELECT id,idempotency_key FROM recruitment_jobs WHERE user_id=? AND notice_id=? AND kind='deadline_reminder' AND status IN('queued','retry','blocked','leased')",entry.user_id,entry.notice_id),pendingKeys=new Set(pending.map(job=>job.idempotency_key)),keep=[],jobs=[];
  if(valid)for(const day of days)for(const channel of RECRUITMENT_CHANNELS.filter(c=>preferences.channels[c])){
   const original=officialReminderInstant(notice,day);if(original===null)continue;
   const key='deadline:'+entry.user_id+':'+notice.id+':'+notice.version+':'+day+':'+channel;
   if(original<now){if(pendingKeys.has(key))keep.push(key);continue;}
   const due=deferQuietHours(original,preferences.quietHours);if(due>=Date.parse(notice.deadlineAt))continue;keep.push(key);
   jobs.push({userId:entry.user_id,noticeId:notice.id,noticeVersion:notice.version,channel,key,payload:{daysBefore:day,deadlineAt:notice.deadlineAt},dueAt:due,now});scheduled++;
  }
  if(jobs.length)await enqueueReminderBatch(db,jobs);
  const obsolete=pending.filter(job=>!keep.includes(job.idempotency_key));if(obsolete.length)await run(db,"UPDATE recruitment_jobs SET status='cancelled',last_error='deadline_or_preferences_changed',updated_at=? WHERE user_id=? AND notice_id=? AND kind='deadline_reminder' AND status IN('queued','retry','blocked','leased')"+(keep.length?' AND idempotency_key NOT IN('+keep.map(()=>'?').join(',')+')':''),utc(now),entry.user_id,entry.notice_id,...keep);
  if(global)await run(db,"UPDATE recruitment_scheduler_state SET cursor_user_id=?,cursor_notice_id=?,updated_at=? WHERE id='reminders' AND (cursor_user_id<? OR (cursor_user_id=? AND cursor_notice_id<?))",entry.user_id,entry.notice_id,utc(now),entry.user_id,entry.user_id,entry.notice_id);
 }
 if(global&&saved.length<rowLimit)await run(db,"UPDATE recruitment_scheduler_state SET cursor_user_id='',cursor_notice_id='',updated_at=? WHERE id='reminders'",utc(now));
 return {saved:saved.length,scheduled,bounded:global,limit:global?rowLimit:100};
}
const eventLabels={new_opportunity:'New verified technical opportunity',deadline_changed:'Official application deadline changed',exam_date_changed:'Official examination date changed',admit_card_announced:'Official admit-card announcement',answer_key_published:'Official answer key published',result_announced:'Official result announcement',notice_cancelled:'Recruitment cancelled',notice_withdrawn:'Recruitment withdrawn',notice_closed:'Recruitment closed',notice_updated:'Official recruitment notice updated',verification_changed:'Recruitment verification updated'};
async function payloadForJob(db,job,now){
 if(job.kind==='digest'){
  const events=await all(db,'SELECT e.* FROM recruitment_notice_events e JOIN recruitment_job_events j ON j.event_id=e.id WHERE j.job_id=? ORDER BY e.notice_version DESC,e.created_at DESC,e.id',job.id),seen=new Set(),items=[];
  for(const event of events){const n=await getRecruitmentNotice(db,event.notice_id,{now});if(!n||n.verificationStatus!=='verified'||seen.has(n.id))continue;seen.add(n.id);items.push({noticeId:n.id,title:n.title,eventType:event.event_type,officialUrl:n.sourceUrl,status:n.status});}
  if(!items.length)return null;return {kind:'digest',title:'Technical recruitment digest',body:items.length+' official recruitment updates. Review the linked post criteria.',officialUrl:items[0].officialUrl,items};
 }
 const notice=await getRecruitmentNotice(db,job.notice_id,{now});if(!notice||notice.verificationStatus!=='verified'||notice.version!==job.notice_version)return null;
 const value=parseJson(job.payload_json,{});
 if(job.kind==='deadline_reminder'){
  if(CLOSED_NOTICE_STATUSES.includes(notice.status)||!notice.deadlineVerified||Date.parse(notice.deadlineAt)<=now||value.deadlineAt!==notice.deadlineAt)return null;
  return {kind:'deadline_reminder',noticeId:notice.id,title:'Application deadline reminder',body:notice.title+' — official closing time '+notice.deadlineAt+' ('+notice.deadlineTimezone+'). Check eligibility and apply through the official notice.',officialUrl:notice.sourceUrl,applicationUrl:notice.applicationUrl,deadlineAt:notice.deadlineAt,deadlineTimezone:notice.deadlineTimezone,daysBefore:value.daysBefore};
 }
 if(value.eventType==='new_opportunity'&&CLOSED_NOTICE_STATUSES.includes(notice.status))return null;
 return {kind:value.eventType||'notice_updated',noticeId:notice.id,title:eventLabels[value.eventType]||eventLabels.notice_updated,body:notice.title+'. Review the official post-specific eligibility criteria and current notice.',officialUrl:notice.sourceUrl,applicationUrl:notice.applicationUrl};
}
async function settle(db,job,status,now,patch={}){
 if(status==='submitted'&&patch.providerMessageId){
  // The callback and this completion update may commit in either order. The durable verified event closes both races.
  const terminal="SELECT outcome FROM recruitment_provider_events WHERE provider_message_id=? AND channel=? AND outcome IN('delivered','failed') ORDER BY received_at,rowid LIMIT 1";
  return run(db,"UPDATE recruitment_jobs SET status=COALESCE((SELECT CASE outcome WHEN 'delivered' THEN 'delivered' ELSE 'dead_letter' END FROM ("+terminal+")),'submitted'),available_at=?,lease_token=NULL,lease_until=NULL,last_error=CASE WHEN ("+terminal+")='failed' THEN 'provider_delivery_failed' ELSE ? END,provider_message_id=?,updated_at=? WHERE id=? AND lease_token=? AND status='leased'",patch.providerMessageId,job.channel,utc(patch.availableAt??now),patch.providerMessageId,job.channel,patch.code||null,patch.providerMessageId,utc(now),job.id,job.lease_token);
 }
 return run(db,'UPDATE recruitment_jobs SET status=?,available_at=?,lease_token=NULL,lease_until=NULL,last_error=?,provider_message_id=COALESCE(?,provider_message_id),updated_at=? WHERE id=? AND lease_token=? AND status=\'leased\'',status,utc(patch.availableAt??now),patch.code||null,patch.providerMessageId||null,utc(now),job.id,job.lease_token);
}
/** Durable, leased SQL outbox. External callbacks are injected; this module has no network sender. */
export async function runNotificationJobs(db,{now=Date.now(),providers={},limit=100,leaseMs=60000}={}){
 const due=await all(db,"SELECT * FROM recruitment_jobs WHERE available_at<=? AND (status IN('queued','retry','blocked') OR (status='leased' AND lease_until<=?)) ORDER BY available_at,id LIMIT ?",utc(now),utc(now),limit);let delivered=0,submitted=0,blocked=0,failed=0,cancelled=0;
 for(const row of due){
  const lease=id(),claim=await run(db,"UPDATE recruitment_jobs SET status='leased',lease_token=?,lease_until=?,updated_at=? WHERE id=? AND available_at<=? AND (status IN('queued','retry','blocked') OR (status='leased' AND lease_until<=?))",lease,utc(now+leaseMs),utc(now),row.id,utc(now),utc(now));if(!claim.meta.changes)continue;
  const job={...row,lease_token:lease},{preferences}=await getRecruitmentPreferences(db,job.user_id),payload=await payloadForJob(db,job,now);
  if(!preferences.channels[job.channel]||!payload){await settle(db,job,'cancelled',now,{code:!payload?'notice_no_longer_actionable':'preference_disabled'});cancelled++;continue;}
  const deferred=deferQuietHours(now,preferences.quietHours);if(deferred>now){await settle(db,job,'queued',now,{availableAt:deferred});continue;}
  let recipient=null,provider=providers[job.channel];
  if(job.channel!=='in_app'){
   const consent=await first(db,'SELECT granted_at,revoked_at FROM recruitment_channel_consents WHERE user_id=? AND channel=?',job.user_id,job.channel),contact=await first(db,'SELECT * FROM recruitment_contacts WHERE user_id=? AND channel=?',job.user_id,job.channel);
   if(!consent?.granted_at||consent.revoked_at){await settle(db,job,'cancelled',now,{code:'consent_revoked'});cancelled++;continue;}
   if(!provider?.configured||!contact?.verified_at){await settle(db,job,'blocked',now,{code:!provider?.configured?'provider_not_configured':'recipient_unverified',availableAt:now+15*60000});blocked++;continue;}
   recipient=contact.recipient;
   if(row.attempt_count>0&&Number.isFinite(provider.idempotencyWindowMs)&&provider.idempotencyWindowMs>0){const firstAttempt=await first(db,'SELECT started_at FROM recruitment_delivery_attempts WHERE job_id=? ORDER BY attempt_number LIMIT 1',job.id);if(firstAttempt&&now-Date.parse(firstAttempt.started_at)>=provider.idempotencyWindowMs-60000){await settle(db,job,'dead_letter',now,{code:'provider_idempotency_window_expired'});failed++;continue;}}
   if(row.status==='leased'&&row.attempt_count>0&&provider.supportsIdempotency!==true){await settle(db,job,'dead_letter',now,{code:'expired_lease_delivery_unknown'});failed++;continue;}
  }
  const count=job.attempt_count+1,attemptId=id();
  const started=await run(db,'UPDATE recruitment_jobs SET attempt_count=attempt_count+1 WHERE id=? AND lease_token=? AND status=\'leased\'',job.id,lease);if(!started.meta.changes)continue;
  await run(db,'INSERT INTO recruitment_delivery_attempts(id,job_id,attempt_number,started_at,outcome) VALUES(?,?,?,?,?)',attemptId,job.id,count,utc(now),'started');
  let result;
  try{
   if(job.channel==='in_app'){
    const results=await db.batch([db.prepare('INSERT OR IGNORE INTO recruitment_notifications(id,user_id,notice_id,event_id,kind,title,body,official_url,source_key,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM recruitment_jobs WHERE id=? AND lease_token=? AND status=\'leased\')').bind(id(),job.user_id,job.notice_id,job.event_id,payload.kind,payload.title,payload.body,payload.officialUrl,job.idempotency_key,utc(now),job.id,lease),db.prepare("UPDATE recruitment_jobs SET status='delivered',lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=? AND status='leased'").bind(utc(now),job.id,lease)]);
    result={status:results[1]?.meta?.changes?'delivered':'cancelled'};if(result.status==='delivered')delivered++;else cancelled++;
   }else{
    const sender=typeof providers.send==='function'?providers.send.bind(providers):provider.send?.bind(provider);
    result=sender?await sender({userId:job.user_id,jobId:job.id,channel:job.channel,recipient,payload,idempotencyKey:job.idempotency_key}):{status:'blocked',code:'provider_sender_missing'};
    if(result?.code==='subscription_gone'&&job.channel==='push'){await setRecruitmentConsent(db,job.user_id,'push',false,{now,providers});await run(db,"DELETE FROM recruitment_contacts WHERE user_id=? AND channel='push'",job.user_id);}
    if(!result||!['accepted','delivered','blocked','retryable_failure','permanent_failure','ambiguous'].includes(result.status))result={status:'ambiguous',code:'invalid_provider_result'};
    if(result.status==='accepted'||result.status==='delivered'){await settle(db,job,result.status==='accepted'?'submitted':'delivered',now,result);if(result.status==='accepted'){const completion=await first(db,'SELECT status FROM recruitment_jobs WHERE id=?',job.id);if(completion?.status==='delivered')delivered++;else if(completion?.status==='submitted')submitted++;else if(completion?.status==='dead_letter')failed++;}else delivered++;}
    else if(result.status==='blocked'){await settle(db,job,'blocked',now,{code:result.code||'provider_blocked',availableAt:now+15*60000});blocked++;}
    else{
     const ambiguous=result.status==='ambiguous',retry=result.status==='retryable_failure'||(ambiguous&&provider.supportsIdempotency===true),canRetry=retry&&count<job.max_attempts;
     const backoff=Math.min(6*3600000,60000*2**Math.min(10,count-1)),retryAfter=Math.min(24*3600000,Math.max(0,Number(result.retryAfterMs)||0));
     await settle(db,job,canRetry?'retry':'dead_letter',now,{code:result.code||result.status,availableAt:now+Math.max(backoff,retryAfter)});failed++;
    }
   }
  }catch{
   const retry=job.channel==='in_app'||provider?.supportsIdempotency===true,canRetry=retry&&count<job.max_attempts;
   await settle(db,job,canRetry?'retry':'dead_letter',now,{code:job.channel==='in_app'?'database_delivery_failure':'ambiguous_provider_failure',availableAt:now+Math.min(6*3600000,60000*2**Math.min(10,count-1))});result={status:'ambiguous',code:'delivery_exception'};failed++;
  }
  await run(db,'UPDATE recruitment_delivery_attempts SET completed_at=?,outcome=?,error_code=?,provider_message_id=? WHERE id=?',utc(now),result.status,result.code||null,result.providerMessageId||null,attemptId);
 }
 return {selected:due.length,delivered,submitted,blocked,failed,cancelled};
}
export async function recordRecruitmentDeliveryStatus(db,providerMessageId,status,{now=Date.now(),channel}={}){if(!['delivered','failed'].includes(status))throw new Error('Unsupported delivery status');return run(db,"UPDATE recruitment_jobs SET status=?,last_error=?,updated_at=? WHERE provider_message_id=? AND channel=? AND status='submitted'",status==='delivered'?'delivered':'dead_letter',status==='failed'?'provider_delivery_failed':null,utc(now),providerMessageId,channel);}

/** Run one bounded, observable stage per invocation when hosting query budgets are restrictive. */
export async function runRecruitmentNotificationPhase(db,{stage,now=Date.now(),providers={},evaluateTechnicalEligibility,limit=1,maxCandidates=1}={}){
 if(!['fanout','reminders','delivery'].includes(stage))throw new Error('Choose a recruitment scheduler stage.');
 const runId=id();await run(db,'INSERT INTO recruitment_scheduler_runs(id,stage,started_at,outcome) VALUES(?,?,?,?)',runId,stage,utc(now),'running');
 try{const result=stage==='fanout'?await processRecruitmentEvents(db,{now,limit,maxCandidates,evaluateTechnicalEligibility}):stage==='reminders'?await scheduleRecruitmentReminders(db,{now,limit}):await runNotificationJobs(db,{now,limit,providers});const processed=result.queued??result.scheduled??result.selected??0;await run(db,'UPDATE recruitment_scheduler_runs SET completed_at=?,outcome=?,processed=? WHERE id=?',utc(now),'completed',processed,runId);return {runId,stage,...result};}
 catch(error){await run(db,'UPDATE recruitment_scheduler_runs SET completed_at=?,outcome=?,error_code=? WHERE id=?',utc(now),'failed','recruitment_stage_failed',runId).catch(()=>{});throw error;}
}
