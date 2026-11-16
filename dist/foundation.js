/* Framework-neutral HTML components. Trusted *Html props are internal renderer output only. */
window.TerminalComponents=(()=>{
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=name=>'<span class="ui-icon" aria-hidden="true">'+(window.UI_ICONS?.[name]||'')+'</span>';
 const SourceBadge=({label,iconName='circle-check',variant='quiet'})=>'<span class="source-badge badge-'+escape(variant)+'">'+icon(iconName)+escape(label)+'</span>';
 const ConfidenceBadge=({level})=>'<span class="confidence-badge confidence-'+escape(['high','medium','low'].includes(level)?level:'unavailable')+'">'+escape(level||'Unavailable')+' confidence</span>';
 const StatCard=({label,valueHtml,detailHtml='',variant=''})=>'<div class="metric '+escape(variant)+'"><span class="metric-label">'+escape(label)+'</span><strong class="metric-number">'+valueHtml+'</strong><span class="metric-detail">'+detailHtml+'</span></div>';
 const SegmentedControl=({items,selected,attribute})=>{if(!/^data-[a-z][a-z0-9_-]*$/.test(attribute))throw new TypeError('Expected a data-* action attribute');return '<div class="segmented-control">'+items.map(([value,label])=>'<button '+attribute+'="'+escape(value)+'" aria-pressed="'+(value===selected)+'">'+escape(label)+'</button>').join('')+'</div>';};
 const PageHeader=({title,description,eyebrow=''})=>'<div class="overline" id="overline">'+escape(eyebrow)+'</div><h1 id="title">'+escape(title)+'</h1><p id="subtitle">'+escape(description)+'</p>';
 const EmptyState=({title,description,actionHtml=''})=>'<div class="empty-state">'+icon('search')+'<strong>'+escape(title)+'</strong><p>'+escape(description)+'</p>'+actionHtml+'</div>';
 const ErrorState=({title='This view could not be loaded',description='Try loading the workspace again.',actionHtml=''})=>'<section class="error-state" role="alert">'+icon('circle-alert')+'<h2>'+escape(title)+'</h2><p>'+escape(description)+'</p>'+actionHtml+'</section>';
 const LoadingSkeleton=({label='Loading research workspace'})=>'<section class="loading-state" role="status" aria-label="'+escape(label)+'"><span>'+escape(label)+'</span><div class="skeleton-line"></div><div class="skeleton-grid">'+Array.from({length:4},()=>'<i></i>').join('')+'</div><div class="skeleton-chart"></div></section>';
 const DetailDrawer=({title='Question details'})=>'<div class="drawer-header"><span>'+escape(title)+'</span><button class="icon-button" data-ui-action="close-drawer" aria-label="Close question details">'+icon('x')+'</button></div>';
 const DataTable=({headers,rowsHtml,caption=''})=>'<div class="table-scroll"><table class="data-table">'+(caption?'<caption>'+escape(caption)+'</caption>':'')+'<thead><tr>'+headers.map(h=>'<th scope="col">'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+rowsHtml+'</tbody></table></div>';
 const ChartPanel=({title,description='',bodyHtml,footHtml='',toolsHtml='',className=''})=>{
  const hasPlot=/<svg\b[^>]*(?:role=["']img|class=["'][^"']*chart)/.test(bodyHtml);
  const actions=hasPlot?'<button class="icon-button" data-ui-action="expand-chart" aria-label="Expand '+escape(title)+'">'+icon('expand')+'</button><details class="chart-menu"><summary class="icon-button" aria-label="Download '+escape(title)+'">'+icon('more-horizontal')+'</summary><div class="popover-menu"><button data-chart-export="svg">'+icon('download')+'Download SVG</button><button data-chart-export="png">'+icon('download')+'Download PNG</button></div></details>':'';
  return '<section class="panel ui-chart-panel v5-chart-panel '+escape(className)+'"><div class="panel-head"><div><h2>'+escape(title)+'</h2>'+(description?'<p class="panel-description">'+escape(description)+'</p>':'')+'</div><div class="panel-tools">'+toolsHtml+actions+'</div></div><div class="chart-body">'+bodyHtml+'</div>'+(footHtml?'<div class="panel-foot">'+footHtml+'</div>':'')+'</section>';
 };
 const AppSidebar=({brandHtml,navigationHtml,footerHtml})=>'<div class="sidebar-head">'+brandHtml+'</div><div class="sidebar-navigation">'+navigationHtml+'</div><div class="sidebar-bottom">'+footerHtml+'</div>';
 const WorkspaceHeader=({startHtml,actionsHtml})=>'<div class="toolbar-start">'+startHtml+'</div><div class="toolbar-actions">'+actionsHtml+'</div>';
 const AppShell=({sidebar,header,sidebarHtml,headerHtml})=>{if(sidebar.innerHTML!==sidebarHtml)sidebar.innerHTML=sidebarHtml;if(header.innerHTML!==headerHtml)header.innerHTML=headerHtml;};
 const FilterToolbar=({node})=>{node.classList.add('filter-bar');node.setAttribute('aria-label','Research scope filters');};
 const SearchCommand=({top,input,help})=>{top.querySelector('span').innerHTML=icon('search');input.placeholder='Search research, questions or commands…';help.innerHTML='<span>↑ ↓ Navigate <i>·</i> Enter Open</span><span>Esc Close</span>';};
 // Presentation-only gate. A future server must authenticate and authorize every private request.
 const ProtectedRoute=({authorized,contentHtml,deniedHtml})=>authorized===true?contentHtml:(deniedHtml||'');
 return Object.freeze({escape,icon,AppShell,AppSidebar,WorkspaceHeader,PageHeader,StatCard,ChartPanel,FilterToolbar,DataTable,SearchCommand,SegmentedControl,SourceBadge,ConfidenceBadge,DetailDrawer,EmptyState,LoadingSkeleton,ErrorState,ProtectedRoute});
})();


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


/* One route catalogue; backend access is enforced separately from navigation. */
window.TerminalRoutes=(()=>{
 const entry=(id,label,icon,routes=[id],access='public')=>({id,label,icon,routes,status:'available',access});
 const groups=[
 {id:'research',label:'Research',items:[entry('monitor','Overview','layout-dashboard'),entry('explorer','Research Explorer','activity',['explorer','difficulty']),entry('subjects','Subject Analytics','chart-no-axes-combined',['subjects','compare']),entry('lab','Statistical Lab','flask-conical',['lab','distributions','inference','responses']),entry('questions','PYQ Intelligence','network',['questions','topics']),entry('scenarios','Scenario Lab','sliders-horizontal')]},
 {id:'career',label:'Career intelligence',items:[entry('rank','Rank Intelligence','chart-no-axes-combined'),entry('admissions','Admissions','file-text'),entry('institutes','Institutes','database'),entry('psu','PSU Explorer','activity'),entry('recruitment','Technical Careers','briefcase-business',['recruitment','technical-exams','recruiters','recruitment-detail'])]},
 {id:'personal',label:'Personal workspace',items:[entry('dashboard','Dashboard','layout-dashboard',['dashboard','profile'],'authenticated'),entry('planner','Study Planner','rows-3',['planner'],'authenticated'),entry('mocks','Mock Analytics','chart-no-axes-combined',['mocks'],'authenticated'),entry('reminders','Reminders','circle-alert',['reminders'],'authenticated')]},
 {id:'recruitment-workspace',label:'Recruitment workspace',items:[entry('recruitment-preferences','Career Preferences','sliders-horizontal',['recruitment-preferences'],'authenticated'),entry('recruitment-saved','Saved Opportunities','bookmark',['recruitment-saved'],'authenticated'),entry('recruitment-notifications','Career Notifications','bell',['recruitment-notifications'],'authenticated')]},
 {id:'community',label:'Community',items:[entry('forum','Discussion Forum','rows-3')]},
 {id:'system',label:'System',items:[entry('audit','Data Integrity','database',['audit','evidence','reports']),entry('settings','Settings','sliders-horizontal')]}];
 const restricted=[entry('admin','Owner Analytics','activity',['admin'],'owner')];
 const working=groups.flatMap(g=>g.items),future=[];
 const aliases={'predictor':'rank','rank-predictor':'rank','psu-cutoffs':'psu','alerts':'reminders','pyqs':'questions','pyq-bank':'questions','admin/metrics':'admin','dashboard/settings':'profile'};
 const canonicalId=id=>Object.hasOwn(aliases,id)?aliases[id]:id;
 const find=id=>[...working,...restricted].find(i=>i.routes.includes(canonicalId(id)))||null;
 const resolve=id=>{const canonical=canonicalId(id),item=find(canonical);return {id:canonical,entry:item,status:item?'available':'not-found'};};
 const researchExports=new Set(['monitor','explorer','subjects','topics','questions','difficulty','compare','lab','distributions','inference','responses','scenarios','audit','reports']);
 const canExport=(route,responseReady)=>researchExports.has(canonicalId(route))&&(canonicalId(route)!=='responses'||responseReady===true);
 const visibleGroups=owner=>owner===true?[...groups,{id:'owner',label:'Owner',items:restricted}]:groups;
 const commandEntries=owner=>visibleGroups(owner).flatMap(g=>g.items);
 return Object.freeze({groups,working,future,restricted,aliases,canonicalId,find,resolve,canExport,visibleGroups,commandEntries});
})();


/* Browser-local saved-view validation. No DOM, engine state, network or implicit storage access. */
window.TerminalPreferences=(()=>{
  const rootKeys=['route','scope','query','verdict','questionDisplay','questionContext','difficulty','research','issueFilter'];
  const scopeKeys=['from','to','subject','quality'];
  const forbidden=new Set(['__proto__','constructor','prototype']);
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const failure=(code,message,path)=>({ok:false,error:{code,message,...(path?{path}:{})}});
  const issue=(message,path)=>{throw {preferenceValidation:true,message,path};};
  function isRecord(value){
    if(value===null||typeof value!=='object'||Array.isArray(value))return false;
    const prototype=Object.getPrototypeOf(value);
    if(prototype===null)return true;
    const constructor=Object.getOwnPropertyDescriptor(prototype,'constructor');
    return Object.getPrototypeOf(prototype)===null&&constructor&&'value'in constructor&&typeof constructor.value==='function'&&constructor.value.name==='Object';
  }
  function jsonValue(value,path='',seen=new Set(),depth=0){
    if(depth>64)issue('Saved view nesting is too deep.',path);
    if(value===null||typeof value==='string'||typeof value==='boolean')return;
    if(typeof value==='number'){if(!Number.isFinite(value))issue('Expected a finite number.',path);return;}
    if(typeof value!=='object')issue('Expected a JSON value.',path);
    if(seen.has(value))issue('Saved view contains a cycle.',path);
    if(!Array.isArray(value)&&!isRecord(value))issue('Expected a plain state record.',path);
    seen.add(value);
    for(const key of Reflect.ownKeys(value)){
      if(typeof key!=='string'||forbidden.has(key))issue('Unsupported state key.',path);
      if(Array.isArray(value)&&key==='length')continue;
      if(Array.isArray(value)&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=value.length))issue('Unsupported array property.',path+'.'+key);
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor||!('value'in descriptor))issue('State accessors are not supported.',path?path+'.'+key:key);
      jsonValue(descriptor.value,path?path+'.'+key:key,seen,depth+1);
    }
    if(Array.isArray(value))for(let i=0;i<value.length;i++)if(!own(value,String(i)))issue('Sparse state arrays are not supported.',path);
    seen.delete(value);
  }
  function match(value,template,path){
    if(template===null){if(value!==null&&typeof value!=='string')issue('Expected text or null.',path);return;}
    if(Array.isArray(template)){
      if(!Array.isArray(value))issue('Expected a state array.',path);
      if(!template.length){if(value.length)issue('Expected an empty state array.',path);return;}
      for(let i=0;i<value.length;i++)match(value[i],template[0],path+'.'+i);
      return;
    }
    if(isRecord(template)){
      if(!isRecord(value))issue('Expected a state record.',path);
      const expected=Object.keys(template),actual=Object.keys(value);
      for(const key of actual)if(!own(template,key))issue('Unknown state key.',path+'.'+key);
      for(const key of expected){if(!own(value,key))issue('Required state field is missing.',path+'.'+key);match(value[key],template[key],path+'.'+key);}
      return;
    }
    if(typeof value!==typeof template)issue('State value has the wrong primitive type.',path);
    if(typeof value==='number'&&!Number.isFinite(value))issue('Expected a finite number.',path);
  }
  function constraints(snapshot,templates){
    const difficulty=snapshot.difficulty,research=snapshot.research;
    if(own(difficulty,'easy')||own(difficulty,'tough')){
      if(typeof difficulty.easy!=='number'||typeof difficulty.tough!=='number'||difficulty.easy<0||difficulty.tough>100||difficulty.easy>=difficulty.tough)issue('Difficulty bounds must satisfy 0 ≤ easy < tough ≤ 100.','difficulty');
    }
    if(own(research,'seed')&&!Number.isInteger(research.seed))issue('The resampling seed must be an integer.','research.seed');
    if(own(research,'iterations')&&(!Number.isInteger(research.iterations)||research.iterations<200||research.iterations>10000))issue('Use 200–10,000 integer resamples.','research.iterations');
    if(own(research,'multipliers')){
      if(!Array.isArray(research.multipliers)||research.multipliers.length!==templates.research.multipliers.length||research.multipliers.some(value=>typeof value!=='number'||!Number.isFinite(value)||value<0||value>5)||!research.multipliers.some(value=>value>0))issue('Multipliers must match the subject count, stay within 0–5, and include a positive value.','research.multipliers');
    }
  }
  /**
   * create({storage, allowedRoutes, scopeOptions:{from,to,subject,quality},
   *   templates:{questionContext,difficulty,research}, key?})
   * `storage` may be a Storage-like object or a function returning one; a function
   * lets a denied window.localStorage getter become a discriminated error.
   * Templates are copied once. A null template field represents nullable text;
   * nonempty arrays specify their item shape using the first template item.
   */
  function create(options={}){
    let configError=null,allowedRoutes,scopeOptions,templates,key;
    try{
      key=options.key===undefined?'gate-v5-saved-view':options.key;
      if(typeof key!=='string'||!key)issue('A storage key is required.','key');
      if(!Array.isArray(options.allowedRoutes)||!options.allowedRoutes.length||options.allowedRoutes.some(value=>typeof value!=='string'||!value))issue('Provide implemented route IDs.','allowedRoutes');
      allowedRoutes=new Set(options.allowedRoutes);
      if(!isRecord(options.scopeOptions))issue('Provide valid scope options.','scopeOptions');
      scopeOptions=scopeKeys.map(name=>{
        const values=options.scopeOptions[name];
        if(!Array.isArray(values)||!values.length||values.some(value=>!['string','number'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value)))issue('Provide valid options for '+name+'.','scopeOptions.'+name);
        if((name==='from'||name==='to')&&values.some(value=>!Number.isFinite(Number(value))))issue('Year scope options must be numeric.','scopeOptions.'+name);
        return new Set(values.map(String));
      });
      if(!isRecord(options.templates)||Object.keys(options.templates).some(name=>!['questionContext','difficulty','research'].includes(name)))issue('Provide the three state templates.','templates');
      for(const name of ['questionContext','difficulty','research'])if(!isRecord(options.templates[name]))issue('Provide a state record template.','templates.'+name);
      jsonValue(options.templates,'templates');
      templates=JSON.parse(JSON.stringify(options.templates));
    }catch(error){configError=failure('invalid-configuration',error?.preferenceValidation?error.message:'Saved-view validation is not configured.',error?.path);}
    function validate(snapshot){
      if(configError)return configError;
      try{
        jsonValue(snapshot);
        if(!isRecord(snapshot))issue('Expected a saved-view record.','view');
        for(const field of Object.keys(snapshot))if(!rootKeys.includes(field))issue('Unknown saved-view field.',field);
        for(const field of rootKeys)if(!own(snapshot,field))issue('Required saved-view field is missing.',field);
        for(const field of ['route','query','verdict','questionDisplay','issueFilter'])if(typeof snapshot[field]!=='string')issue('Expected a text value.',field);
        if(!allowedRoutes.has(snapshot.route))issue('This saved route is unavailable.','route');
        if(!Array.isArray(snapshot.scope)||snapshot.scope.length!==4)issue('Expected four scope values.','scope');
        for(let i=0;i<4;i++)if(typeof snapshot.scope[i]!=='string'||!scopeOptions[i].has(snapshot.scope[i]))issue('This scope option is unavailable.','scope.'+scopeKeys[i]);
        if(Number(snapshot.scope[0])>Number(snapshot.scope[1]))issue('The first year must not exceed the last year.','scope');
        for(const field of ['questionContext','difficulty','research'])match(snapshot[field],templates[field],field);
        constraints(snapshot,templates);
        return {ok:true,value:JSON.parse(JSON.stringify(snapshot))};
      }catch(error){return failure('invalid-view',error?.preferenceValidation?error.message:'The saved view could not be validated.',error?.path);}
    }
    function storage(){
      try{
        const value=typeof options.storage==='function'?options.storage():options.storage;
        if(!value||typeof value.getItem!=='function'||typeof value.setItem!=='function')return failure('unavailable','Local saved views are unavailable in this browser.');
        return {ok:true,value};
      }catch{return failure('unavailable','Browser storage access is blocked.');}
    }
    function save(snapshot){
      const valid=validate(snapshot);if(!valid.ok)return valid;
      const target=storage();if(!target.ok)return target;
      try{target.value.setItem(key,JSON.stringify(valid.value));return valid;}
      catch{return failure('write-failed','The view could not be saved. Browser storage may be blocked or full.');}
    }
    function load(){
      if(configError)return configError;
      const target=storage();if(!target.ok)return target;
      let saved;
      try{saved=target.value.getItem(key);}catch{return failure('read-failed','The saved view could not be read. Browser storage may be blocked.');}
      if(saved===null||saved===undefined)return failure('not-found','No saved view exists on this device.');
      if(typeof saved!=='string')return failure('read-failed','Browser storage returned an unsupported saved value.');
      let snapshot;
      try{snapshot=JSON.parse(saved);}catch{return failure('invalid-json','The saved view is damaged and could not be read.');}
      return validate(snapshot);
    }
    return Object.freeze({validate,save,load});
  }
  return Object.freeze({create});
})();


/* Public bootstrap has no backend configuration or secrets. */
window.TerminalBoot={ready:false};
(()=>{
 const showError=()=>{
  if(window.TerminalBoot.ready)return;
  document.body.className='ui-ready startup-failed';
  const root=document.getElementById('startupState');
  if(root)root.innerHTML=window.TerminalComponents.ErrorState({title:'Research workspace could not start',description:'A required application asset did not load. Reload the page to try again.',actionHtml:'<a class="button" href="./">Reload workspace</a>'});
 };
 window.addEventListener('error',event=>{if(!window.TerminalBoot.ready){window.TerminalBoot.failed=true;showError();}},true);
 document.addEventListener('DOMContentLoaded',()=>{if(!window.TerminalBoot.ready)showError();});
 const startup=document.getElementById('startupState');
 if(startup)startup.innerHTML=window.TerminalComponents.LoadingSkeleton({label:'Loading research workspace'});
})();
