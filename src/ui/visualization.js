/* Display conventions only. No statistical computation or cohort selection belongs here. */
window.TerminalVisualization=(()=>{
 const definitions={
  obsidian:{series:['#E0BE80','#80CDB9','#9ABDE8','#C3A9E8','#EC9EA8','#9ED0E5','#C7D88F','#DCA78C','#A9B5EB','#D8BCD3'],surface:'#171A1F',raised:'#22262D',text:'#F5F2EB',secondary:'#A7ADB7',grid:'#33383F',accent:'#E0BE80',positive:'#80CDB9',negative:'#EC9EA8',warning:'#E0BE80',heatLow:'#1E2929',heatHigh:'#527F70',missing:'#22262D',divergingLow:'#925D68',divergingMiddle:'#22262D',divergingHigh:'#4B8E7C',onSeries:'#15191C'},
  porcelain:{series:['#826335','#276E61','#315E9C','#76538E','#9C4159','#216B7D','#596E26','#99572E','#5155A0','#87506E'],surface:'#FFFFFF',raised:'#F8F6F1',text:'#25282D',secondary:'#626A74',grid:'#D6D0C5',accent:'#826335',positive:'#276E61',negative:'#9C4159',warning:'#826335',heatLow:'#F1F0E9',heatHigh:'#6DA695',missing:'#E7E3DC',divergingLow:'#CC92A0',divergingMiddle:'#F4F1EB',divergingHigh:'#6DA695',onSeries:'#FFFFFF'},
  glacier:{series:['#A6CAFF','#FFB38A','#81D2C2','#C0AFF2','#EDA2BA','#91C8DC','#CCD798','#DCA7D2','#9EADEA','#E0C58C'],surface:'#151D2A',raised:'#202D40',text:'#F2F6FD',secondary:'#A4B5C9',grid:'#2D4058',accent:'#A6CAFF',positive:'#81D2C2',negative:'#EDA2BA',warning:'#FFB38A',heatLow:'#192B3D',heatHigh:'#4C80B0',missing:'#202D40',divergingLow:'#9A647F',divergingMiddle:'#202D40',divergingHigh:'#4C80B0',onSeries:'#101723'},
  volt:{series:['#C5F277','#8ECBB9','#9ABDE9','#C1A5E5','#E8A3A7','#9ECFDA','#D8C184','#ADB6E8','#DBAECD','#CFB49B'],surface:'#151918',raised:'#222A26',text:'#F1F5ED',secondary:'#A6B2A9',grid:'#344037',accent:'#C5F277',positive:'#8ECBB9',negative:'#E8A3A7',warning:'#D8C184',heatLow:'#232D21',heatHigh:'#607E3D',missing:'#222A26',divergingLow:'#8E606D',divergingMiddle:'#222A26',divergingHigh:'#607E3D',onSeries:'#12180F'}
 };
 const legacySeries=[
  ['#75aac5','#a69bc4','#c2aa81','#7eada0','#b18f93','#839bbf','#a2aa7e','#a19989','#8fb1b4','#b39b7f'],
  ['#48d7e8','#a498ef','#ddb77b','#76b49c','#e19a99','#8fb4e1','#c0bc8d','#a5c0b2','#bd9dc1','#b7a58b'],
  ['#87b5cf','#b0a1ca','#c8ad7f','#86b3a2','#c0929a','#91a9cf','#b2bb89','#b2a291','#8fbfc3','#c0a27d'],
  ['#286b84','#755a96','#88652c','#37755f','#994b5c','#506ca0','#63752f','#7b6553','#367780','#876237']
 ];
 const aliases={dark:'obsidian',light:'porcelain'};
 const semanticColors={positive:['#70c9ae','#64ba9d','#28745f','#5baf97','#77bda8','#80cdb3'],warning:['#e0b769','#d2ad71','#8d6a2a','#c99f52','#dfb783','#d7b47a','#e5b879'],negative:['#dd8b98','#d88d91','#a15361','#c36a7d','#e3a1ab','#df9b91'],secondary:['#98a4b5','#b3c6df','#9bb0c9','#a7b5c7','#52667e'],surface:['#10141c','#101923','#111822','#171c23'],raised:['#1c2633'],grid:['#273243','#273b51','#293444','#40516a'],onSeries:['#182128']};
 const roleByColor=new Map();
 for(const set of [...legacySeries,...Object.values(definitions).map(d=>d.series)])set.forEach((value,i)=>roleByColor.set(value.toLowerCase(),'series:'+i));
 for(const [role,colors] of Object.entries(semanticColors))for(const color of colors)roleByColor.set(color,role);
 for(const [color,role] of Object.entries({'#7baff5':'series:0','#67ccce':'series:3','#ab98f0':'series:1','#9b8ed7':'series:1','#6999d0':'series:0','#6e92c0':'series:0','#48b8c8':'series:0','#536579':'secondary','#f1f5f9':'text'}))roleByColor.set(color,role);
 const dashPatterns=['','7 3','3 3','10 3 2 3','1 4','12 4','6 3 1 3','2 3 8 3','10 3 1 3 1 3','4 2 1 2'];
 function resolveTheme(value){const effective=window.TerminalAppearance?.getEffectiveTheme?.()||globalThis.document?.documentElement?.getAttribute?.('data-theme')||'obsidian';return Object.hasOwn(definitions,aliases[value]||value)?aliases[value]||value:Object.hasOwn(definitions,effective)?effective:'obsidian';}
 function css(theme){
  try{const root=globalThis.document?.documentElement,getStyle=globalThis.getComputedStyle||window.getComputedStyle;if(!root||!getStyle||root.getAttribute('data-theme')!==theme)return null;return getStyle(root);}catch{return null;}
 }
 function tokens(value){
  const theme=resolveTheme(value),base=definitions[theme],style=css(theme),read=(name,fallback)=>style?.getPropertyValue(name)?.trim()||fallback;
  return {theme,series:base.series.map((color,i)=>read('--chart-series-'+(i+1),color)),surface:read('--color-surface',base.surface),raised:read('--color-surface-raised',base.raised),text:read('--color-text',base.text),secondary:read('--chart-text',base.secondary),grid:read('--chart-grid',base.grid),accent:read('--color-accent',base.accent),positive:read('--chart-positive',base.positive),negative:read('--chart-negative',base.negative),warning:read('--color-warning',base.warning),heatLow:read('--heat-low',base.heatLow),heatHigh:read('--heat-high',base.heatHigh),missing:read('--heat-missing',base.missing),divergingLow:read('--chart-diverging-negative',base.divergingLow),divergingMiddle:read('--chart-diverging-neutral',base.divergingMiddle),divergingHigh:read('--chart-diverging-positive',base.divergingHigh),onSeries:read('--chart-on-series',base.onSeries)};
 }
 const palette=theme=>tokens(theme).series;
 function rgb(value){
  if(typeof value!=='string')return null;let v=value.trim().toLowerCase(),match=v.match(/^#([\da-f]{3}|[\da-f]{6})$/);
  if(match){const hex=match[1].length===3?match[1].split('').map(c=>c+c).join(''):match[1];return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));}
  match=v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);return match?[+match[1],+match[2],+match[3]]:null;
 }
 const hex=color=>'#'+color.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
 const normalize=value=>{const parsed=rgb(value);return parsed?hex(parsed):null;};
 function mix(a,b,value){const x=rgb(a),y=rgb(b),t=Math.max(0,Math.min(1,value));return x&&y?hex(x.map((v,i)=>v+(y[i]-v)*t)):a;}
 const heatWithTokens=(value,t)=>Number.isFinite(value)?mix(t.heatLow,t.heatHigh,value):t.missing;
 const divergingWithTokens=(value,t)=>Number.isFinite(value)?mix(t.divergingMiddle,value<0?t.divergingLow:t.divergingHigh,Math.abs(value)):t.missing;
 function heatColor(value,theme){return heatWithTokens(value,tokens(theme));}
 function divergingColor(value,theme){return divergingWithTokens(value,tokens(theme));}
 function luminance(value){const values=rgb(value)?.map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return values?.reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0)??0;}
 const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
 const textWithTokens=(background,t)=>contrast(background,t.text)>=4.5?t.text:contrast(background,'#000000')>contrast(background,'#FFFFFF')?'#000000':'#FFFFFF';
 function textFor(background,theme){return textWithTokens(background,tokens(theme));}
 function colorFor(role,t){if(role?.startsWith('series:'))return t.series[Number(role.slice(7))%10];return t[role]||null;}
 function infer(value){return roleByColor.get(normalize(value))||null;}
 function setRole(mark,attribute,t,explicit){
  const key='data-ui-color-'+attribute;let role=explicit||mark.getAttribute(key);
  if(!role){role=infer(mark.getAttribute(attribute));if(role)mark.setAttribute(key,role);}
  const color=colorFor(role,t);if(color){mark.setAttribute(attribute,color);if(attribute==='fill'&&mark.tagName?.toLowerCase()==='text')mark.style?.setProperty('fill',color);}
  return role;
 }
 function styleColor(mark,property,t){
  if(!mark.style?.getPropertyValue)return;
  const key='data-ui-style-'+property.replace(/^--/,''),stored=mark.getAttribute(key),value=mark.style.getPropertyValue(property);
  let role=stored||infer(value);if(!role)return;
  if(!stored)mark.setAttribute(key,role);const color=colorFor(role,t);if(color)mark.style.setProperty(property,color);
 }
 function heatBackground(mark,t){
  if(!mark.style?.getPropertyValue)return;
  let role=mark.getAttribute('data-ui-heat-role'),raw=mark.getAttribute('data-ui-heat-level');
  if(mark.hasAttribute('data-ui-heat')){const declared=mark.getAttribute('data-ui-heat');role=declared==='missing'?'missing':'sequential';raw=declared==='missing'?'0':declared;mark.setAttribute('data-ui-heat-role',role);mark.setAttribute('data-ui-heat-level',raw);}
  if(!role){
   const value=mark.style.getPropertyValue('background')||mark.style.getPropertyValue('background-color'),p=rgb(value),alpha=Number(value.match(/rgba\([^)]*[,/]\s*([\d.]+)\s*\)/i)?.[1]);
   if(!p)return;const key=p.join(',');
   if(key==='90,142,201'&&Number.isFinite(alpha)){role='sequential';raw=String(Math.max(0,(alpha-.05)/.65));}
   else if(key==='95,155,207'&&Number.isFinite(alpha)){role='diverging';raw=String(alpha/.55);}
   else if(key==='197,139,91'&&Number.isFinite(alpha)){role='diverging';raw=String(-alpha/.45);}
   else if(key==='91,175,151'){role='positive';raw=String(Number.isFinite(alpha)?alpha:.35);}
   else if(key==='201,159,82'){role='warning';raw=String(Number.isFinite(alpha)?alpha:.4);}
   else if(key==='195,106,125'){role='negative';raw=String(Number.isFinite(alpha)?alpha:.6);}
   else if(normalize(value)==='#1c2633'){role='missing';raw='0';}
   else return;
   mark.setAttribute('data-ui-heat-role',role);mark.setAttribute('data-ui-heat-level',raw);
  }
  const level=Number(raw),background=role==='sequential'?heatWithTokens(level,t):role==='diverging'?divergingWithTokens(level,t):role==='missing'?t.missing:mix(t.surface,t[role],Math.min(.5,level));
  mark.style.setProperty('background',background);mark.style.setProperty('color',textWithTokens(background,t));
  if(role==='missing'){mark.setAttribute('data-ui-missing','true');mark.style.setProperty('background-image','repeating-linear-gradient(135deg, transparent, transparent 5px, var(--color-border-subtle) 5px, var(--color-border-subtle) 6px)');}
  return true;
 }
 function apply(root,value){
  if(!root?.querySelectorAll)return;const t=tokens(value);
  const plots=[...(root.matches?.('svg[role="img"],svg.chart')?[root]:[]),...root.querySelectorAll('svg[role="img"],svg.chart')];
  for(const svg of plots){
   for(const mark of svg.querySelectorAll('[fill],[stroke],[style],[data-ui-series-index],[data-ui-semantic]')){
    const index=mark.getAttribute('data-ui-series-index'),semantic=mark.getAttribute('data-ui-semantic'),explicit=index!==null&&/^\d$/.test(index)?'series:'+index:semantic&&['accent','positive','negative','warning','secondary','onSeries','muted'].includes(semantic)?semantic==='muted'?'secondary':semantic:null;
    const target=mark.getAttribute('data-ui-theme-attr');let role;
    for(const attr of ['fill','stroke'])if(mark.hasAttribute(attr)&&(!explicit||!target||target==='both'||target===attr)){
     const raw=mark.getAttribute(attr);role=setRole(mark,attr,t,explicit&&raw!=='none'&&!raw?.startsWith('var(')?explicit:null)||role;
    }
    styleColor(mark,'fill',t);styleColor(mark,'stroke',t);styleColor(mark,'color',t);
    if(role?.startsWith('series:')&&['polyline','path'].includes(mark.tagName?.toLowerCase())&&!mark.hasAttribute('stroke-dasharray')){const pattern=dashPatterns[Number(role.slice(7))];if(pattern)mark.setAttribute('stroke-dasharray',pattern);}
   }
  }
  for(const mark of root.querySelectorAll('[style],[data-ui-heat]')){const heat=heatBackground(mark,t);for(const property of heat?['--series','border-color']:['--series','background','background-color','color','border-color'])styleColor(mark,property,t);}
  for(const mark of root.querySelectorAll('[data-ui-tooltip]'))if(mark.matches('[tabindex]'))mark.setAttribute('aria-describedby','chartTooltip');
 }
 // A standalone SVG cannot inherit the application's CSS. Preserve class-based
 // strokes, labels, scenario colors and final marker transforms in its clone.
 function inlineSvgAppearance(source,copy,readStyle=node=>getComputedStyle(node)){
  const originals=[source,...source.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')];
  const properties=['fill','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','paint-order','font-family','font-size','font-weight','text-anchor','dominant-baseline','visibility','transform','transform-origin','transform-box','vector-effect','filter'];
  for(let index=0;index<Math.min(originals.length,copies.length);index++){
   let computed;try{computed=readStyle(originals[index]);}catch{continue;}
   for(const property of properties){
    const targetTransform=property==='transform'?originals[index].style?.getPropertyValue('transform'):'';
    const value=targetTransform||computed?.getPropertyValue?.(property);
    if(value&&!value.includes('var('))copies[index].style?.setProperty(property,value);
   }
   copies[index].style?.setProperty('transition','none');copies[index].style?.setProperty('animation','none');
  }
  return copy;
 }
 const exportTheme=theme=>{const t=tokens(theme);return {theme:t.theme,background:t.surface,text:t.secondary,grid:t.grid,accent:t.accent};};
 return Object.freeze({palette,tokens,apply,heatColor,divergingColor,textFor,contrast,exportTheme,inlineSvgAppearance,number:(value,digits=1)=>Number.isFinite(value)?new Intl.NumberFormat('en',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value):'—',units:Object.freeze({allocation:'marks / paper',difficulty:'content score / 100',sample:'annual papers'})});
})();
