import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/app/appearance.js',import.meta.url),'utf8');
function environment({values={},light=false,denied=false,writeDenied=false,legacyMedia=false,missingMedia=false}={}){
 const stored=new Map(Object.entries(values)),attributes=new Map(),meta=new Map(),writes=[],media={matches:light},handlers=new Set();
 if(legacyMedia)media.addListener=listener=>handlers.add(listener);else media.addEventListener=(type,listener)=>{assert.equal(type,'change');handlers.add(listener)};
 const root={setAttribute:(key,value)=>attributes.set(key,value),getAttribute:key=>attributes.get(key)??null,style:{}};
 const document={documentElement:root,querySelector:selector=>{assert.equal(selector,'meta[name="theme-color"]');return {setAttribute:(key,value)=>meta.set(key,value)}}};
 const location={hash:'#questions?subject=Networks&year=2025'},research={selectedQuestion:'GATE-EC-2025-Q01',filters:{subject:'Networks',from:2024,to:2025},draft:'unsaved answer'},window={};
 Object.defineProperty(window,'localStorage',{get:()=>{if(denied)throw Error('blocked');return {getItem:key=>stored.get(key)??null,setItem:(key,value)=>{if(writeDenied)throw Error('quota');writes.push({key,value});stored.set(key,value)}}}});
 if(!missingMedia)window.matchMedia=query=>{assert.equal(query,'(prefers-color-scheme: light)');return media};
 const context=vm.createContext({window,document,location,research});vm.runInContext(source,context);
 return {api:window.TerminalAppearance,stored,attributes,root,meta,writes,location,research,change(value){media.matches=value;for(const handler of handlers)handler({matches:value})}};
}
test('fresh appearance applies Obsidian before body creation without following OS unless System is selected',()=>{
 const env=environment({light:true});assert.equal(env.api.getPreference(),'obsidian');assert.equal(env.api.getEffectiveTheme(),'obsidian');assert.equal(env.attributes.get('data-theme'),'obsidian');assert.equal(env.root.style.colorScheme,'dark');assert.equal(env.meta.get('content'),'#0B0C0E');assert.equal(env.writes.length,0);
});
test('all four explicit themes apply, persist, refresh and preserve route and research object state',()=>{
 const env=environment(),filters=env.research.filters;for(const theme of ['obsidian','porcelain','glacier','volt']){
  const result=env.api.setPreference(theme);assert.equal(result.ok,true);assert.equal(result.persisted,true);assert.equal(env.attributes.get('data-theme'),theme);assert.equal(env.api.getEffectiveTheme(),theme);assert.equal(env.stored.get(env.api.storageKey),theme);
  const reloaded=environment({values:Object.fromEntries(env.stored),light:true});assert.equal(reloaded.api.getPreference(),theme);assert.equal(reloaded.api.getEffectiveTheme(),theme);
 }
 assert.equal(env.location.hash,'#questions?subject=Networks&year=2025');assert.equal(env.research.filters,filters);assert.equal(env.research.draft,'unsaved answer');assert.equal(env.research.selectedQuestion,'GATE-EC-2025-Q01');
});
test('System resolves to Porcelain or Obsidian and responds to OS changes while explicit choices remain stable',()=>{
 const env=environment();const events=[];const unsubscribe=env.api.subscribe(value=>events.push(value));env.api.setPreference('system');assert.equal(env.api.getEffectiveTheme(),'obsidian');env.change(true);assert.equal(env.api.getEffectiveTheme(),'porcelain');assert.equal(env.api.getPreference(),'system');assert.equal(events.at(-1).source,'system');assert.equal(env.root.style.colorScheme,'light');env.change(false);assert.equal(env.api.getEffectiveTheme(),'obsidian');
 env.api.setPreference('glacier');const n=events.length;env.change(true);assert.equal(env.api.getEffectiveTheme(),'glacier');assert.equal(events.length,n);unsubscribe();env.api.setPreference('volt');assert.equal(events.length,n);
});
test('saved System uses the first-paint OS appearance and supports legacy media-query listeners',()=>{
 const env=environment({values:{'gate-aurora-appearance':'system'},light:true,legacyMedia:true});assert.equal(env.attributes.get('data-theme'),'porcelain');env.change(false);assert.equal(env.api.getEffectiveTheme(),'obsidian');assert.equal(environment({values:{'gate-aurora-appearance':'system'},missingMedia:true}).api.getEffectiveTheme(),'obsidian');
});
test('old plain or JSON encoded light/dark preferences migrate deterministically to an independent key',()=>{
 for(const [old,theme] of [['light','porcelain'],['dark','obsidian']])for(const stored of [old,JSON.stringify(old)]){
  const env=environment({values:{'gate-v5-theme':stored,'gate-v5-state':'original research view'}});assert.equal(env.api.getPreference(),theme);assert.equal(env.stored.get('gate-aurora-appearance'),theme);assert.equal(env.stored.get('gate-v5-theme'),stored);assert.equal(env.stored.get('gate-v5-state'),'original research view');assert.deepEqual(env.writes,[{key:'gate-aurora-appearance',value:theme}]);
 }
 const preferred=environment({values:{'gate-aurora-appearance':'volt','gate-v5-theme':'"light"'}});assert.equal(preferred.api.getPreference(),'volt');assert.equal(preferred.writes.length,0);
});
test('invalid new or old values fail safely; invalid selections leave the current appearance untouched',()=>{
 for(const value of ['invalid','toString','constructor','__proto__','{}','null','4','"dark"']){const env=environment({values:{'gate-aurora-appearance':value,'gate-v5-theme':'"light"'}});assert.equal(env.api.getPreference(),'obsidian');assert.equal(env.api.getSnapshot().persisted,false);}
 const env=environment({values:{'gate-v5-theme':'invalid'}});env.api.setPreference('glacier');for(const value of [null,{},'light','invalid','__proto__']){const result=env.api.setPreference(value);assert.equal(result.ok,false);assert.equal(result.reason,'invalid_preference');assert.equal(env.api.getEffectiveTheme(),'glacier');}
 assert.throws(()=>env.api.subscribe(null),/function/);
});
test('denied storage, quota failures and throwing subscribers preserve the session selection',()=>{
 for(const options of [{denied:true},{writeDenied:true}]){const env=environment(options);env.api.subscribe(()=>{throw Error('subscriber')});const result=env.api.setPreference('volt');assert.equal(result.ok,true);assert.equal(result.persisted,false);assert.equal(result.reason,'storage_unavailable');assert.equal(env.api.getPreference(),'volt');assert.equal(env.attributes.get('data-theme'),'volt');}
});
