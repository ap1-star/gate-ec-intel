/* One route catalogue; backend access is enforced separately from navigation. */
window.TerminalRoutes=(()=>{
 const entry=(id,label,icon,routes=[id],access='public')=>({id,label,icon,routes,status:'available',access});
 const groups=[
 {id:'research',label:'Research',icon:'flask-conical',items:[entry('monitor','Overview','layout-dashboard'),entry('explorer','Research Explorer','activity',['explorer','difficulty']),entry('subjects','Subject Analytics','chart-no-axes-combined',['subjects','compare']),entry('lab','Statistical Lab','flask-conical',['lab','distributions','inference','responses']),entry('questions','PYQ Intelligence','network',['questions','topics']),entry('scenarios','Scenario Lab','sliders-horizontal')]},
 {id:'career',label:'Admissions & careers',icon:'network',items:[entry('rank','Rank Intelligence','chart-no-axes-combined'),entry('opportunities','Programme Atlas','database',['opportunities','placements','companies','gate-reports','psu-evidence','bits-offers','career-sources']),entry('admissions','Original reference tools','file-text',['admissions','institutes','psu']),entry('recruitment','Technical Careers','activity',['recruitment','technical-exams','recruiters','recruitment-detail'])]},
 {id:'personal',label:'My workspace',icon:'layout-dashboard',items:[entry('dashboard','Dashboard','layout-dashboard',['dashboard','profile'],'authenticated'),entry('planner','Study Planner','rows-3',['planner'],'authenticated'),entry('mocks','Mock Analytics','chart-no-axes-combined',['mocks'],'authenticated'),entry('reminders','Reminders','circle-alert',['reminders'],'authenticated'),entry('recruitment-preferences','Career Preferences','sliders-horizontal',['recruitment-preferences'],'authenticated'),entry('recruitment-saved','Saved Opportunities','file-text',['recruitment-saved'],'authenticated'),entry('recruitment-notifications','Career Notifications','circle-alert',['recruitment-notifications'],'authenticated')]},
 {id:'community',label:'Community',icon:'rows-3',items:[entry('forum','Discussion Forum','rows-3')]},
 {id:'system',label:'Data & settings',icon:'database',items:[entry('audit','Data Integrity','database',['audit','evidence','reports']),entry('settings','Settings','sliders-horizontal')]}];
 const restricted=[entry('admin','Owner Analytics','activity',['admin'],'owner')];
 const working=groups.flatMap(g=>g.items),future=[];
 const aliases={'predictor':'rank','rank-predictor':'rank','psu-cutoffs':'psu','alerts':'reminders','pyqs':'questions','pyq-bank':'questions','admin/metrics':'admin','dashboard/settings':'profile'};
 const canonicalId=id=>Object.hasOwn(aliases,id)?aliases[id]:id;
 const find=id=>[...working,...restricted].find(i=>i.routes.includes(canonicalId(id)))||null;
 const sectionFor=id=>groups.find(group=>group.items.some(item=>item.routes.includes(canonicalId(id))))||(restricted.some(item=>item.routes.includes(canonicalId(id)))?{id:'owner',label:'Owner',icon:'circle-check',items:restricted}:null);
 const resolve=id=>{const canonical=canonicalId(id),item=find(canonical);return {id:canonical,entry:item,status:item?'available':'not-found'};};
 const researchExports=new Set(['monitor','explorer','subjects','topics','questions','difficulty','compare','lab','distributions','inference','responses','scenarios','audit','reports']);
 const canExport=(route,responseReady)=>researchExports.has(canonicalId(route))&&(canonicalId(route)!=='responses'||responseReady===true);
 const visibleGroups=owner=>owner===true?[...groups,{id:'owner',label:'Owner',icon:'circle-check',items:restricted}]:groups;
 const commandEntries=owner=>visibleGroups(owner).flatMap(g=>g.items);
 return Object.freeze({groups,working,future,restricted,aliases,canonicalId,find,sectionFor,resolve,canExport,visibleGroups,commandEntries});
})();
