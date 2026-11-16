/** Optional Sites API composition. Root deployment must bind DB and apply reviewed migrations first. */
import {createApi} from './api.mjs';
import {runDueReminders} from './reminders.mjs';
export function createWorkerApi(options={}){
 const handler=createApi({...options,authMode:'sites'});
 return {fetch:(request,env)=>handler(request,env),scheduled:(_event,env,ctx)=>{if(env.DB&&env.SCHEDULER_ACTIVE==='true')ctx.waitUntil(runDueReminders(env.DB));}};
}
