/* Aurora appearance is device-local presentation state, separate from saved research views. */
window.TerminalAppearance=(()=>{
 const storageKey='gate-aurora-appearance',legacyKey='gate-v5-theme';
 const themes=Object.freeze(['obsidian','porcelain','glacier','volt']);
 const preferences=Object.freeze(['system',...themes]);
 const labels=Object.freeze({system:'System',obsidian:'Obsidian',porcelain:'Porcelain',glacier:'Glacier',volt:'Volt'});
 const canvas={obsidian:'#0B0C0E',porcelain:'#F4F1EB',glacier:'#090D16',volt:'#090B0B'};
 const listeners=new Set();let storage=null,media=null,preference='obsidian',effective='obsidian',persisted=false;
 function parse(value){
  if(typeof value!=='string')return null;
  if([...preferences,'light','dark'].includes(value))return value;
  try{const decoded=JSON.parse(value);return typeof decoded==='string'?decoded:null;}catch{return null;}
 }
 try{storage=window.localStorage;}catch{}
 try{media=window.matchMedia?.('(prefers-color-scheme: light)')||null;}catch{}
 function resolve(value){return value==='system'?(media?.matches?'porcelain':'obsidian'):value;}
 function snapshot(source='read'){return Object.freeze({preference,theme:effective,persisted,source});}
 function apply(source){
  effective=resolve(preference);
  const root=globalThis.document?.documentElement;
  if(root){root.setAttribute('data-theme',effective);if(root.style)root.style.colorScheme=effective==='porcelain'?'light':'dark';}
  const meta=globalThis.document?.querySelector?.('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',canvas[effective]);
  const state=snapshot(source);
  for(const listener of listeners)try{listener(state);}catch{}
  return state;
 }
 function persist(){try{if(!storage)return false;storage.setItem(storageKey,preference);return true;}catch{return false;}}
 let saved=null,legacy=null,readable=false;
 try{if(storage){saved=storage.getItem(storageKey);readable=true;if(saved===null)legacy=storage.getItem(legacyKey);}}catch{}
 if(saved!==null){const value=parse(saved);preference=preferences.includes(value)?value:'obsidian';persisted=readable&&value===preference;}
 else{
  const value=parse(legacy);
  if(value==='light'||value==='dark'){preference=value==='light'?'porcelain':'obsidian';persisted=persist();}
 }
 apply('initial');
 const changed=()=>{if(preference==='system')apply('system');};
 try{if(media?.addEventListener)media.addEventListener('change',changed);else media?.addListener?.(changed);}catch{}
 function setPreference(value){
  if(!preferences.includes(value))return Object.freeze({ok:false,...snapshot('invalid'),reason:'invalid_preference'});
  preference=value;persisted=persist();const state=apply('selection');
  return Object.freeze({ok:true,...state,...(!persisted?{reason:'storage_unavailable'}:{})});
 }
 return Object.freeze({storageKey,legacyKey,themes,preferences,labels,getPreference:()=>preference,getEffectiveTheme:()=>effective,getSnapshot:()=>snapshot(),setPreference,subscribe(listener){if(typeof listener!=='function')throw new TypeError('Appearance listener must be a function.');listeners.add(listener);return ()=>listeners.delete(listener);}});
})();
