import {all,run,id,timezone} from './validation.mjs';
function wallParts(epoch,zone){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(epoch).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
function wallNumber(p){return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);}
function toInstant(parts,zone){
 const wanted=wallNumber(parts);let guess=wanted;
 for(let i=0;i<5;i++){const correction=wanted-wallNumber(wallParts(guess,zone));if(!correction)return guess;guess+=correction;}
 // For a nonexistent DST wall time, move forward to the first valid local minute.
 for(let shift=0;shift<=120;shift++){
  const target=new Date(wanted+shift*60000),desired={year:target.getUTCFullYear(),month:target.getUTCMonth()+1,day:target.getUTCDate(),hour:target.getUTCHours(),minute:target.getUTCMinutes(),second:target.getUTCSeconds()};
  for(let offset=-14*60;offset<=14*60;offset+=15){const candidate=wallNumber(desired)-offset*60000;if(wallNumber(wallParts(candidate,zone))===wallNumber(desired))return candidate;}
 }
 throw new Error('Unable to resolve recurring reminder wall time.');
}
export function nextOccurrence(dueAt,zone,cadence,after){
 if(cadence==='once')return null;
 timezone(zone);const initial=wallParts(Date.parse(dueAt),zone),step=cadence==='weekly'?7:1;let date=Date.UTC(initial.year,initial.month-1,initial.day);
 const afterDate=wallParts(after,zone),days=Math.max(1,Math.floor((Date.UTC(afterDate.year,afterDate.month-1,afterDate.day)-date)/864e5));
 date+=Math.max(1,Math.floor(days/step))*step*864e5;
 for(let i=0;i<3;i++,date+=step*864e5){const d=new Date(date),candidate=toInstant({...initial,year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()},zone);if(candidate>after)return new Date(candidate).toISOString();}
 throw new Error('Recurring reminder could not advance.');
}
/** Durable SQL runner. Calling twice/concurrently cannot insert two notifications for one occurrence. */
export async function runDueReminders(db,{now=Date.now(),limit=100}={}){
 const started=new Date(now).toISOString(),runId=id();await run(db,'INSERT INTO scheduler_runs(id,started_at,outcome) VALUES(?,?,?)',runId,started,'running');
 let processed=0;
 try{
  const due=await all(db,'SELECT r.*,COALESCE(p.reminder_preference,\'none\') AS preference FROM reminders r LEFT JOIN profiles p ON p.user_id=r.user_id WHERE r.enabled=1 AND r.completed=0 AND r.due_at<=? ORDER BY r.due_at LIMIT ?',started,limit);
  for(const reminder of due){
   const key=reminder.id+':'+reminder.due_at,deliveryId=id(),notificationId=id(),next=nextOccurrence(reminder.due_at,reminder.timezone,reminder.cadence,now);
   const status=reminder.preference==='in_app'?'delivered':'skipped';
   const notification=reminder.kind==='mock_deadline'?'Mock deadline due':'Revision reminder due';
   let claimed=await run(db,'INSERT OR IGNORE INTO reminder_deliveries(id,reminder_id,user_id,occurrence_at,status,attempted_at,attempt_count) VALUES(?,?,?,?,?,?,?)',deliveryId,reminder.id,reminder.user_id,reminder.due_at,'pending',started,1);
   if(!claimed.meta.changes)claimed=await run(db,'UPDATE reminder_deliveries SET status=\'pending\',attempted_at=?,completed_at=NULL,attempt_count=attempt_count+1 WHERE reminder_id=? AND occurrence_at=? AND (status=\'failed\' OR (status=\'pending\' AND attempted_at<?))',started,reminder.id,reminder.due_at,new Date(now-5*60000).toISOString());
   if(!claimed.meta.changes)continue;
   try{
    await db.batch([
     db.prepare('INSERT OR IGNORE INTO notifications(id,user_id,kind,title,body,source_key,created_at) SELECT ?,?,?,?,?,?,? WHERE ?=\'in_app\' AND EXISTS(SELECT 1 FROM reminder_deliveries WHERE reminder_id=? AND occurrence_at=? AND status=\'pending\')').bind(notificationId,reminder.user_id,reminder.kind,notification,reminder.title,key,started,reminder.preference,reminder.id,reminder.due_at),
     db.prepare('UPDATE reminder_deliveries SET status=?,completed_at=? WHERE reminder_id=? AND occurrence_at=? AND status=\'pending\'').bind(status,started,reminder.id,reminder.due_at),
     db.prepare('UPDATE reminders SET due_at=COALESCE(?,due_at),enabled=?,completed=? WHERE id=? AND due_at=?').bind(next,next?1:0,next?0:1,reminder.id,reminder.due_at)
    ]);processed++;
   }catch(error){await run(db,'UPDATE reminder_deliveries SET status=\'failed\',completed_at=? WHERE reminder_id=? AND occurrence_at=? AND status=\'pending\'',started,reminder.id,reminder.due_at).catch(()=>{});throw error;}
  }
  await run(db,'UPDATE scheduler_runs SET completed_at=?,outcome=?,processed=? WHERE id=?',new Date(now).toISOString(),'completed',processed,runId);
  return {processed,runId,startedAt:started};
 }catch(error){await run(db,'UPDATE scheduler_runs SET completed_at=?,outcome=?,processed=? WHERE id=?',new Date(now).toISOString(),'failed',processed,runId).catch(()=>{});throw error;}
}
