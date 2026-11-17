/** Source-level render harness. This is not a browser and cannot certify layout. */
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createCareerFeature} from '../src/features/career.mjs';
import {createPersonalFeature} from '../src/features/personal.mjs';
import {createPyqFeature} from '../src/features/pyq.mjs';
import {createRecruitmentFeature} from '../src/features/recruitment.mjs';
import {createAtlasFeature} from '../src/features/atlas.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const PART2_CHECKPOINT='39140840451e516513c1edfa4110522fa7667991';
const baselineManifest=JSON.parse(readFileSync(new URL('../vendor/aurora-baseline-manifest.json',import.meta.url),'utf8'));
export function readSource(path,baseline=false){
 const archived=baseline&&baselineManifest.files.find(file=>file.path===path);
 if(!archived)return readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const bytes=execFileSync('tar',['-xOf',fileURLToPath(new URL('../vendor/aurora-part2-presentation.tar.gz',import.meta.url)),path],{cwd:root,maxBuffer:20*1024*1024});
 if(createHash('sha256').update(bytes).digest('hex')!==archived.sha256)throw Error('Archived Part 2 presentation checksum failed: '+path);
 return bytes.toString('utf8');
}
const tokenSource=()=>readSource('src/ui/tokens.css');
export function themeTokens(theme){
 const result=new Map();
 for(const [,selector,body] of tokenSource().matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const normalized=selector.trim();
  if(normalized===':root'||normalized.startsWith(':root,:root[data-theme="obsidian"]')||normalized.startsWith(':root[data-theme="'+theme+'"]'))for(const [,key,value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g))result.set(key,value.trim());
 }
 return result;
}
export function createResearchHost({theme='obsidian',baseline=false,features=true}={}){
 const elements=new Map(),handlers=new Map(),windowHandlers=new Map();
 function element(selector){
  if(elements.has(selector))return elements.get(selector);
  const attributes=new Map(),properties=new Map(),classes=new Set();let html='';
  const node={value:selector==='#from'?'2019':selector==='#to'?'2026':['#subject','#quality'].includes(selector)?'all':'',textContent:'',dataset:{},writes:0,hidden:false,open:false,
   get innerHTML(){return html},set innerHTML(value){html=String(value);this.writes++},
   setAttribute(key,value){attributes.set(key,String(value))},getAttribute:key=>attributes.get(key)??null,removeAttribute:key=>attributes.delete(key),hasAttribute:key=>attributes.has(key),
   classList:{add:(...values)=>values.forEach(v=>classes.add(v)),remove:(...values)=>values.forEach(v=>classes.delete(v)),toggle(value,force){const next=force??!classes.has(value);next?classes.add(value):classes.delete(value);return next},contains:value=>classes.has(value)},
   style:{setProperty:(key,value)=>properties.set(key,String(value)),getPropertyValue:key=>properties.get(key)||''},
   insertAdjacentHTML(_position,value){html+=value},querySelector:child=>element(selector+' '+child),querySelectorAll:()=>[],remove(){this.removed=true},focus(){document.activeElement=this},setSelectionRange(){},showModal(){this.open=true},close(){this.open=false},getClientRects:()=>[{}]};
  elements.set(selector,node);return node;
 }
 const document={querySelector:element,getElementById:id=>element('#'+id),querySelectorAll:()=>[],addEventListener:(name,handler)=>handlers.set(name,[...(handlers.get(name)||[]),handler]),body:element('body'),documentElement:element('html'),activeElement:null};
 const storage=new Map([['gate-aurora-appearance',theme],['gate-v5-theme',JSON.stringify('dark')]]),localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))};
 const window={localStorage,addEventListener:(name,handler)=>windowHandlers.set(name,[...(windowHandlers.get(name)||[]),handler]),matchMedia:()=>({matches:false,addEventListener(){}})};
 const context=vm.createContext({window,document,location:{hash:'#monitor',search:''},localStorage,URLSearchParams,URL,Intl,setTimeout(){},clearTimeout(){},console,getComputedStyle:()=>({getPropertyValue:key=>themeTokens(document.documentElement.getAttribute('data-theme')).get(key)||''})});
 const scripts=['research-data.js','difficulty-data.js','difficulty.js','difficulty-extras.js','topic-ledger.js','terminal.js','quality-data.js','quality.js','study.js','trading.js','atlas.js','workspace.js','v5-math.js','v5.js','ui-icons.js','foundation.js','interface.js'];
 if(!baseline)vm.runInContext(readSource('dist/appearance.js'),context,{filename:'dist/appearance.js'});
 for(const file of scripts)vm.runInContext(readSource('dist/'+file,baseline),context,{filename:'dist/'+file});
 const run=code=>vm.runInContext(code,context);
 const session={status:'unavailable',user:null,csrfToken:null,capabilities:{}};
 window.TerminalFeatureSession=session;
 const base=window.TerminalResearchBridge;
 const bridge={...base,params:()=>new URLSearchParams(context.location.hash.split('?')[1]||''),session:()=>session,api:async()=>{throw Error('The published account backend is not connected.')},refreshSession:async()=>session,navigate(id,values={}){context.location.hash='#'+id+'?'+new URLSearchParams(values);run('render()')}};
 let modules=[];
 if(features&&!baseline){modules=[createCareerFeature(bridge),createPersonalFeature(bridge),createPyqFeature(bridge),createRecruitmentFeature(bridge),createAtlasFeature(bridge)];for(const feature of modules)base.register(feature);base.installQuestionFilter(rows=>modules[2].filterRows(rows));}
 function render(route='monitor',params={}){context.location.hash='#'+route+(Object.keys(params).length?'?'+new URLSearchParams(params):'');run('render()');return element('#content').innerHTML;}
 function markup(){
  let content=element('#content').innerHTML;
  if(!baseline){const viz=window.TerminalVisualization;content=content.replace(/<button\b([^>]*data-ui-heat="([^"]*)"[^>]*)>/g,(_match,attrs,value)=>{const background=viz.heatColor(value==='missing'?null:Number(value),theme),foreground=viz.textFor(background,theme);return '<button'+attrs.replace(/style="([^"]*)"/,(_style,css)=>'style="'+css+';background:'+background+';color:'+foreground+'"')+'>';});}
  const select=(id,label,values)=>'<label>'+label+' <select id="'+id+'">'+values.map(value=>'<option '+(String(value)===String(element('#'+id).value)?'selected':'')+'>'+value+'</option>').join('')+'</select></label>';
  const scope='<div class="scope-bar filter-bar"><span class="filter-label">Scope</span>'+select('from','From',run('R.years'))+select('to','To',run('R.years'))+select('subject','Subject',['all',...run('R.subjects')])+select('quality','Review',['all','clear','changed'])+'<button class="button" id="reset">Reset</button></div>';
  return '<aside id="appSidebar">'+element('body>aside').innerHTML+'</aside><div class="app"><header>'+element('header').innerHTML+'</header><main id="mainContent"><div class="page-top"><div>'+element('.page-top>div:first-child').innerHTML+'</div></div>'+(element('.scope-bar').hidden?'':scope)+'<div id="content">'+content+'</div><footer>'+element('footer').innerHTML+'</footer></main></div>';
 }
 return {context,document,window,elements,element,handlers,run,render,markup,modules,storage};
}
