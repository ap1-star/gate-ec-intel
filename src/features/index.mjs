import {createCareerFeature} from './career.mjs';
import {createPersonalFeature} from './personal.mjs';
import {createPyqFeature} from './pyq.mjs';
import {createRecruitmentFeature} from './recruitment.mjs';
const base=window.TerminalResearchBridge;
let session={status:'loading',user:null,csrfToken:null,capabilities:{}};
window.TerminalFeatureSession=session;
let features=[],host,refreshing=null,sessionGeneration=0;
const params=()=>new URLSearchParams(location.hash.includes('?')?location.hash.slice(location.hash.indexOf('?')+1):'');
function navigate(id,values={}){
 const query=new URLSearchParams();for(const [key,value] of Object.entries(values))if(value!==undefined&&value!==null&&String(value)!=='')query.set(key,String(value));
 const hash='#'+id+(query.size?'?'+query.toString():'');if(location.hash===hash){host.lastRoute=null;base.render();}else location.hash=hash;
}
class ServiceError extends Error{constructor(message,code,status){super(message);this.code=code;this.status=status;}}
async function api(path,options={}){
 if(typeof path!=='string'||!path.startsWith('/api/')||path.includes('://'))throw new ServiceError('Invalid service address.','invalid_input',400);
 const method=(options.method||'GET').toUpperCase(),headers={'accept':'application/json'};
 if(window.TERMINAL_STATIC_HOST===true){
  if(method!=='GET')throw new ServiceError('Private records and alerts need a connected backend.','backend_not_configured',503);
  const plain=path.split('?')[0],files={'/api/session':'session.json','/api/capabilities':'capabilities.json','/api/recruitment/catalog':'catalog.json','/api/recruitment/notices':'notices.json','/api/recruitment/push/config':'push.json'};
  let file=files[plain];const notice=plain.match(/^\/api\/recruitment\/notices\/([A-Za-z0-9_-]{1,160})$/);if(notice)file='notices/'+notice[1]+'.json';
  if(!file)throw new ServiceError('Private records and alerts need a connected backend.','backend_not_configured',503);
  path=new URL('_hosting/'+file,document.baseURI).href;
 }
 const request={method,credentials:'same-origin',headers,signal:AbortSignal.timeout(10000)};
 if(options.body!==undefined){headers['content-type']='application/json';request.body=JSON.stringify(options.body);}
 if(!['GET','HEAD'].includes(method)&&session.csrfToken)headers['X-CSRF-Token']=session.csrfToken;
 let response;try{response=await fetch(path,request);}catch{throw new ServiceError('The account service could not be reached. Public research remains available.','service_unavailable',503);}
 if(!response.headers.get('content-type')?.includes('application/json'))throw new ServiceError('The published account backend is not connected. Use the research and career tools, or run the documented local server.','service_unavailable',503);
 let result;try{result=await response.json();}catch{throw new ServiceError('The service returned an unreadable response.','invalid_response',502);}
 if(!response.ok||result.status!=='ok')throw new ServiceError(result.message||'The service request could not be completed.',result.code||result.status||'service_error',response.status);
 return result.data;
}
async function refreshSession(force=false){
 if(refreshing&&!force)return refreshing;
 const generation=++sessionGeneration;
 const task=(async()=>{
  const previous=session.status==='authenticated'?session.user?.id:null;
  let nextSession;
  try{const current=await api('/api/session');nextSession={...current,capabilities:current.capabilities||{}};}
  catch(error){nextSession={status:'unavailable',user:null,csrfToken:null,capabilities:{},reason:error.message};}
  if(generation!==sessionGeneration)return session;
  session=nextSession;window.TerminalFeatureSession=session;
  const next=session.status==='authenticated'?session.user?.id:null;
  if(previous!==next)for(const feature of features)feature.resetUser?.();
  if(host)host.lastRoute=null;
  base.render();return session;
 })();
 refreshing=task;
 try{return await task;}finally{if(refreshing===task)refreshing=null;}
}
const bridge={...base,params,navigate,api,session:()=>session,refreshSession:()=>refreshSession(true)};
const career=createCareerFeature(bridge),personal=createPersonalFeature(bridge),pyq=createPyqFeature(bridge),recruitment=createRecruitmentFeature(bridge);
features=[career,personal,pyq,recruitment];
for(const feature of features){
 const safeRenderers=Object.fromEntries(Object.entries(feature.renderers||{}).map(([id,renderer])=>[id,()=>{try{return renderer();}catch{return base.C.ErrorState({title:'This workspace could not be rendered',description:'Reload the workspace or return to public research. No missing records have been substituted.',actionHtml:'<a class="button" href="#monitor">Research overview</a>'});}}]));
 base.register({...feature,renderers:safeRenderers});
}
base.installQuestionFilter(rows=>pyq.filterRows(rows));base.decorateInspector(id=>pyq.decorateInspector(id));
host={lastRoute:null,afterRender(route){
 for(const feature of features)if(feature.renderers?.[route])feature.afterRender?.(route);
 if(this.lastRoute===route)return;this.lastRoute=route;
 if(document.getElementById('inspector')?.open)document.getElementById('inspector').close();
 if(document.getElementById('chartDialog')?.open)document.getElementById('chartDialog').close();
 for(const feature of features)if(feature.renderers?.[route]&&feature.load)Promise.resolve(feature.load(route)).then(()=>{if(base.currentRoute()===route)base.render();}).catch(error=>base.toast(error.message||'The service could not be loaded.'));
}};
window.TerminalFeatureHost=host;
window.TerminalFeatures={career,personal,pyq,recruitment,refreshSession};
function run(value){Promise.resolve(value).catch(error=>base.toast(error?.message||'The action could not be completed.'));}
// Row-contained save/source actions must be handled before legacy row drilldown listeners.
window.addEventListener('click',event=>{
 if(event.target.closest('[data-pyq-action],[data-pyq-page],[data-pyq-display],[data-pyq-source],[data-pyq-nav]')){if(pyq.handleClick(event))event.stopImmediatePropagation();}
},true);
window.addEventListener('change',event=>{
 if(event.target.dataset.pyqFilter||event.target.hasAttribute('data-pyq-column')){event.stopImmediatePropagation();pyq.handleChange(event);}
 else if(event.target.id==='subject')pyq.handleChange(event);
},true);
window.addEventListener('click',event=>{
 if(event.target.closest('[data-diff-drill],[data-diff-topic],[data-diff-topic-year],[data-topic-family],#openBrushed,#openTopicQuestions'))pyq.resetFilters();
},true);
function closeHandledCareerChart(event,handled){if(handled&&event.target.closest?.('#chartDialog'))document.getElementById('chartDialog')?.close();}
document.addEventListener('click',event=>{const handled=career.handleClick?.(event);closeHandledCareerChart(event,handled);run(handled);run(personal.handleClick?.(event));run(recruitment.handleClick?.(event));});
document.addEventListener('change',event=>{career.handleChange?.(event);personal.handleChange?.(event);recruitment.handleChange?.(event);});
document.addEventListener('input',event=>{career.handleInput?.(event);recruitment.handleInput?.(event);});
document.addEventListener('keydown',event=>{closeHandledCareerChart(event,career.handleKeyDown?.(event));});
document.addEventListener('submit',event=>{
 if(event.target.matches('[data-pyq-form]')){event.preventDefault();run(pyq.handleSubmit(event));}
 else if(event.target.matches('[data-career-form]')){event.preventDefault();run(career.handleSubmit(event));}
 else if(event.target.matches('[data-personal-form]')){event.preventDefault();run(personal.handleSubmit(event));}
 else if(event.target.matches('[data-recruitment-form]')){event.preventDefault();run(recruitment.handleSubmit(event));}
});
base.render();void refreshSession();
