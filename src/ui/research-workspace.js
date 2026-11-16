/* Shared presentation components. Existing selectors and numerical engines remain authoritative. */
const C=window.TerminalComponents;
const routeCatalog=window.TerminalRoutes;
const appearanceEngine=window.TerminalAppearance;
const effectiveAppearance=()=>appearanceEngine?.getEffectiveTheme()||(theme==='light'?'porcelain':'obsidian');
const appearancePreference=()=>appearanceEngine?.getPreference()||effectiveAppearance();
const appearanceLabels={system:'System',obsidian:'Obsidian',porcelain:'Porcelain',glacier:'Glacier',volt:'Volt'};
theme=effectiveAppearance();
function appearanceShortcut(icon){
 const preference=appearancePreference();
 return '<div class="menu-anchor appearance-anchor"><button class="icon-button theme-toggle" data-ui-action="theme" aria-label="Appearance: '+appearanceLabels[preference]+'" title="Change appearance" aria-expanded="false" aria-controls="appearanceMenu">'+icon(effectiveAppearance()==='porcelain'?'sun':'moon')+'</button><div id="appearanceMenu" class="popover-menu appearance-shortcut" role="group" aria-label="Choose appearance" hidden><span class="menu-label">Appearance</span>'+Object.entries(appearanceLabels).map(([id,label])=>'<button data-ui-theme="'+id+'" aria-pressed="'+(preference===id)+'"><span class="appearance-menu-dot" data-preview-theme="'+(id==='system'?'obsidian':id)+'"></span>'+label+'<span class="appearance-menu-check" aria-hidden="true">✓</span></button>').join('')+'<a href="#settings">'+icon('sliders-horizontal')+'All appearance settings</a></div></div>';
}
function appearanceMiniature(id){
 const rows=scope(),series=groups(rows).slice(0,2),maximum=Math.max(1,...series.flatMap(group=>group.vals));
 const line=group=>group?group.vals.map((value,index)=>(index?'L':'M')+(index*180/Math.max(1,group.vals.length-1)).toFixed(1)+' '+(53-value/maximum*46).toFixed(1)).join(''):'';
 const primary=line(series[0]),secondary=line(series[1]);
 return '<span class="appearance-miniature" data-preview-theme="'+id+'" aria-hidden="true"><span class="mini-sidebar"><b></b><i></i><i></i><i></i></span><span class="mini-main"><span class="mini-header"></span><span class="mini-metrics"><b>'+rows.length+'<small>Questions</small></b><b>'+scopeYears().length+'<small>Papers</small></b></span><svg class="mini-chart" viewBox="0 0 180 58"><path class="mini-grid" d="M0 18H180M0 38H180"/>'+(primary?'<path class="mini-area" d="'+primary+'L180 58H0Z"/><path class="mini-line" d="'+primary+'"/>':'')+(secondary?'<path class="mini-secondary" d="'+secondary+'"/>':'')+'</svg><span class="mini-table"><i></i><i></i><i></i></span></span></span>';
}
function appearanceSettings(){
 const preference=appearancePreference(),descriptions={obsidian:'Graphite, ivory & champagne',porcelain:'Warm daylight & soft elevation',glacier:'Midnight blue & glacial light',volt:'Carbon, electric lime & sage'};
 return '<section class="panel appearance-panel"><div class="panel-head"><div><span class="aurora-section-label">Make it your workspace</span><h2>Appearance</h2><p class="panel-description">Four complete environments. One research workspace.</p></div><span class="source-badge" id="appearanceStatus">'+appearanceLabels[effectiveAppearance()]+' active</span></div><div class="panel-content"><div class="appearance-gallery" role="group" aria-label="Workspace appearance">'+Object.entries(descriptions).map(([id,description])=>'<button class="appearance-choice" data-ui-theme="'+id+'" aria-pressed="'+(preference===id)+'" aria-label="Use '+appearanceLabels[id]+' appearance">'+appearanceMiniature(id)+'<span class="appearance-choice-label"><strong>'+appearanceLabels[id]+'</strong><small>'+description+'</small></span><span class="appearance-selected" aria-hidden="true">✓</span></button>').join('')+'</div><button class="appearance-system" data-ui-theme="system" aria-pressed="'+(preference==='system')+'"><span class="appearance-system-icon" aria-hidden="true">◐</span><span><strong>Follow system appearance</strong><small>Porcelain for a light system; Obsidian for a dark system.</small></span><span class="appearance-system-switch" aria-hidden="true"></span></button><p class="appearance-storage-note" id="appearanceStorageStatus">Appearance stays on this device. Research filters and saved views are independent.</p></div></section>';
}
function closeAppearanceMenu(){
 const menu=document.getElementById('appearanceMenu');if(menu)menu.hidden=true;
 document.querySelector('.theme-toggle')?.setAttribute('aria-expanded','false');
}
function applyWorkspaceAppearance(change={}){
 theme=effectiveAppearance();
 document.body.classList.remove('light-theme','v5-light');
 window.TerminalVisualization.apply(document,theme);
 const preference=appearancePreference();
 document.querySelectorAll('[data-ui-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.uiTheme===preference)));
 const shortcut=document.querySelector('.theme-toggle');
 if(shortcut){shortcut.setAttribute('aria-label','Appearance: '+appearanceLabels[preference]);shortcut.innerHTML=ResearchUI.icon(theme==='porcelain'?'sun':'moon');}
 const status=document.getElementById('appearanceStatus');if(status)status.textContent=appearanceLabels[theme]+' active'+(preference==='system'?' · follows system':'');
 const storage=document.getElementById('appearanceStorageStatus');if(storage&&change.persisted===false)storage.textContent='Applied for this session. Browser storage is unavailable; research work is preserved.';
 const exportColors=window.TerminalVisualization.exportTheme?.(theme);
 if(exportColors)document.querySelector('meta[name="theme-color"]')?.setAttribute('content',exportColors.background);
}
const ResearchUI = (() => {
  const icon = name => '<span class="ui-icon" aria-hidden="true">' + (window.UI_ICONS[name] || '') + '</span>';
  const state = {
    collapsed: safeLoad('gate-ui-collapsed', false),
    navOpen:Array.isArray(safeLoad('gate-ui-nav-sections',[]))?safeLoad('gate-ui-nav-sections',[]):[],
    seriesMode: 'leading',
    hiddenSeries: new Set(),
    settingsOpen: false,
    exportOpen: false,
    commandIndex: 0
  };
  const navigation=routeCatalog.working;
  const names = {
    monitor:'Research overview',settings:'Workspace settings',unavailable:'Workspace unavailable',explorer:'Score explorer',questions:'Question database',difficulty:'Difficulty analysis',
    subjects:'Subject allocation',compare:'Cross-year comparison',topics:'Topic analysis',
    lab:'Statistical laboratory',distributions:'Distributions',inference:'Exact trend analysis',responses:'Candidate responses',
    scenarios:'Scenario laboratory',audit:'Data reliability',evidence:'Methodology',reports:'Reports & exports'
  };
  const descriptions = {
    settings:'Appearance, local workspace preferences and research context.',
    unavailable:'This workspace is not available in the current release.',
    monitor:'Allocation, variability and source evidence across the historical GATE EC corpus.',
    explorer:'Select a difficulty range, then inspect the questions behind the distribution.',
    questions:'Find reviewed questions and trace each record to its official source.',
    difficulty:'Compare difficulty by paper and topic using the existing structural scoring rubric.',
    subjects:'Understand how annual marks are allocated across subjects.',
    compare:'Compare paper composition and subject allocation across years and periods.',
    topics:'Follow the hierarchy from subject allocation to individual questions.',
    lab:'Inspect the distribution, uncertainty and sensitivity of annual subject allocations.',
    distributions:'Explore the shape and spread of the selected question parameter.',
    inference:'Examine robust trends, exact tests and uncertainty across all eight annual papers.',
    responses:'Measure item accuracy and timing from your local candidate-response file.',
    scenarios:'Compare explicit allocation assumptions against historical baselines.',
    audit:'Review source coverage, classification decisions and outstanding content issues.',
    evidence:'Definitions, assumptions and source references for the research workspace.',
    reports:'Export the active scope with methodology, sample sizes and limitations.'
  };
  function activeGroup() {
    if(view==='unavailable')return {id:'unavailable',label:'Workspace status',routes:['unavailable']};
    return routeCatalog.find(view) || navigation[0];
  }
  function Sidebar() {
    const group=activeGroup();
    const row=item=>'<a href="#'+item.id+'" class="'+(group.id===item.id?'selected':'')+'" '+(group.id===item.id?'aria-current="page"':'')+' title="'+E(item.label)+'">'+icon(item.icon)+'<span>'+E(item.label)+'</span>'+(group.id===item.id?'<i class="nav-active-dot"></i>':'')+'</a>';
    const sections=routeCatalog.visibleGroups(window.TerminalFeatureSession?.user?.isOwner===true).map(section=>{
      if(section.items.every(item=>item.status==='planned'))return '<details class="nav-planned-group" data-nav-section="'+section.id+'" '+(state.navOpen?.includes(section.id)?'open':'')+'><summary><span>'+E(section.label)+'</span><small>Planned</small>'+icon('chevron-down')+'</summary><div class="planned-items">'+section.items.map(item=>'<div class="planned-nav-item" aria-disabled="true" title="Planned integration · no active service">'+icon(item.icon)+'<span>'+E(item.label)+'</span><small>Later</small></div>').join('')+'</div></details>';
      return '<section class="nav-section"><div class="nav-section-label">'+E(section.label)+'</div><nav class="primary-nav" aria-label="'+E(section.label)+' navigation">'+section.items.map(row).join('')+'</nav></section>';
    }).join('');
    return C.AppSidebar({brandHtml:'<a href="#monitor" class="brand" aria-label="GATE EC overview"><span class="brand-symbol" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M6 27L17 7L29 27M11 19H24M23 11L29 7"/></svg></span><span class="brand-label">GATE EC<small>Research Terminal</small></span></a><button class="icon-button sidebar-toggle" data-ui-action="collapse" aria-label="'+(state.collapsed?'Expand':'Collapse')+' sidebar" aria-expanded="'+!state.collapsed+'">'+icon(state.collapsed?'panel-left-open':'panel-left-close')+'</button><button class="icon-button mobile-nav-close" data-ui-action="mobile-close" aria-label="Close navigation">'+icon('x')+'</button>',navigationHtml:sections,footerHtml:'<div class="dataset-card"><span class="dataset-overline"><i class="status-dot"></i> Research edition</span><strong>EC / 2019–2026</strong><span class="sidebar-data-note">520 questions. Traceable evidence.</span><a href="#evidence">Methods & source notes '+icon('arrow-up-right')+'</a></div>'});
  }
  function SourceBadge(label,type='circle-check') {return C.SourceBadge({label,iconName:type});}
  function WorkspaceHeader() {
    const group=activeGroup(),exportable=routeCatalog.canExport(view,!!responseData);
    const featureSession=window.TerminalFeatureSession;
    const accountLink=featureSession?'<a class="workspace-account" href="#'+(featureSession.status==='authenticated'?'dashboard':'profile')+'" title="'+(featureSession.status==='authenticated'?'Your account workspace':'Account service status')+'">'+icon('layout-dashboard')+'<span>'+E(featureSession.status==='authenticated'?(featureSession.user.displayName||'My workspace'):'Account')+'</span></a>':'';
    return C.WorkspaceHeader({startHtml:'<button class="icon-button mobile-menu" data-ui-action="mobile-nav" aria-label="Open navigation" aria-controls="appSidebar" aria-expanded="false">'+icon('menu')+'</button><div class="breadcrumbs"><span>'+E(group.label)+'</span>'+(group.routes.length>1?icon('chevron-right')+'<span class="current">'+E(names[view])+'</span>':'')+'</div>',actionsHtml:'<button class="search-trigger" data-ui-action="search" aria-label="Search research tools and questions">'+icon('search')+'<span>Search workspace</span><kbd>Ctrl K</kbd></button><span class="toolbar-dataset" title="Dataset '+E(R.version)+' · 520 records · eight papers"><i></i>EC corpus<span class="dataset-version">2019–26</span></span><span class="toolbar-divider"></span>'+appearanceShortcut(icon)+(exportable?'<div class="menu-anchor"><button class="button toolbar-export" data-ui-action="export-menu" aria-expanded="'+state.exportOpen+'">'+icon('download')+'<span>Export</span>'+icon('chevron-down')+'</button>'+(state.exportOpen?'<div class="popover-menu"><button data-ui-action="export-view">'+icon('download')+'Export current view</button><a href="#reports">'+icon('file-text')+'Reports & print</a></div>':'')+'</div>':'')+'<div class="menu-anchor"><button class="icon-button" data-ui-action="settings" aria-label="Workspace settings" aria-expanded="'+state.settingsOpen+'">'+icon('sliders-horizontal')+'</button>'+(state.settingsOpen?'<div class="popover-menu settings-menu"><span class="menu-label">Workspace</span><a href="#settings">'+icon('sliders-horizontal')+'Workspace preferences</a><button data-ui-action="context">'+icon('circle-help')+'Research context</button><button data-ui-action="save">'+icon('database')+'Save current view</button><button data-ui-action="restore">'+icon('rows-3')+'Restore saved view</button><button data-ui-action="share">'+icon('external-link')+'Copy scope link</button></div>':'')+'</div>'+accountLink});
  }
  function SegmentedControl(items,selected,attribute) {return C.SegmentedControl({items,selected,attribute});}
  function MetricCard(label,value,detail,kind='') {return C.StatCard({label,valueHtml:String(value),detailHtml:detail,variant:kind});}
  function ChartPanel(title,description,body,foot='',tools='',className='') {return C.ChartPanel({title,description,bodyHtml:body,footHtml:foot,toolsHtml:tools,className});}
  function SearchDialog() {C.SearchCommand({top:document.querySelector('.command-top'),input:$('#commandInput'),help:document.querySelector('.command-help')});}
  function DetailDrawer() {return C.DetailDrawer({title:'Question details'});}
  function EmptyState(title,description) {return C.EmptyState({title,description,actionHtml:'<button class="button" data-ui-action="reset">Reset filters</button>'});}
  function ResearchTable(rows) {
    const found=rows.length, visible=rows.slice(page*10,page*10+10);
    return '<section class="panel overview-research-table"><div class="panel-head"><div><h2>Research questions</h2><p class="panel-description">Explore the records in your current scope.</p></div><a href="#questions" class="text-link">Open database '+icon('arrow-up-right')+'</a></div>'+
      '<div class="research-table-toolbar"><label class="table-search">'+icon('search')+'<input id="search" aria-label="Search research records" placeholder="Search ID, subject or topic…" value="'+E(query)+'"></label><span>'+found+' records</span></div>'+
      '<div class="table-scroll"><table class="data-table"><thead><tr><th>Question</th><th>Subject & topic</th><th>Format</th><th class="number-cell">Marks</th><th class="number-cell">Difficulty</th><th>Source</th><th></th></tr></thead><tbody>'+
      visible.map(q=>'<tr data-question="'+E(q.id)+'" tabindex="0" role="button" aria-label="Inspect '+E(q.id)+'"><td class="question-id">'+E(q.id.replace('GATE-EC-',''))+'<small>'+q.year+' master paper</small></td><td>'+E(q.subject)+'<small>'+E(q.topic_family)+'</small></td><td><span class="format-tag">'+q.type+'</span></td><td class="number-cell">'+q.marks+'</td><td class="number-cell">'+F(q.toughness.score,1)+'<small>'+toughBand(q.toughness.score)+'</small></td><td>'+SourceBadge(q.source.visual_review_completed?'Reviewed':'Available',q.source.visual_review_completed?'circle-check':'external-link')+'</td><td>'+icon('arrow-up-right')+'</td></tr>').join('')+
      '</tbody></table></div>'+(!found?EmptyState('No matching questions','Try a broader search or reset the current scope.'):'')+
      '<div class="pagination"><span>'+(found?page*10+1:0)+'–'+Math.min(page*10+10,found)+' of '+found+' records</span><div><button class="icon-button" data-ui-page="-1" aria-label="Previous records" '+(page===0?'disabled':'')+'>'+icon('chevron-right')+'</button><button class="icon-button" data-ui-page="1" aria-label="Next records" '+(page*10+10>=found?'disabled':'')+'>'+icon('chevron-right')+'</button></div></div></section>';
  }
  function FilterBar() {
    const scopeNode=document.querySelector('.scope-bar');
    C.FilterToolbar({node:scopeNode});
    document.querySelector('.scope-name,.filter-label').textContent='Scope';
    document.querySelector('.scope-name,.filter-label').className='filter-label';
    const reset=document.getElementById('reset');
    reset.innerHTML=icon('x')+'<span>Reset</span>';
    reset.title='Reset analytical scope';
    reset.setAttribute('aria-label','Reset analytical scope');
    document.querySelectorAll('#saveLocalView,#restoreLocalView,#shareScope').forEach(button=>button.hidden=true);
  }
  function AppShell() {
    C.AppShell({sidebar:document.querySelector('body>aside'),header:document.querySelector('header'),sidebarHtml:Sidebar(),headerHtml:WorkspaceHeader()});
    FilterBar();
  }
  function overviewTrend(data) {
    let ranked=[...data].sort((a,b)=>b.avg-a.avg);
    if(state.seriesMode==='leading')ranked=ranked.slice(0,5);
    const series=ranked.filter(group=>!state.hiddenSeries.has(group.subject));
    const years=scopeYears(),max=Math.max(5,...ranked.flatMap(s=>s.vals)),ceiling=Math.ceil(max/5)*5;
    const colors=window.TerminalVisualization.palette(theme);
    const x=i=>48+i*660/Math.max(1,years.length-1),y=value=>238-value/ceiling*194;
    const guides=[0,.25,.5,.75,1].map(f=>'<line class="gridline" x1="48" x2="710" y1="'+y(ceiling*f)+'" y2="'+y(ceiling*f)+'"/><text x="34" y="'+(y(ceiling*f)+3)+'" text-anchor="end">'+F(ceiling*f,0)+'</text>').join('');
    const lines=series.map(group=>{
      const index=R.subjects.indexOf(group.subject),color=colors[index%colors.length],dash=['','8 3','3 3','10 3 2 3','2 5','12 3','6 2 2 2','1 3','10 3 4 3','4 2'][index%10];
      return '<polyline class="subject-series" data-ui-series-index="'+index+'" fill="none" stroke="'+color+'" stroke-dasharray="'+dash+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="'+group.vals.map((value,i)=>x(i)+','+y(value)).join(' ')+'"/>'+
        group.vals.map((value,i)=>'<circle data-ui-series-index="'+index+'" cx="'+x(i)+'" cy="'+y(value)+'" r="4" fill="var(--surface)" stroke="'+color+'" stroke-width="2" tabindex="0" role="button" data-ui-point="'+years[i]+'" data-ui-subject="'+E(group.subject)+'" data-ui-tooltip="'+E(group.subject+' · '+years[i]+'\n'+value+' marks · select to filter')+'" aria-label="Filter '+E(group.subject)+' in '+years[i]+', '+value+' marks"/>').join('');
    }).join('');
    const plot='<svg viewBox="0 0 750 282" role="img" aria-label="Annual subject marks across selected years">'+guides+years.map((year,i)=>'<text x="'+x(i)+'" y="264" text-anchor="middle">'+year+'</text>').join('')+lines+'</svg>';
    const legend='<div class="series-legend">'+ranked.map(group=>{const index=R.subjects.indexOf(group.subject);return '<button data-ui-series="'+E(group.subject)+'" aria-pressed="'+!state.hiddenSeries.has(group.subject)+'"><i data-ui-series-index="'+index+'" style="--series:'+colors[index%10]+';border-top-style:'+(index%3===0?'solid':index%3===1?'dashed':'dotted')+'"></i>'+E(short(group.subject))+'</button>';}).join('')+'</div>';
    return ChartPanel('Subject weightage over time','Historical marks per paper · '+years.length+' annual observations','<div class="chart-scroll" tabindex="0" aria-label="Annual subject allocation plot; scroll horizontally on small screens">'+plot+'</div>'+legend,'Select a point to inspect its subject and year. Line patterns and names distinguish each series.',SegmentedControl([['leading','Top 5'],['all','All subjects']],state.seriesMode,'data-ui-series-mode'),'overview-trend aurora-main-chart');
  }
  function stability(data) {
    const sorted=[...data].filter(group=>Number.isFinite(group.cv)).sort((a,b)=>a.cv-b.cv).slice(0,5);
    const max=Math.max(1,...sorted.map(group=>group.cv));
    return '<section class="panel overview-stability"><div class="panel-head"><div><h2>Allocation stability</h2><p class="panel-description">Lowest annual variability</p></div><button class="icon-button" data-ui-context="CV = sample SD ÷ mean × 100. Lower values indicate more consistent historical allocation. No future stability is implied." aria-label="Explain allocation stability">'+icon('circle-help')+'</button></div><div class="stability-list">'+(sorted.map(group=>'<button data-select-subject="'+E(group.subject)+'"><div><span>'+E(short(group.subject))+'</span><strong>'+F(group.cv,1)+'<small>% CV</small></strong></div><div class="stability-track"><i style="width:'+Math.max(2,group.cv/max*100)+'%"></i></div></button>').join('')||'<p class="empty">Select at least two annual papers to compare variability.</p>')+'</div><a href="#subjects" class="stability-link">View subject analysis '+icon('arrow-right')+'</a></section>';
  }
  function overviewHeatmap(data) {
    const years=scopeYears(),maximum=Math.max(1,...data.flatMap(group=>group.vals));
    const content='<div class="table-scroll"><table class="overview-heatmap"><thead><tr><th scope="col">Subject</th>'+years.map(year=>'<th scope="col">'+year+'</th>').join('')+'</tr></thead><tbody>'+data.map(group=>'<tr><th scope="row">'+E(short(group.subject))+'</th>'+group.vals.map((value,i)=>'<td><button data-ui-heat="'+(value/maximum)+'" data-ui-point="'+years[i]+'" data-ui-subject="'+E(group.subject)+'" style="--heat-opacity:'+(0.04+value/maximum*.34)+'" data-ui-tooltip="'+E(group.subject+' · '+years[i]+'\n'+value+' marks')+'" aria-label="Filter '+E(group.subject)+' in '+years[i]+', '+value+' marks">'+value+'</button></td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    return '<section class="panel overview-heat"><div class="panel-head"><div><h2>Historical allocation</h2><p class="panel-description">Subject marks by examination year</p></div><span class="heat-scale">Lower <i></i> Higher</span></div>'+content+'</section>';
  }
  function overviewInsights(data,rows) {
    const highest=[...data].sort((a,b)=>b.avg-a.avg)[0],open=rows.filter(q=>q.quality.open_issue_count).length;
    const scored=rows.filter(q=>q.scoring_status!=='marks_to_all'),s=toughStats(scored);
    return '<section class="panel overview-insights"><div class="panel-head"><h2>Scope notes</h2>'+icon('activity')+'</div><div class="insight-list">'+
      (highest?'<div><span class="insight-label">Largest allocation</span><p><strong>'+E(highest.subject)+'</strong> averaged <b>'+F(highest.avg,1)+' marks</b> per selected paper.</p></div>':'')+
      '<div><span class="insight-label">Difficulty mix</span><div class="overview-difficulty-mix">'+['Easy','Moderate','Tough'].map(band=>'<div><span class="difficulty-mix-label"><i data-band="'+band.toLowerCase()+'"></i>'+band+'</span><strong>'+s.bands[band].n+'</strong></div>').join('')+'</div><p class="difficulty-mix-note">'+s.n+' structurally scored questions. Empirical difficulty remains uncalibrated.</p><a href="#difficulty">Inspect difficulty '+icon('arrow-up-right')+'</a></div>'+
      '<div><span class="insight-label">Evidence to review</span><p><strong>'+open+' records</strong> retain open content flags. Source review and clean transcription are tracked separately.</p><a href="#audit">View reliability '+icon('arrow-up-right')+'</a></div></div></section>';
  }
  function Overview() {
    const rows=scope(),data=groups(rows),source=rows.filter(q=>q.source.visual_review_completed).length;
    const coverage=rows.length?F(source/rows.length*100,0)+'<span>%</span>':'—';
    return '<div class="aurora-overview"><div class="aurora-overview-head"><div class="overview-meta">'+SourceBadge('2019–2026 master papers','database')+'<span>'+rows.length+' records in scope</span><span class="meta-separator"></span><a href="#audit">'+source+' source-reviewed '+icon('arrow-up-right')+'</a></div><a class="text-link overview-methods-link" href="#evidence">Read the methodology '+icon('arrow-up-right')+'</a></div>'+
      '<div class="metrics overview-metrics">'+MetricCard('Questions',rows.length,$('#subject').value==='all'?'EC + General Aptitude':E($('#subject').value))+MetricCard('Historical marks',sum(rows.map(q=>q.marks)),'In the selected scope')+MetricCard('Annual papers',scopeYears().length,'Years in the selected scope')+MetricCard('Source coverage',coverage,source+' of '+rows.length+' visually reviewed')+'</div>'+
      '<div class="aurora-research-strip"><span>'+icon('activity')+' Historical allocation</span><span>Question-level evidence</span><span>Transparent assumptions</span><a href="#lab">Open statistical lab '+icon('arrow-up-right')+'</a></div>'+
      '<div class="aurora-analysis-grid">'+overviewTrend(data)+'<aside class="aurora-support-rail" aria-label="Allocation stability">'+stability(data)+'</aside></div><div class="aurora-scope-brief">'+overviewInsights(data,rows)+'</div><div class="aurora-section-label">Across the papers <span>Compare allocation by subject and year</span></div>'+overviewHeatmap(data)+'<div class="aurora-section-label">Behind the numbers <span>Inspect the questions in your current scope</span></div>'+ResearchTable(selectedQuestionRows())+'</div>';
  }
  function secondaryNavigation() {
    const group=activeGroup();
    if(group.routes.includes('recruitment'))return '';
    if(group.routes.length<2)return '';
    return '<nav class="workspace-tabs" aria-label="'+group.label+' views">'+group.routes.map(id=>'<a href="#'+id+'" '+(id===view?'aria-current="page"':'')+'>'+E(names[id])+'</a>').join('')+'</nav>';
  }
  return {icon,state,navigation,names,descriptions,activeGroup,AppShell,Sidebar,WorkspaceHeader,FilterBar,MetricCard,ChartPanel,ResearchTable,SegmentedControl,SearchDialog,DetailDrawer,EmptyState,SourceBadge,Overview,secondaryNavigation};
})();
window.ResearchUI=ResearchUI;

/* One presentation render pipeline for all existing analytical routes. */
const ui = ResearchUI;
const savedViews=window.TerminalPreferences.create({storage:()=>window.localStorage,allowedRoutes:routeCatalog.working.flatMap(item=>item.routes),scopeOptions:{from:R.years,to:R.years,subject:['all',...R.subjects],quality:['all','clear','changed']},templates:{questionContext:{...questionContext},difficulty:{...difficultyState},research:{...researchState}}});
function saveResearchView(){
 const result=savedViews.save({route:view,scope:['from','to','subject','quality'].map(key=>$('#'+key).value),query,verdict,questionDisplay,questionContext:{...questionContext},difficulty:{...difficultyState},research:{...researchState},issueFilter});
 toast(result.ok?'Saved this research view on your device.':result.error.message);
}
function restoreResearchView(){
 const result=savedViews.load();
 if(!result.ok){toast(result.error.message);return;}
 const saved=result.value;
 ['from','to','subject','quality'].forEach((key,i)=>$('#'+key).value=saved.scope[i]);
 query=saved.query;verdict=saved.verdict;questionDisplay=saved.questionDisplay;issueFilter=saved.issueFilter;
 Object.assign(questionContext,saved.questionContext);Object.assign(difficultyState,saved.difficulty);Object.assign(researchState,saved.research);
 location.hash=saved.route;render();toast('Restored your saved research view.');
}
notes.settings='Appearance and saved research scope stay on this device. Candidate preferences and account records are managed separately.';
notes.unavailable='This route has no active feature service in Part 1. Existing public research remains available.';
routeFunctions.settings=()=>'<div class="settings-grid">'+appearanceSettings()+'<section class="panel settings-local"><div class="panel-head"><div><span class="aurora-section-label">Your research environment</span><h2>Local workspace</h2><p class="panel-description">Device preferences, separate from your candidate account.</p></div></div><div class="settings-rows"><div><span><strong>Research context</strong><small>Definitions, active scope and local notes.</small></span><button class="button" data-ui-action="context">'+(contextVisible?'Close context':'Open context')+'</button></div><div><span><strong>Saved research view</strong><small>Restore your saved filters and analytical settings.</small></span><button class="button" data-ui-action="restore">Restore view</button></div><div><span><strong>Candidate workspace</strong><small>Check actual availability of account-backed records.</small></span><a class="text-link" href="#profile">Account status</a></div></div></section><section class="panel settings-source"><div class="panel-head"><div><span class="aurora-section-label">Know the evidence</span><h2>Dataset & interpretation</h2></div></div><div class="panel-content"><p><strong>520</strong> records · <strong>8</strong> annual papers · <strong>10</strong> reviewed primary subjects</p><p class="muted">Dataset '+E(R.version)+'. Source review, open content flags and independent certification are tracked separately.</p><a class="text-link" href="#audit">Open data integrity '+ui.icon('arrow-up-right')+'</a><a class="text-link" href="#evidence">Read methodology '+ui.icon('arrow-up-right')+'</a></div></section></div>';
routeFunctions.unavailable=()=>{
 const resolved=ui.state.requested,planned=resolved?.status==='planned';
 const title=planned?resolved.entry.label+' is planned':'Workspace not found';
 return C.ErrorState({title,description:planned?'This module has no active service in Part 1. Continue using the research tools while integration is prepared.':'This address does not match a working research workspace.',actionHtml:'<a class="button" href="#monitor">Return to research overview</a>'});
};
table=function(headers,rows){return C.DataTable({headers,rowsHtml:rows.map(row=>'<tr>'+row.map(value=>'<td>'+value+'</td>').join('')+'</tr>').join('')});};
function captureWorkspaceFocus(){
 const active=document.activeElement;
 if(!active||active===document.body)return null;
 const token={id:active.id,route:location.hash,selection:active.selectionStart};
 const form=active.closest?.('form[data-career-form],form[data-personal-form],form[data-pyq-form]');
 if(form&&active.name){token.formAttribute=form.hasAttribute('data-career-form')?'data-career-form':form.hasAttribute('data-personal-form')?'data-personal-form':'data-pyq-form';token.formName=form.getAttribute(token.formAttribute);token.fieldName=active.name;}
 for(const attribute of ['data-ui-series-mode','data-ui-series','data-ui-difficulty-tab','data-lab-tab','data-ui-theme','data-pyq-filter','data-pyq-display'])if(active.hasAttribute?.(attribute)){token.attribute=attribute;token.value=active.getAttribute(attribute);break;}
 return token;
}
function restoreWorkspaceFocus(token){
 if(!token||token.route!==location.hash||document.activeElement?.matches?.('dialog[open] input'))return;
 let target=token.id?document.getElementById(token.id):null;
 if(!target&&token.formAttribute){const esc=value=>String(value).replace(/[\\"]/g,'\\$&');target=document.querySelector('form['+token.formAttribute+'="'+esc(token.formName)+'"] [name="'+esc(token.fieldName)+'"]');}
 if(!target&&token.attribute){const escaped=String(token.value).replace(/\\/g,'\\\\').replace(/"/g,'\\"');target=document.querySelector('['+token.attribute+'="'+escaped+'"]');}
 if(target){target.focus({preventScroll:true});if(Number.isInteger(token.selection)&&target.setSelectionRange&&target.type!=='number')try{target.setSelectionRange(token.selection,token.selection)}catch{}}
}
function setMobileNavigation(open){
 document.body.classList.toggle('mobile-nav-open',open);
 const toggle=document.querySelector('[data-ui-action="mobile-nav"]');
 toggle?.setAttribute('aria-expanded',String(open));
 if(open)document.querySelector('.mobile-nav-close')?.focus();
 else if(toggle&&document.activeElement?.closest?.('body>aside'))toggle.focus();
}

routeFunctions.monitor = () => ui.Overview();
routeFunctions.subjects = () => subjects();
routeFunctions.topics = () => topicIntelligence();
chart = function(title,body,foot='') {
  return ui.ChartPanel(title,'',body,foot);
};
metricCards = function(items) {
  return '<div class="metrics">'+items.map(([label,value,note,unit=''])=>
    ui.MetricCard(label,String(value)+(unit?'<span class="metric-unit">'+E(unit)+'</span>':''),note)
  ).join('')+'</div>';
};

function hydratePanels() {
  document.querySelectorAll('#content .panel').forEach(section => {
    section.classList.add('ui-panel');
    const heading=section.querySelector(':scope > .panel-head h2');
    if(heading)heading.querySelectorAll(':scope > span').forEach(number=>number.remove());
    const svg=section.querySelector('svg[role=img],svg.chart');
    if(!svg)return;
    section.classList.add('v5-chart-panel');
    const head=section.querySelector(':scope > .panel-head');
    if(!head)return;
    head.querySelectorAll('.chart-actions').forEach(actions=>actions.remove());
    if(!head.querySelector('[data-ui-action="expand-chart"]')){
      const tools=document.createElement('div');
      tools.className='panel-tools chart-tools';
      tools.innerHTML='<button class="icon-button" data-ui-action="expand-chart" aria-label="Expand '+E(heading?.textContent||'chart')+'">'+ui.icon('expand')+'</button><details class="chart-menu"><summary class="icon-button" aria-label="Download chart">'+ui.icon('more-horizontal')+'</summary><div class="popover-menu"><button data-chart-export="svg">'+ui.icon('download')+'Download SVG</button><button data-chart-export="png">'+ui.icon('download')+'Download PNG</button></div></details>';
      head.append(tools);
    }
  });
  document.querySelectorAll('#content .data-table th').forEach(cell=>{
    if(cell.dataset.sort){cell.tabIndex=0;cell.setAttribute('role','button')}
  });
  document.querySelectorAll('#content .panel-foot span:last-child').forEach(span=>{
    if(span.textContent.trim()==='EC / RESEARCH')span.remove();
  });
  document.querySelectorAll('#content svg title').forEach(title=>{
    const mark=title.parentElement;
    if(mark&&!mark.dataset.uiTooltip)mark.dataset.uiTooltip=title.textContent;
  });
  document.querySelectorAll('#content [data-question],#content [data-select-subject],#content [data-topic-filter],#content [data-diff-topic],#content [data-diff-topic-year],#content [data-scope-year]').forEach(element=>{
    if(element.tagName!=='BUTTON'&&element.tagName!=='A'){element.tabIndex=0;element.setAttribute('role','button')}
  });
  document.querySelectorAll('#content .empty').forEach(element=>{
    if(!element.querySelector('button'))element.classList.add('empty-state');
  });
}
function hideTooltip() {
  const tooltip=document.getElementById('chartTooltip');
  if(tooltip)tooltip.hidden=true;
}
function updateContext() {
  $('#researchContext').innerHTML='<div class="context-head"><h2>Research context</h2><button class="icon-button" data-ui-action="context" aria-label="Close research context">'+ui.icon('x')+'</button></div>'+
    '<div class="context-content"><span class="field-caption">Current scope</span><strong>'+E(scopeDescription())+'</strong><p>'+scope().length+' records · '+sum(scope().map(q=>q.marks))+' marks</p>'+
    '<span class="field-caption">Interpretation</span><p id="contextDefinition">'+E(notes[view])+'</p><a class="text-link" href="#evidence">Methods & assumptions '+ui.icon('arrow-up-right')+'</a>'+
    '<span class="field-caption">Research note</span><textarea id="localAnnotation" aria-label="Local research note" placeholder="Add a note for this workspace…">'+E(safeLoad('gate-v5-note-'+view,''))+'</textarea><small>Saved on this device.</small></div>';
}
render = function() {
  const focusToken=captureWorkspaceFocus();
  const previousRoute=ui.state.renderedRoute;
  const requested=location.hash.slice(1).split('?')[0]||'monitor';
  const resolved=routeCatalog.resolve(requested);
  view=resolved.status==='available'&&routeFunctions[resolved.id]?resolved.id:'unavailable';
  ui.state.requested=resolved;
  document.body.className='ui-ready research-app'+(ui.state.collapsed?' sidebar-collapsed':'')+(contextVisible?' context-open':'');
  document.body.dataset.route=view;
  ui.AppShell();
  if(!['monitor','explorer','subjects','topics','questions','lab','distributions','inference','responses','compare','difficulty','scenarios','audit','reports','evidence'].includes(view))document.querySelectorAll('[data-ui-action="save"],[data-ui-action="share"]').forEach(button=>button.hidden=true);
  document.querySelector('.page-top>div:first-child').innerHTML=C.PageHeader({title:ui.names[view],description:ui.descriptions[view],eyebrow:view==='monitor'?'GATE EC / Historical intelligence':ui.activeGroup().label});
  document.querySelector('.page-actions').hidden=true;
  document.querySelector('.scope-bar').hidden=view.startsWith('recruitment')||['technical-exams','recruiters','inference','responses','evidence','settings','unavailable','rank','admissions','institutes','psu','dashboard','profile','planner','mocks','reminders','forum','admin'].includes(view);
  $('#content').innerHTML=ui.secondaryNavigation()+routeFunctions[view]();
  updateContext();
  hydratePanels();
  window.TerminalVisualization.apply(document.querySelector('#content'),theme);
  if(view==='questions'&&!document.querySelector('.feature-pyq'))document.querySelectorAll('#content table.data-table tr').forEach(row=>[...row.children].forEach((cell,i)=>cell.hidden=!databaseColumns[i]));
  document.querySelectorAll('.difficulty-jumps,.difficulty-intro,.release-pill').forEach(node=>node.hidden=true);
  document.querySelector('footer').innerHTML='<span>GATE EC Research Terminal <i>·</i> Independent historical research</span><a href="#evidence">Methodology '+ui.icon('arrow-up-right')+'</a>';
  const landscape=document.querySelector('.workspace-section-head h2');
  if(landscape)landscape.textContent='Subject allocation ranking';
  hideTooltip();
  if(previousRoute&&previousRoute!==view){const heading=$('#title');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  else restoreWorkspaceFocus(focusToken);
  ui.state.renderedRoute=view;
  window.TerminalFeatureHost?.afterRender(view);
};
commands = function() {
  const value=$('#commandInput').value.trim().toLowerCase();
  const toolEntries=routeCatalog.commandEntries(window.TerminalFeatureSession?.user?.isOwner===true).flatMap(item=>item.routes).filter(id=>((ui.names[id]||id)+' '+id+' '+(v5Titles[id]||'')).toLowerCase().includes(value));
  const questions=value.length>=3?R.questions.filter(q=>(q.id+' '+q.topic+' '+q.subject).toLowerCase().includes(value)).slice(0,5):[];
  $('#commandResults').innerHTML=(toolEntries.length?'<div class="command-section-label">Workspaces</div>'+toolEntries.map(id=>'<button class="command-result" data-command="'+id+'">'+ui.icon(ui.navigation.find(group=>group.routes.includes(id))?.icon||'search')+'<span>'+E(ui.names[id]||id)+'</span>'+ui.icon('arrow-up-right')+'</button>').join(''):'')+
    (questions.length?'<div class="command-section-label">Question records</div>'+questions.map(q=>'<button class="command-result" data-question="'+E(q.id)+'">'+ui.icon('file-text')+'<span>'+E(q.id)+'<small>'+E(q.topic_family)+'</small></span>'+ui.icon('arrow-up-right')+'</button>').join(''):'')||
    '<div class="empty-state">'+ui.icon('search')+'<strong>No matches</strong><p>Try a subject, question ID or workspace name.</p></div>';
  ui.state.commandIndex=0;
  highlightCommand();
};
function highlightCommand() {
  const entries=[...document.querySelectorAll('#commandResults .command-result')];
  entries.forEach((entry,index)=>entry.classList.toggle('command-highlight',index===ui.state.commandIndex));
  entries[ui.state.commandIndex]?.scrollIntoView({block:'nearest'});
}
function expandChart(button) {
  const section=button.closest('.panel');
  const svg=section.querySelector('svg[role=img],svg.chart');
  if(!svg)return;
  const heading=section.querySelector('h2')?.textContent||'Chart exploration';
  const legend=section.querySelector('.series-legend,.plot-legend,.legend')?.outerHTML||'';
  const foot=section.querySelector('.panel-foot')?.textContent||'';
  const dialog=$('#chartDialog');
  dialog.querySelector('.expanded-chart-title').textContent=heading;
  dialog.querySelector('.expanded-chart-body').innerHTML=svg.outerHTML+legend;
  dialog.querySelector('.expanded-chart-foot').textContent=foot;
  dialog.showModal();
}
function focusAfterRender(selector) {
  document.querySelector(selector)?.focus();
}
document.addEventListener('click',event=>{
  const action=event.target.closest('[data-ui-action]');
  if(action){
    switch(action.dataset.uiAction){
      case 'collapse':
        ui.state.collapsed=!ui.state.collapsed;safeSave('gate-ui-collapsed',ui.state.collapsed);render();focusAfterRender('[data-ui-action="collapse"]');break;
      case 'mobile-nav':
        setMobileNavigation(!document.body.classList.contains('mobile-nav-open'));break;
      case 'mobile-close': setMobileNavigation(false);break;
      case 'reload': location.reload();break;
      case 'search': openCommands();break;
      case 'settings':
        ui.state.settingsOpen=!ui.state.settingsOpen;ui.state.exportOpen=false;render();if(ui.state.settingsOpen)focusAfterRender('.settings-menu button');break;
      case 'export-menu':
        ui.state.exportOpen=!ui.state.exportOpen;ui.state.settingsOpen=false;render();if(ui.state.exportOpen)focusAfterRender('.popover-menu button');break;
      case 'export-view':
        exportCurrentView();ui.state.exportOpen=false;render();break;
      case 'theme':
        {const menu=document.getElementById('appearanceMenu'),open=!!menu?.hidden;if(menu)menu.hidden=!open;action.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('[aria-pressed="true"]')?.focus();}break;
      case 'context':
        contextVisible=!contextVisible;safeSave('gate-v5-context',contextVisible);ui.state.settingsOpen=false;render();if(contextVisible)focusAfterRender('#researchContext button');break;
      case 'save': saveResearchView();ui.state.settingsOpen=false;render();break;
      case 'restore': restoreResearchView();ui.state.settingsOpen=false;render();break;
      case 'share': $('#shareScope').click();ui.state.settingsOpen=false;render();break;
      case 'reset': $('#reset').click();break;
      case 'expand-chart': expandChart(action);break;
      case 'close-chart': $('#chartDialog').close();break;
      case 'close-drawer': $('#inspector').close();break;
    }
  }
  const mode=event.target.closest('[data-ui-series-mode]');
  if(mode){ui.state.seriesMode=mode.dataset.uiSeriesMode;ui.state.hiddenSeries.clear();render()}
  const series=event.target.closest('[data-ui-series]');
  if(series){const subject=series.dataset.uiSeries;if(ui.state.hiddenSeries.has(subject))ui.state.hiddenSeries.delete(subject);else ui.state.hiddenSeries.add(subject);render()}
  const point=event.target.closest('[data-ui-point]');
  if(point){
    clearQuestionContext();$('#from').value=$('#to').value=point.dataset.uiPoint;$('#subject').value=point.dataset.uiSubject;page=0;
    if($('#chartDialog')?.open)$('#chartDialog').close();
    render();
  }
  const context=event.target.closest('[data-ui-context]');
  if(context){contextVisible=true;render();$('#contextDefinition').textContent=context.dataset.uiContext}
  const pagination=event.target.closest('[data-ui-page]');
  if(pagination){page=Math.max(0,page+Number(pagination.dataset.uiPage));render();document.querySelector('.overview-research-table')?.scrollIntoView({block:'nearest'})}
  if((ui.state.settingsOpen||ui.state.exportOpen)&&!event.target.closest('.menu-anchor')){
    ui.state.settingsOpen=false;ui.state.exportOpen=false;
    document.querySelector('header').innerHTML=ui.WorkspaceHeader();
  }
});
document.addEventListener('keydown',event=>{
  if($('#commands').open&&['ArrowDown','ArrowUp','Enter'].includes(event.key)){
    const entries=[...document.querySelectorAll('#commandResults .command-result')];
    if(!entries.length)return;
    event.preventDefault();
    if(event.key==='Enter')entries[ui.state.commandIndex]?.click();
    else{ui.state.commandIndex=(ui.state.commandIndex+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length;highlightCommand()}
    return;
  }
  if(event.key==='Escape'){
    setMobileNavigation(false);
    document.querySelectorAll('.chart-menu[open]').forEach(menu=>menu.open=false);
    if(ui.state.settingsOpen||ui.state.exportOpen){ui.state.settingsOpen=false;ui.state.exportOpen=false;render();focusAfterRender('[data-ui-action="settings"]')}
  }

});
function showChartTooltip(event) {
  const mark=event.target.closest('[data-ui-tooltip]');
  if(!mark){hideTooltip();return}
  const tooltip=$('#chartTooltip');
  tooltip.innerHTML=mark.dataset.uiTooltip.split('\n').map((line,index)=>index===0?'<strong>'+E(line)+'</strong>':'<span>'+E(line)+'</span>').join('');
  tooltip.hidden=false;
  const box=mark.getBoundingClientRect();
  const left=Number.isFinite(event.clientX)?event.clientX:box.x+box.width/2;
  const top=Number.isFinite(event.clientY)?event.clientY:box.y+box.height;
  tooltip.style.left=Math.max(12,Math.min(window.innerWidth-270,left+14))+'px';
  tooltip.style.top=Math.max(12,Math.min(window.innerHeight-90,top+16))+'px';
}
document.addEventListener('pointermove',showChartTooltip);
document.addEventListener('focusin',showChartTooltip);
window.addEventListener('scroll',hideTooltip,true);

const inspectBeforePresentation=inspect;
inspect=function(id) {
  inspectBeforePresentation(id);
  const q=R.questions.find(row=>row.id===id);
  if(!q)return;
  $('#inspector').setAttribute('aria-label','Question details / '+id);
  document.querySelectorAll('#inspectBody .source-reader>p').forEach(node=>{if(node.textContent.includes('Open an image to zoom'))node.textContent=node.textContent.replace('Open an image to zoom.','Open the linked official PDF to inspect the question.');});
  const overline=$('#inspectBody .overline');
  if(overline)overline.textContent=q.id;
  const confidence=$('#inspectBody .tough-score-big');
  if(confidence)confidence.insertAdjacentHTML('afterend',C.ConfidenceBadge({level:q.toughness.confidence}));
  $('#inspectBody').insertAdjacentHTML('afterbegin',ui.DetailDrawer());
};
document.querySelector('#inspector>.close').hidden=true;
ui.SearchDialog();
document.body.insertAdjacentHTML('beforeend','<dialog id="chartDialog" class="chart-dialog v5-chart-panel"><div class="expanded-chart-header"><h2 class="expanded-chart-title"></h2><div class="panel-tools"><button class="button" data-chart-export="svg">SVG</button><button class="button" data-chart-export="png">PNG</button><button class="icon-button" data-ui-action="close-chart" aria-label="Close expanded chart">'+ui.icon('x')+'</button></div></div><div class="expanded-chart-body"></div><p class="expanded-chart-foot"></p></dialog><div id="chartTooltip" class="chart-tooltip" role="tooltip" hidden></div>');
$('#chartDialog').onclick=event=>{if(event.target===$('#chartDialog'))$('#chartDialog').close()};
render();

/* Chart exports target the plot, excluding toolbar icon SVGs. */
exportChart = function(button) {
  const section=button.closest('.v5-chart-panel');
  const svg=section?.querySelector('svg[role="img"],svg.chart');
  if(!svg){toast('No chart in this panel. Use the workspace export for records.');return}
  const menu=button.closest('.chart-menu');if(menu)menu.open=false;
  const exportTheme=window.TerminalVisualization.exportTheme(theme);
  const copy=svg.cloneNode(true);
  copy.style.backgroundColor=exportTheme.background;
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  copy.setAttribute('width',String(copy.viewBox.baseVal.width||750));
  copy.setAttribute('height',String(copy.viewBox.baseVal.height||300));
  const originalTexts=[...svg.querySelectorAll('text')];
  copy.querySelectorAll('text').forEach((text,index)=>{
    let fill=exportTheme.text;
    try{const computed=getComputedStyle(originalTexts[index]).fill;if(computed&&computed!=='none')fill=computed;}catch{}
    text.setAttribute('fill',fill);text.style.fill=fill;text.style.fontFamily='Inter,Arial,sans-serif';text.style.fontSize='13px';
  });
  copy.querySelectorAll('.gridline').forEach(line=>line.setAttribute('stroke',exportTheme.grid));
  copy.querySelectorAll('[fill="var(--surface)"]').forEach(mark=>mark.setAttribute('fill',exportTheme.background));
  const fallbackColors={'--surface':exportTheme.background,'--accent':exportTheme.accent,'--text':exportTheme.text,'--muted':exportTheme.text,'--border':exportTheme.grid};
  let rootStyles;try{rootStyles=getComputedStyle(document.documentElement);}catch{}
  const resolveColor=value=>value?.replace(/var\((--[\w-]+)\)/g,(expression,key)=>rootStyles?.getPropertyValue(key)?.trim()||fallbackColors[key]||expression);
  copy.querySelectorAll('[fill],[stroke],[style]').forEach(mark=>{
    for(const attr of ['fill','stroke'])if(mark.hasAttribute(attr))mark.setAttribute(attr,resolveColor(mark.getAttribute(attr)));
    for(const property of ['fill','stroke','color']){const value=mark.style.getPropertyValue(property);if(value?.includes('var('))mark.style.setProperty(property,resolveColor(value));}
  });
  window.TerminalVisualization.inlineSvgAppearance(svg,copy);
  const source=new XMLSerializer().serializeToString(copy);
  if(button.dataset.chartExport==='svg'){download('gate-ec-chart.svg',source,'image/svg+xml');toast('SVG export prepared.');return}
  const image=new Image();
  const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
  image.onload=()=>{
    const canvas=document.createElement('canvas');
    canvas.width=1500;canvas.height=Math.round(1500*(copy.viewBox.baseVal.height||300)/(copy.viewBox.baseVal.width||750));
    const context=canvas.getContext('2d');
    context.fillStyle=exportTheme.background;context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{
      if(!blob){toast('PNG unavailable. Use SVG export.');return}
      const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download='gate-ec-chart.png';anchor.click();toast('PNG export prepared.');
      setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
    });
    URL.revokeObjectURL(url);
  };
  image.onerror=()=>{URL.revokeObjectURL(url);toast('PNG unavailable. Use SVG export.')};
  image.src=url;
};
document.getElementById('commandInput').oninput=()=>commands();

/* Difficulty sections reuse the original calculations and drilldown controls. */
ui.state.difficultyTab='papers';
function difficultyWorkspace() {
  const rows=toughRows(),stats=toughStats(rows);
  const switches='<div class="analysis-toolbar">'+
    ui.SegmentedControl([['papers','Paper comparison'],['topics','Topic difficulty'],['methods','Rubric & sensitivity']],ui.state.difficultyTab,'data-ui-difficulty-tab')+
    '<div class="analysis-options"><label><input id="excludeMTA" type="checkbox" '+(difficultyState.excludeMTA?'checked':'')+'> Exclude free marks</label><label>Confidence <select id="difficultyConfidence" aria-label="Difficulty confidence"><option value="all">All assessed</option><option value="high" '+(difficultyState.confidence==='high'?'selected':'')+'>High only</option></select></label></div></div>';
  const summary=metricCards([
    ['Selected questions',stats.n,stats.marks+' marks after difficulty filters'],
    ['Mean difficulty',F(stats.avg,2),'Each question contributes once','/100'],
    ['Marks-weighted mean',F(stats.weighted,2),'Weighted by question marks','/100'],
    ['Tough mark share',stats.marks?F(stats.bands.Tough.marks/stats.marks*100,1)+'%':'—',stats.bands.Tough.n+' tough-rated questions']
  ]);
  if(ui.state.difficultyTab==='papers'){
    return switches+summary+'<div class="grid-two">'+
      ui.ChartPanel('Difficulty by paper','Question or mark counts · select a segment to inspect',toughYearChart(rows),'Easy < '+difficultyState.easy+' · Tough ≥ '+difficultyState.tough,
        '<div class="tabs"><button data-diff-unit="questions" class="'+(difficultyState.unit==='questions'?'active':'')+'">Questions</button><button data-diff-unit="marks" class="'+(difficultyState.unit==='marks'?'active':'')+'">Marks</button></div>')+
      ui.ChartPanel('Score distribution','Structural content scores, not observed accuracy',toughHistogram(rows),'n = '+rows.length+' selected questions.')+'</div>'+
      panel('','Annual difficulty ledger','Counts and marks use the same cohort.',toughYearTable(rows))+
      '<details class="workspace-details" data-ui-disclosure="paper-comparison"><summary>Two-paper comparison & subject map</summary><div class="grid-two">'+panel('','Compare two papers','Active subject scope and difficulty filters',toughCompare(rows))+panel('','Subject × year difficulty','Mean score with sample sizes',toughHeat(rows))+'</div></details>';
  }
  if(ui.state.difficultyTab==='topics'){
    return switches+summary+'<div class="v5-controls"><label>Level <select id="topicGranularity"><option value="topic_family" '+(topicField==='topic_family'?'selected':'')+'>Topic family</option><option value="topic" '+(topicField==='topic'?'selected':'')+'>Reviewed topic</option><option value="microtopic" '+(topicField==='microtopic'?'selected':'')+'>Microtopic</option></select></label><label>Order <select id="topicDifficultySort">'+[['hard','Toughest first'],['easy','Easiest first'],['marks','Most easy marks'],['volatile','Most variable']].map(([value,label])=>'<option value="'+value+'" '+(difficultyState.topicSort===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Minimum sample <input id="topicMinN" type="number" min="1" max="100" value="'+difficultyState.minN+'"></label></div>'+
      panel('','Topic difficulty','Select a row for the exact contributing questions.',toughTopics(rows))+
      '<details class="workspace-details" data-ui-disclosure="topic-charts"><summary>Rankings, opportunity map & year-by-topic heatmap</summary>'+toughTopicHighlights(rows)+ui.ChartPanel('Marks versus challenge','Bubble area reflects question count',toughOpportunity(rows),'Historical content estimates. No future allocation is implied.')+toughTopicHeatPanel(rows)+'</details>'+
      '<details class="workspace-details" data-ui-disclosure="hardest-questions"><summary>Highest-challenge question ledger</summary>'+panel('','Question evidence','Open a question for its five component ratings.',toughQuestions(rows))+'</details>';
  }
  return switches+'<section class="panel rubric-settings"><div class="panel-head"><div><h2>Difficulty bands</h2><p class="panel-description">Changing labels leaves the underlying question scores unchanged.</p></div></div><div class="difficulty-controls"><label>Easy below <input id="easyCut" type="number" min="1" max="98" value="'+difficultyState.easy+'"></label><label>Tough from <input id="toughCut" type="number" min="2" max="100" value="'+difficultyState.tough+'"></label><button class="button" id="applyDifficultyBands">Apply bands</button><button class="link" id="difficultyReset">Reset rubric bands</button></div></section>'+toughRubric()+sensitivityPanel(rows)+componentPanel(rows);
}
routeFunctions.difficulty=difficultyWorkspace;
document.addEventListener('click',event=>{
  const tab=event.target.closest('[data-ui-difficulty-tab]');
  if(tab){ui.state.difficultyTab=tab.dataset.uiDifficultyTab;render()}
});
ui.state.disclosures=new Map();
document.addEventListener('toggle',event=>{
  const details=event.target;
  if(details.matches?.('[data-ui-disclosure]'))ui.state.disclosures.set(details.dataset.uiDisclosure,details.open);
},true);
const renderPresentation=render;
render=function(){
  renderPresentation();
  document.querySelectorAll('[data-ui-disclosure]').forEach(details=>{
    if(ui.state.disclosures.has(details.dataset.uiDisclosure))details.open=ui.state.disclosures.get(details.dataset.uiDisclosure);
  });
};
render();
window.addEventListener('click',event=>{
  if(event.target.closest('#chartDialog .expanded-chart-body [data-ui-point],#chartDialog .expanded-chart-body [data-ui-series],#chartDialog .expanded-chart-body [data-question],#chartDialog .expanded-chart-body [data-diff-drill],#chartDialog .expanded-chart-body [data-diff-topic],#chartDialog .expanded-chart-body [data-diff-topic-year]')){
    $('#chartDialog').close();
  }
},true);

/* SVG marks and semantic table rows need the same keyboard action as pointer selection. */
window.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&event.target.matches?.('[role="button"],[data-ui-point],[data-sort]')&&!event.target.matches('button,a,input,select,textarea')){
    event.preventDefault();event.stopImmediatePropagation();
    event.target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  }
},true);

document.addEventListener('click',event=>{
 const appearance=event.target.closest('[data-ui-theme]');
 if(appearance){const fromShortcut=!!appearance.closest('#appearanceMenu');appearanceEngine?.setPreference(appearance.dataset.uiTheme);closeAppearanceMenu();if(fromShortcut)document.querySelector('.theme-toggle')?.focus();}
 if(!event.target.closest('.appearance-anchor'))closeAppearanceMenu();
 if(event.target.closest('body>aside a'))setMobileNavigation(false);
});
document.addEventListener('toggle',event=>{
 if(event.target.matches?.('[data-nav-section]')){
  ui.state.navOpen=[...document.querySelectorAll('[data-nav-section][open]')].map(node=>node.dataset.navSection);
  safeSave('gate-ui-nav-sections',ui.state.navOpen);
 }
},true);
window.addEventListener('keydown',event=>{
 if(event.key==='Tab'&&document.body.classList.contains('mobile-nav-open')){
  const controls=[...document.querySelectorAll('body>aside a,body>aside button,body>aside summary')].filter(node=>node.getClientRects().length);
  const index=controls.indexOf(document.activeElement);
  if(event.shiftKey&&(index<=0)){event.preventDefault();controls.at(-1)?.focus();}
  else if(!event.shiftKey&&(index<0||index===controls.length-1)){event.preventDefault();controls[0]?.focus();}
 }
},true);
window.TerminalBoot.ready=true;
document.getElementById('startupState')?.remove();
document.getElementById('appSidebar')?.setAttribute('aria-label','Application navigation');

const importResponsesBeforeShell=importResponses;
importResponses=async function(file){
 await importResponsesBeforeShell(file);
 if(view==='responses')document.querySelector('header').innerHTML=ui.WorkspaceHeader();
};

/* The feature bridge is the sole boundary to legacy research bindings. */
window.TerminalResearchBridge={
 C,icon:ui.icon,render:()=>render(),toast:message=>toast(String(message)),getPreference:(key,fallback)=>safeLoad(key,fallback),setPreference:(key,value)=>safeSave(key,value),
 questions:()=>R.questions,scopeRows:()=>scope(),rows:()=>selectedQuestionRows(),
 subjects:()=>R.subjects,topics:subject=>[...new Set(R.questions.filter(q=>q.subject===subject).map(q=>q.topic_family))].sort(),
 query:()=>query,sort:()=>databaseSort,verdict:()=>verdict,difficultyBand:()=>difficultyQuestionBand,page:()=>page,setPage:value=>{page=value;},band:score=>toughBand(score),
 currentRoute:()=>view,
 applyQuestionParams(params){
  if(params.has('subject')&&R.subjects.includes(params.get('subject'))){$('#from').value=R.years[0];$('#to').value=R.years.at(-1);clearQuestionContext();$('#subject').value=params.get('subject');query='';verdict='all';difficultyQuestionBand='all';}
  if(params.has('year')&&R.years.includes(Number(params.get('year'))))$('#from').value=$('#to').value=params.get('year');
  page=0;
 },
 register(feature){
  Object.assign(routeFunctions,feature.renderers||{});Object.assign(ui.names,feature.names||{});Object.assign(ui.descriptions,feature.descriptions||{});
  Object.assign(notes,feature.descriptions||{});
 },
 installQuestionFilter(filter){const previous=selectedQuestionRows;selectedQuestionRows=function(){const rows=previous();return view==='questions'?filter(rows):rows;};},
 decorateInspector(callback){const previous=inspect;inspect=function(id){previous(id);callback(id);};}
};

/* Appearance only updates existing presentation nodes; in-progress forms and dialogs survive. */
appearanceEngine?.subscribe(applyWorkspaceAppearance);
applyWorkspaceAppearance();
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const wasOpen=document.getElementById('appearanceMenu')?.hidden===false;closeAppearanceMenu();if(wasOpen)document.querySelector('.theme-toggle')?.focus();}});
