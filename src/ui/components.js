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
