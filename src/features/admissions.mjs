import {PROGRAMME_RECORDS,CATEGORIES,CAREER_DATA_VERSION,SOURCE_LINKS,filterProgrammes,compareProgramme,admissionBenchmarks,parseNumeric,safeSourceUrl} from '../domains/career/index.mjs';

const SECTIONS=new Set(['admissions','institutes']);
const DEFAULTS=Object.freeze({metric:'gate_score',score:'',rank:'',scoreBasis:'entered',year:'all',category:'GEN',institute:'all',programme:'all',query:'',ecOnly:false,availableOnly:false});
const RECORDS=new Map(PROGRAMME_RECORDS.map(row=>[row.id,row]));
const YEARS=[...new Set(PROGRAMME_RECORDS.map(row=>row.year))].sort((a,b)=>b-a);
const PROGRAMMES=[...new Set(PROGRAMME_RECORDS.map(row=>row.programme))].sort();
const PARAM_KEYS=['metric','score','rank','scoreBasis','year','category','institute','programme','query','ecOnly','availableOnly','record','compared'];
const number=(value,decimals=0)=>Number.isFinite(value)?value.toLocaleString('en',{maximumFractionDigits:decimals}):'—';
const rangeText=row=>row.range?(row.range[0]===row.range[1]?number(row.range[0]):number(row.range[0])+'–'+number(row.range[1])):'Not supplied';

export function admissionsCandidate(filters){
 if(!['gate_score','air'].includes(filters.metric))return {value:null,error:'Choose GATE score or AIR. Raw marks cannot be used as an admission score.'};
 const raw=filters.metric==='air'?filters.rank:filters.score;
 if(raw==='')return {value:null,error:''};
 try{return {value:parseNumeric(raw,filters.metric==='air'?'AIR':'GATE score',{minimum:filters.metric==='air'?1:0,maximum:filters.metric==='air'?10000000:1000,integer:filters.metric==='air'}),error:''};}
 catch(error){return {value:null,error:error.message};}
}

export function admissionsRows(filters){
 try{
  if(filters.year!=='all')parseNumeric(filters.year,'Record year',{minimum:1900,maximum:2100,integer:true});
  const rows=filterProgrammes(filters).filter(row=>filters.programme==='all'||!filters.programme||row.programme===filters.programme);
  rows.sort((a,b)=>b.year-a.year||a.institute.localeCompare(b.institute)||a.programme.localeCompare(b.programme)||a.id.localeCompare(b.id));
  return {rows,error:''};
 }catch(error){return {rows:[],error:error.message};}
}

export function compareAdmissionRecord(row,filters){
 const candidate=admissionsCandidate(filters);
 if(row.cutoff===null)return {status:'Cutoff not supplied',difference:null,tone:'missing'};
 if(candidate.error)return {status:'Candidate input needs correction',difference:null,tone:'neutral'};
 if(filters.metric==='air')return {status:'Programme AIR comparison unavailable',difference:null,tone:'neutral'};
 if(filters.category==='all')return {status:'Choose a candidate category to compare',difference:null,tone:'neutral'};
 if(row.category!==filters.category)return {status:'Different category; comparison not made',difference:null,tone:'neutral'};
 if(candidate.value===null)return {status:'Enter a GATE score to compare',difference:null,tone:'neutral'};
 const result=compareProgramme(row,candidate.value);
 return {...result,tone:result.difference===null?'neutral':result.difference>=0?'above':'below'};
}

export function admissionNavigationValues(filters,{record=null,compared=[]}={}){
 const result={metric:filters.metric,year:filters.year,category:filters.category,institute:filters.institute,programme:filters.programme,query:filters.query,ecOnly:filters.ecOnly?'1':'0',availableOnly:filters.availableOnly?'1':'0'};
 if(filters.metric==='gate_score'&&filters.score!==''){result.score=filters.score;result.scoreBasis=filters.scoreBasis;}
 if(filters.metric==='air'&&filters.rank!=='')result.rank=filters.rank;
 if(record&&RECORDS.has(record))result.record=record;
 if(compared.length)result.compared=JSON.stringify(compared.filter(id=>RECORDS.has(id)).slice(0,3));
 return result;
}

export function createAdmissionsFeature(bridge){
 const {C,icon}=bridge,E=C.escape;
 const state=Object.fromEntries([...SECTIONS].map(section=>[section,{filters:{...DEFAULTS},signature:null,selected:[],record:null,page:0,display:'table',notice:'',inputError:''}]));
 let searchTimer=null;
 const sourceLink=(row,label='Source document')=>{const url=safeSourceUrl(row.sourceUrl+(row.sourcePage?'#page='+row.sourcePage:''));return url?'<a class="text-link" href="'+E(url)+'" target="_blank" rel="noopener noreferrer">'+E(label)+' '+icon('external-link')+'</a>':'<span class="muted">Source link not supplied</span>';};
 const field=(section,name,label,value,attributes='')=>'<label class="admissions-field"><span>'+E(label)+'</span><input name="'+E(name)+'" data-admissions-field="'+E(name)+'" data-admissions-section="'+section+'" value="'+E(value)+'" '+attributes+'></label>';
 function select(section,name,label,options,value){
  const values=options.map(item=>Array.isArray(item)?item:[item,String(item)]);
  if(!values.some(([id])=>String(id)===String(value)))values.unshift([value,'Unavailable: '+value]);
  return '<label class="admissions-field"><span>'+E(label)+'</span><select name="'+E(name)+'" data-admissions-field="'+name+'" data-admissions-section="'+section+'">'+values.map(([id,text])=>'<option value="'+E(id)+'" '+(String(id)===String(value)?'selected':'')+'>'+E(text)+'</option>').join('')+'</select></label>';
 }
 const action=(section,name,label,extra='',className='button')=>'<button type="button" class="'+className+'" data-admissions-action="'+name+'" data-admissions-section="'+section+'" '+extra+'>'+label+'</button>';
 function readParams(section){
  const current=state[section],params=bridge.params(),signature=params.toString();
  if(current.signature===signature)return;
  current.signature=signature;
  if(!PARAM_KEYS.some(key=>params.has(key)))return;
  current.filters={...DEFAULTS};current.selected=[];current.record=null;current.page=0;current.notice='';current.inputError='';
  for(const key of ['metric','score','rank','year','category','institute','programme','query'])if(params.has(key))current.filters[key]=params.get(key);
  if(!params.has('metric')&&params.has('rank')&&!params.has('score'))current.filters.metric='air';
  current.filters.scoreBasis=params.get('scoreBasis')==='model_approximation'?'model_approximation':'entered';
  current.filters.ecOnly=params.get('ecOnly')==='1';current.filters.availableOnly=params.get('availableOnly')==='1';
  if(RECORDS.has(params.get('record')))current.record=params.get('record');
  if(params.has('compared'))try{const ids=JSON.parse(params.get('compared'));if(Array.isArray(ids))current.selected=[...new Set(ids.filter(id=>typeof id==='string'&&RECORDS.has(id)))].slice(0,3);}catch{/* Invalid comparison IDs do not invent records. */}
 }
 function controls(section){
  const f=state[section].filters;
  return '<section class="admissions-control-rail"><form data-career-form="'+section+'" class="admissions-controls"><div class="admissions-control-title"><span class="admissions-eyebrow">Your admission context</span><h2>Start with your score.</h2><p>Then inspect the programmes and their evidence.</p></div><div class="admissions-primary-fields">'+select(section,'metric','1 · Comparison unit',[['gate_score','GATE score / 1000'],['air','All-India rank (AIR)']],f.metric)+
   field(section,f.metric==='air'?'rank':'score',f.metric==='air'?'Candidate AIR':f.scoreBasis==='model_approximation'?'Approximate model score / 1000':'Candidate GATE score / 1000',f.metric==='air'?f.rank:f.score,'type="number" min="'+(f.metric==='air'?1:0)+'" max="'+(f.metric==='air'?10000000:1000)+'" step="'+(f.metric==='air'?1:'any')+'" placeholder="Optional" inputmode="decimal" class="admissions-candidate-input" aria-describedby="admissions-unit-'+section+'"')+
   select(section,'category','3 · Admission category',[...CATEGORIES,['all','All categories · browse only']],f.category)+select(section,'year','4 · Historical record year',[['all','All years'],...YEARS],f.year)+'</div><p class="admissions-unit-note" id="admissions-unit-'+section+'">'+(f.metric==='air'?'AIR is an ordinal rank. It is never converted into a programme GATE-score cutoff.':'Use your official GATE score, not raw or normalized marks. EC paper acceptance and degree eligibility are checked separately in each source record.')+'</p><details class="admissions-refinements" '+(f.query||f.institute!=='all'||f.programme!=='all'||f.ecOnly||f.availableOnly?'open':'')+'><summary>Refine programmes <span>Institute · discipline · EC paper · data availability</span></summary><div class="admissions-secondary-fields">'+field(section,'query','Search programmes',f.query,'type="search" placeholder="Programme, code or discipline" maxlength="160"')+select(section,'institute','Institute',[['all','All institutes'],['iisc','IISc Bengaluru'],['iitm','IIT Madras']],f.institute)+select(section,'programme','Programme / discipline',[['all','All programmes'],...PROGRAMMES],f.programme)+
   ['ecOnly','availableOnly'].map((key,index)=>'<label class="admissions-check"><input type="checkbox" name="'+key+'" data-admissions-field="'+key+'" data-admissions-section="'+section+'" '+(f[key]?'checked':'')+'><span>'+['EC paper explicitly listed','Numeric cutoff supplied'][index]+'</span></label>').join('')+
   '</div></details><div class="admissions-control-actions"><span>Results update as you change your context.</span><button type="submit" class="button career-primary">Update comparison '+icon('arrow-right')+'</button>'+action(section,'reset','Reset')+'</div></form></section>';
 }
 const validation=(message)=>message?'<div class="admissions-validation" role="alert">'+icon('circle-alert')+'<span>'+E(message)+'</span></div>':'';
 function comparisonHtml(row,f){
  const result=compareAdmissionRecord(row,f);
  const candidate=admissionsCandidate(f),plot=result.difference===null?'':'<span class="admissions-mini-scale" aria-hidden="true"><i style="width:'+Math.max(0,Math.min(100,row.cutoff/10))+'%"></i><b style="left:'+Math.max(0,Math.min(100,candidate.value/10))+'%"></b></span>';
  return '<span class="admissions-status tone-'+result.tone+'">'+E(result.status)+'</span>'+(result.difference===null?'':'<span class="admissions-difference">'+(result.difference>=0?'+':'')+number(result.difference,2)+' score points vs lower reference</span>')+plot;
 }
 function candidateSummary(f){const c=admissionsCandidate(f);return c.value===null?'No candidate '+(f.metric==='air'?'AIR':'score')+' entered':number(c.value,2)+(f.metric==='air'?' AIR':' / 1000')+(f.scoreBasis==='model_approximation'&&f.metric==='gate_score'?' · model approximation':'');}
 function insight(section,rows){
  const f=state[section].filters,candidate=admissionsCandidate(f),numeric=rows.filter(row=>row.cutoff!==null),compared=rows.map(row=>compareAdmissionRecord(row,f)),above=compared.filter(row=>row.difference!==null&&row.difference>=0).length,below=compared.filter(row=>row.difference!==null&&row.difference<0).length,ready=above+below>0;
  const title=ready?above+' of '+(above+below)+' comparable records are at or below your score':f.metric==='air'?'Your AIR stays separate from programme scores.':candidate.error?'Check your candidate input.':'See where your score sits in the evidence.';
  return '<section class="admissions-insight" data-admissions-insight aria-live="polite"><div><span class="admissions-eyebrow">'+E(candidateSummary(f))+'</span><h2>'+E(title)+'</h2><p>'+(ready?'This compares historical lower references only. It does not establish eligibility, a current seat or admission probability.':f.metric==='air'?'The programme dataset has no AIR cutoffs. Browse the records, or change the comparison unit to your official GATE score.':'Enter your official score above. Then compare programme, category, year and selection stage before making a shortlist.')+'</p></div><div class="admissions-insight-counts"><span><strong>'+rows.length+'</strong>source rows</span><span><strong>'+numeric.length+'</strong>numeric references</span>'+(ready?'<span class="tone-below"><strong>'+below+'</strong>above your score</span>':'<span><strong>'+new Set(rows.map(row=>row.institute)).size+'</strong>institutes</span>')+'</div></section>';
 }
 function instituteScope(section){
  if(section!=='institutes')return '';
  const f=state[section].filters,rows=admissionsRows({...f,institute:'all'}).rows;
  return '<section class="admissions-institute-index" aria-label="Choose an institute">'+[['all','All supplied institutes'],['iisc','IISc Bengaluru'],['iitm','IIT Madras']].map(([id,label])=>{const sourceRows=id==='all'?rows:rows.filter(row=>row.institute===id);return action(section,'institute','<strong>'+E(label)+'</strong><span>'+new Set(sourceRows.map(row=>row.programme)).size+' named programmes · '+sourceRows.length+' source rows</span>','data-institute="'+id+'" aria-pressed="'+(f.institute===id)+'"','admissions-institute-option');}).join('')+'</section>';
 }
 function scoreChart(section,rows,selected){
  const f=state[section].filters,candidate=admissionsCandidate(f),shown=selected.length?selected:rows.filter(row=>row.cutoff!==null).slice(0,4),height=Math.max(238,shown.length*58+98),left=196,right=760,width=right-left,x=score=>left+score/1000*width;
  if(!['gate_score','air'].includes(f.metric))return '<div class="admissions-unavailable">'+icon('circle-alert')+'<h3>Choose a supported comparison unit</h3><p>Raw marks, normalized marks, GATE score and AIR are not interchangeable. No candidate marker is plotted until the comparison unit is valid.</p></div>';
  if(f.metric==='air')return '<div class="admissions-unavailable"><span class="admissions-unavailable-icon">'+icon('chart-no-axes-combined')+'</span><h3>Programme AIR cutoffs are unavailable</h3><p>The supplied programme records use GATE score / 1000. Your AIR is kept separate; no score conversion or admission percentage is inferred.</p><span>Explore programme metadata below, or switch to GATE score.</span></div>';
  if(!shown.length)return '<div class="admissions-unavailable">'+icon('database')+'<h3>No numeric reference in this scope</h3><p>Broaden the filters or select a source record. A missing cutoff is not treated as zero.</p></div>';
  return '<div class="admissions-chart-scroll"><svg data-admissions-chart role="img" aria-label="Historical GATE score markers and operated ranges. Candidate score is a separate dashed vertical reference; not an admission probability." viewBox="0 0 800 '+height+'">'+
   [0,250,500,750,1000].map(score=>'<line class="admissions-chart-grid" x1="'+x(score)+'" x2="'+x(score)+'" y1="40" y2="'+(height-40)+'"/><text class="admissions-chart-tick" x="'+x(score)+'" y="'+(height-18)+'" text-anchor="middle">'+score+'</text>').join('')+
   '<g data-admissions-candidate class="admissions-candidate-marker" style="transform:translateX('+x(candidate.value??0)+'px)" '+(candidate.value===null?'visibility="hidden"':'')+'><line x1="0" x2="0" y1="24" y2="'+(height-40)+'"/><text data-admissions-candidate-label x="0" y="15" text-anchor="middle">Your '+number(candidate.value,2)+'</text></g>'+
   shown.map((row,index)=>{const y=68+index*58,color='var(--chart-series-'+(index%3+1)+')';return '<g class="admissions-reference-row"><text class="admissions-chart-record" x="6" y="'+(y-5)+'">'+E((row.programmeCode||row.programme).slice(0,27))+'</text><text class="admissions-chart-meta" x="6" y="'+(y+13)+'">'+E((row.institute==='iisc'?'IISc':'IITM')+' · '+row.year+' · '+row.category)+'</text>'+(row.cutoff===null?'<text x="'+left+'" y="'+(y+4)+'" class="admissions-chart-meta">Cutoff not supplied</text>':
    '<g class="admissions-chart-point" role="button" tabindex="0" aria-label="Inspect '+E(row.instituteName+' '+row.programme+' '+row.year+' '+row.category+' '+row.stage+' score '+rangeText(row))+'" data-admissions-action="detail" data-admissions-section="'+section+'" data-record="'+E(row.id)+'"><title>'+E(row.programme+' · '+row.year+' · '+row.category+' · '+row.stage+' · '+rangeText(row))+'</title><rect x="'+Math.max(left-12,x(row.cutoff)-18)+'" y="'+(y-20)+'" width="'+Math.max(40,(row.range?.[1]===undefined?0:x(row.range[1])-x(row.cutoff))+36)+'" height="40" fill="transparent"/>'+(row.range&&row.range[1]!==row.range[0]?'<line x1="'+x(row.range[0])+'" x2="'+x(row.range[1])+'" y1="'+y+'" y2="'+y+'" stroke="'+color+'" class="admissions-range-line"/>':'')+'<circle cx="'+x(row.cutoff)+'" cy="'+y+'" r="6" fill="var(--surface)" stroke="'+color+'" stroke-width="3"/><text class="admissions-chart-value" x="'+Math.min(right-4,x(row.cutoff)+12)+'" y="'+(y-11)+'" text-anchor="'+(row.cutoff>920?'end':'start')+'">'+E(rangeText(row))+'</text></g>')+'</g>';}).join('')+'</svg></div><div class="admissions-chart-legend"><span><i class="legend-reference"></i> Supplied cutoff / operated range</span><span><i class="legend-candidate"></i> Your GATE score</span></div>';
 }
 function chartPanel(section,rows,selected){
  const f=state[section].filters,candidate=admissionsCandidate(f),count=rows.filter(row=>row.cutoff!==null).length;
  return '<section class="admissions-evidence-stage"><div class="admissions-stage-head"><div><span class="admissions-eyebrow">Historical admission comparison</span><h2>Evidence before expectation</h2><p>'+E(selected.length?'Selected records · each year, category and stage stays explicit':'Current results preview · first four numeric references')+'</p></div><div class="admissions-score-summary"><span>'+E(f.metric==='air'?'Your AIR':'Your GATE score')+'</span><strong data-admissions-score-display>'+number(candidate.value,2)+'</strong><small>'+(f.metric==='air'?'rank · kept separate':f.scoreBasis==='model_approximation'?'model approximation / 1000':'entered score / 1000')+'</small></div></div>'+scoreChart(section,rows,selected)+'<div class="admissions-evidence-stats"><span><strong>'+rows.length+'</strong> matching source rows</span><span><strong>'+count+'</strong> numeric references</span><span><strong>'+new Set(rows.map(row=>row.institute)).size+'</strong> institutes represented</span></div><p class="admissions-chart-note">Markers describe supplied historical evidence. Operated-score ranges and shortlist cutoffs have different source stages; they are not interchangeable admission guarantees.</p></section>';
 }
 function recordCard(section,row,selected,compact=false){
  const f=state[section].filters;
  return '<article class="admissions-record'+(selected?' is-selected':'')+(compact?' is-comparison':'')+'" data-record-card="'+E(row.id)+'"><div class="admissions-record-top"><span class="admissions-institute-mark">'+E(row.institute==='iisc'?'IISc':'IITM')+'</span><span>'+E(row.year+' · '+row.category)+'</span>'+action(section,'compare',icon(selected?'circle-check':'plus')+'<span>'+(selected?'Selected':'Compare')+'</span>','data-record="'+E(row.id)+'" aria-pressed="'+selected+'" aria-label="'+E((selected?'Remove ':'Compare ')+row.programme+' '+row.year+' '+row.category+' '+row.stage)+'"','button admissions-compare-toggle')+'</div><h3>'+E(row.programme)+'</h3><p class="admissions-record-institute">'+E(row.instituteName)+(row.programmeCode?' · '+E(row.programmeCode):'')+'</p><div class="admissions-record-reference"><strong>'+E(rangeText(row))+'</strong><span>GATE score / 1000<br>'+E(row.cutoffType)+'</span></div><div class="admissions-record-context"><span>'+E(row.stage)+'</span><span>'+E(row.ecPaperAccepted===true?'EC paper stated':row.ecPaperAccepted===false?'EC paper not listed':'Accepted paper unclear')+'</span></div><div class="admissions-comparison-copy" data-admissions-comparison="'+E(row.id)+'">'+comparisonHtml(row,f)+'</div><div class="admissions-record-actions">'+action(section,'detail','Institute details '+icon('arrow-up-right'),'data-record="'+E(row.id)+'"','text-link')+sourceLink(row,'Source')+'</div></article>';
 }
 function comparisonPanel(section,selected){
  const current=state[section];
  return '<section class="admissions-comparison-panel" aria-label="Selected institute and programme comparison"><div class="admissions-section-head"><div><span class="admissions-eyebrow">Compare your shortlist</span><h2>Selected evidence <span class="admissions-count">'+selected.length+' / 3</span></h2><p>Pin up to three programme records. Selections stay visible when filters change; each record retains its own source context.</p></div>'+(selected.length?action(section,'clear','Clear selection'):'')+'</div>'+(selected.length?'<div class="admissions-comparison-grid">'+selected.map(row=>recordCard(section,row,true,true)).join('')+'</div>':'<div class="admissions-comparison-empty"><span>'+icon('rows-3')+'</span><p>Select <strong>Compare</strong> on a programme to build a side-by-side evidence workspace.</p></div>')+'<p class="admissions-live-notice" aria-live="polite" role="status">'+E(current.notice)+'</p></section>';
 }
 function recordTable(section,rows){
  const selected=state[section].selected;
  return C.DataTable({headers:['Compare','Programme / institute','Year · category · stage','GATE score evidence','Candidate comparison','Source / details'],rowsHtml:rows.map(row=>'<tr><td>'+action(section,'compare',selected.includes(row.id)?icon('circle-check'):icon('plus'),'data-record="'+E(row.id)+'" aria-pressed="'+selected.includes(row.id)+'" aria-label="Compare '+E(row.programme+' '+row.year+' '+row.category+' '+row.stage)+'"','icon-button')+'</td><td><strong>'+E(row.programme)+'</strong><small>'+E(row.instituteName+(row.programmeCode?' · '+row.programmeCode:''))+'</small></td><td>'+E(row.year+' · '+row.category)+'<small>'+E(row.stage)+'</small></td><td class="number-cell">'+E(rangeText(row))+'<small>'+E(row.cutoffType)+'</small></td><td><div class="admissions-comparison-copy" data-admissions-comparison="'+E(row.id)+'">'+comparisonHtml(row,state[section].filters)+'</div></td><td>'+action(section,'detail','Details','data-record="'+E(row.id)+'"','text-link')+' '+sourceLink(row,'Source')+'</td></tr>').join('')});
 }
 function results(section,rows){
  const current=state[section],pageSize=8,maxPage=Math.max(0,Math.ceil(rows.length/pageSize)-1);current.page=Math.min(maxPage,current.page);
  const shown=rows.slice(current.page*pageSize,(current.page+1)*pageSize);
  return '<section class="admissions-results"><div class="admissions-section-head"><div><span class="admissions-eyebrow">Programme evidence library</span><h2>'+rows.length+' source records</h2><p>Only IISc Bengaluru and IIT Madras are represented in this supplied dataset.</p></div><div class="segmented-control" aria-label="Record display">'+['cards','table'].map(display=>action(section,'display',display==='cards'?'Cards':'Table','data-display="'+display+'" aria-pressed="'+(current.display===display)+'"')).join('')+'</div></div>'+(shown.length?(current.display==='table'?recordTable(section,shown):'<div class="admissions-record-grid">'+shown.map(row=>recordCard(section,row,current.selected.includes(row.id))).join('')+'</div>'):C.EmptyState({title:'No programme records match',description:'Broaden the institute, year, programme or category filters. Missing records are never substituted.'}))+'<div class="pagination"><span>'+(rows.length?current.page*pageSize+1:0)+'–'+Math.min(rows.length,(current.page+1)*pageSize)+' of '+rows.length+' records</span><div>'+action(section,'page','Previous','data-delta="-1" '+(current.page===0?'disabled':''))+action(section,'page','Next','data-delta="1" '+(current.page>=maxPage?'disabled':''))+'</div></div></section>';
 }
 function details(section){
  const current=state[section],row=RECORDS.get(current.record);
  if(!row)return '';
  const related=PROGRAMME_RECORDS.filter(record=>record.programme===row.programme&&record.institute===row.institute&&record.category===row.category).sort((a,b)=>a.year-b.year||a.id.localeCompare(b.id));
  return '<section id="admissions-evidence-'+section+'" class="admissions-source-detail"><div class="admissions-section-head"><div><span class="admissions-eyebrow">Institute details / exact source record</span><h2>'+E(row.programme)+'</h2><p>'+E(row.instituteName+' · '+row.year+' · '+row.category+' · '+row.stage)+'</p></div>'+action(section,'close-detail',icon('x'),'aria-label="Close source details"','icon-button')+'</div><div class="admissions-source-body"><div class="admissions-source-primary"><strong>'+E(rangeText(row))+'</strong><span>'+E(row.cutoffType)+'</span><div class="admissions-comparison-copy" data-admissions-comparison="'+E(row.id)+'">'+comparisonHtml(row,current.filters)+'</div><p>'+E(row.eligibilityNote)+'</p>'+(row.note?'<p>'+E(row.note)+'</p>':'')+sourceLink(row,'Open source document')+'</div><dl><dt>Programme / track</dt><dd>'+E(row.programmeCode||row.programme)+' · '+E(row.stage)+'</dd><dt>Source filename</dt><dd>'+E(row.sourceFilename??'Not supplied')+'</dd><dt>Source page</dt><dd>'+E(row.sourcePage??'Not supplied')+'</dd><dt>Accepted EC paper</dt><dd>'+E(row.ecPaperAccepted===true?'Explicitly listed':row.ecPaperAccepted===false?'Not listed in this source row':'Not confirmed')+'</dd><dt>Degree context</dt><dd>'+E(row.degreeEligibility)+'</dd><dt>Evidence status</dt><dd>Supplied reference; not independently certified in this integration.</dd><dt>Record identifier</dt><dd class="admissions-record-id">'+E(row.id)+'</dd></dl></div><details class="admissions-history"><summary>Historical cutoff evidence · '+related.length+' exact source rows '+icon('chevron-down')+'</summary><p>Same named programme and category. Distinct qualifying-discipline rows and stages remain separate; no trend line or missing cutoff is inferred.</p>'+C.DataTable({headers:['Year','Programme / track','Stage','Score evidence','Source'],rowsHtml:related.map(record=>'<tr><td>'+record.year+'</td><td>'+E(record.programmeCode||record.programme)+'</td><td>'+E(record.stage)+'</td><td>'+E(rangeText(record))+'</td><td>'+sourceLink(record)+'</td></tr>').join('')})+'</details>'+(Object.keys(row.otherSourceCategories??{}).length?'<details class="admissions-history"><summary>Other source category labels '+icon('chevron-down')+'</summary><p>Original labels are retained without assuming equivalence to the five main admission categories.</p>'+Object.entries(row.otherSourceCategories).map(([key,value])=>'<p><strong>'+E(key)+'</strong> '+E(Array.isArray(value)?value.join('–'):'Not supplied')+'</p>').join('')+'</details>':'')+'</section>';
 }
 function benchmarkDisclosure(section){
  const f=state[section].filters;let tiers=[];
  try{if(f.metric==='air'&&admissionsCandidate(f).value!==null)tiers=admissionBenchmarks(f.rank);}catch{/* Candidate validation is shown above. */}
  return '<details class="admissions-method"><summary>Coverage, source context & AIR tier references '+icon('chevron-down')+'</summary><div class="admissions-method-grid"><div><h3>Historical evidence only</h3><p>IISc ranges describe operated GATE scores. IIT Madras records can differ by qualifying discipline and track. EC degree eligibility and accepted GATE EC paper are separate questions.</p></div><div><h3>Missing data stays missing</h3><p>No institute/programme-specific NIT/IIIT cutoff extract, current seat availability or future counselling outcome is supplied. No admission percentage or guarantee is calculated.</p><a class="text-link" href="'+E(SOURCE_LINKS.ccmt)+'" target="_blank" rel="noopener noreferrer">Official CCMT records '+icon('external-link')+'</a></div><div><h3>Reference provenance</h3><p>Preserved donor references · '+E(CAREER_DATA_VERSION)+'. Source labels are inherited claims, not a new independent certification.</p><a class="text-link" href="'+E(SOURCE_LINKS.iisc)+'" target="_blank" rel="noopener noreferrer">IISc source index '+icon('external-link')+'</a></div></div>'+(f.metric==='air'?'<h3>Separate broad AIR tier benchmarks</h3><p>These preserved heuristic tiers are not programme cutoffs. They do not establish eligibility or admission probability.</p>'+(tiers.length?C.DataTable({headers:['Tier','Reference AIR','Heuristic comparison','Limitations'],rowsHtml:tiers.map(row=>'<tr><td>'+E(row.name)+'</td><td>'+E(row.benchmark?.air??'Not supplied')+'</td><td>'+E(row.status)+'</td><td>'+E(row.note)+'</td></tr>').join('')}):'<p>Enter a valid AIR to inspect broad tier references.</p>'):'')+'</details>';
 }
 function output(section){
  const current=state[section],filtered=admissionsRows(current.filters),candidate=admissionsCandidate(current.filters),selected=current.selected.map(id=>RECORDS.get(id)).filter(Boolean);
  return '<div id="admissions-validation-'+section+'">'+validation(current.inputError||filtered.error||candidate.error)+'</div>'+insight(section,filtered.rows)+(current.filters.scoreBasis==='model_approximation'&&current.filters.metric==='gate_score'?'<p class="admissions-model-note">The forwarded score is a donor-model approximation. Replace it with your official score for a direct historical score comparison.</p>':'')+instituteScope(section)+details(section)+results(section,filtered.rows)+(selected.length?comparisonPanel(section,selected):'<details class="admissions-comparison-drawer"><summary>Build a side-by-side comparison <span>Select up to three source records</span></summary>'+comparisonPanel(section,selected)+'</details>')+'<details class="admissions-chart-drawer" '+(selected.length?'open':'')+'><summary>Visualise historical score references <span>0–1000 scale · source-stage context</span></summary>'+chartPanel(section,filtered.rows,selected)+'</details><p class="admissions-current-scenario" id="admissions-candidate-summary-'+section+'">'+E(candidateSummary(current.filters))+'</p>'+benchmarkDisclosure(section);
 }
 function render(section){
  readParams(section);
  return '<div class="career-workspace admissions-workspace" data-admissions-root="'+section+'"><div class="admissions-context-strip"><span>'+icon('database')+' Historical admission evidence</span><span>Coverage: IISc Bengaluru + IIT Madras</span><span>No admission probabilities</span></div><div class="admissions-layout">'+controls(section)+'<div class="admissions-main" id="admissions-output-'+section+'">'+output(section)+'</div></div></div>';
 }
 function patch(section,{candidateOnly=false}={}){
  if(typeof bridge.currentRoute==='function'&&bridge.currentRoute()!==section)return;
  if(typeof document==='undefined'){bridge.render();return;}
  const root=document.getElementById('admissions-output-'+section);
  if(!root){bridge.render();return;}
  const current=state[section],candidate=admissionsCandidate(current.filters);
  if(candidateOnly&&current.filters.metric==='gate_score'&&root.querySelector?.('[data-admissions-candidate]')){
   const marker=root.querySelector('[data-admissions-candidate]');
   marker.style.transform='translateX('+(196+(candidate.value??0)/1000*564)+'px)';
   marker.setAttribute('visibility',candidate.value===null?'hidden':'visible');
   const label=marker.querySelector('[data-admissions-candidate-label]');if(label)label.textContent='Your '+number(candidate.value,2);
   const display=root.querySelector('[data-admissions-score-display]');if(display)display.textContent=number(candidate.value,2);
   for(const copy of root.querySelectorAll('[data-admissions-comparison]')){const row=RECORDS.get(copy.dataset.admissionsComparison);if(row)copy.innerHTML=comparisonHtml(row,current.filters);}
   const summary=document.getElementById('admissions-candidate-summary-'+section);if(summary)summary.textContent=candidateSummary(current.filters);
   const error=document.getElementById('admissions-validation-'+section);if(error)error.innerHTML=validation(current.inputError||candidate.error);
   const input=document.querySelector?.('[data-admissions-section="'+section+'"][data-admissions-field="score"]');if(input)input.setAttribute('aria-invalid',String(!!(current.inputError||candidate.error)));
   const basis=root.querySelector('.admissions-score-summary small');if(basis)basis.textContent=current.filters.scoreBasis==='model_approximation'?'model approximation / 1000':'entered score / 1000';
   const note=root.querySelector('.admissions-model-note');if(note&&current.filters.scoreBasis!=='model_approximation')note.remove();
   const summaryPanel=root.querySelector('[data-admissions-insight]');if(summaryPanel)summaryPanel.outerHTML=insight(section,admissionsRows(current.filters).rows);
   return;
  }
  const active=typeof document.activeElement?.dataset==='object'?{...document.activeElement.dataset}:null;
  root.innerHTML=output(section);root.classList.remove('admissions-updated');void root.offsetWidth;root.classList.add('admissions-updated');
  if(active?.admissionsAction)for(const button of root.querySelectorAll?.('[data-admissions-action]')||[])if(button.dataset.admissionsAction===active.admissionsAction&&button.dataset.record===active.record){button.focus();break;}
 }
 function updateField(target){
  const section=target.dataset?.admissionsSection,name=target.dataset?.admissionsField;if(!SECTIONS.has(section)||!Object.hasOwn(DEFAULTS,name))return false;
  const current=state[section];
  if(name==='metric'){
   if(searchTimer!==null){clearTimeout(searchTimer);searchTimer=null;}
   current.filters.metric=target.value;current.filters.score='';current.filters.rank='';current.filters.scoreBasis='entered';current.inputError='';current.notice='Comparison unit changed. Candidate value cleared to prevent a score/AIR mix-up.';bridge.render();return true;
  }
  current.filters[name]=target.type==='checkbox'?target.checked:target.value;
  if(name==='score'){
   current.filters.scoreBasis='entered';
   const label=target.closest?.('label')?.querySelector?.('span');if(label)label.textContent='Candidate GATE score / 1000';
  }
  if(['score','rank'].includes(name)){
   current.inputError=target.validity?.badInput?'Enter a numeric '+(name==='rank'?'AIR.':'GATE score.'):'';
   target.setAttribute?.('aria-invalid',String(!!(current.inputError||admissionsCandidate(current.filters).error)));
  }
  if(!['score','rank'].includes(name))current.page=0;
  if(name==='query'){
   if(searchTimer!==null)clearTimeout(searchTimer);
   searchTimer=setTimeout(()=>{searchTimer=null;if(typeof bridge.currentRoute!=='function'||bridge.currentRoute()===section)patch(section);},90);
  }else patch(section,{candidateOnly:name==='score'});
  return true;
 }
 function handleInput(event){const target=event.target;if(!target?.dataset?.admissionsField||!['score','rank','query'].includes(target.dataset.admissionsField))return false;return updateField(target);}
 function handleChange(event){const target=event.target;if(!target?.dataset?.admissionsField)return false;if(['score','rank','query'].includes(target.dataset.admissionsField))return false;return updateField(target);}
 function handleSubmit(event){
  const form=event.target.closest?.('[data-career-form]'),section=form?.dataset?.careerForm;if(!SECTIONS.has(section))return false;
  event.preventDefault();if(searchTimer!==null){clearTimeout(searchTimer);searchTimer=null;}patch(section);return true;
 }
 function handleClick(event){
  const button=event.target.closest?.('[data-admissions-action]'),actionName=button?.dataset?.admissionsAction,section=button?.dataset?.admissionsSection;
  if(!SECTIONS.has(section)||!actionName)return false;
  const current=state[section],id=button.dataset.record,row=RECORDS.get(id);
  if(actionName==='reset'){if(searchTimer!==null){clearTimeout(searchTimer);searchTimer=null;}current.filters={...DEFAULTS};current.selected=[];current.record=null;current.page=0;current.notice='Scenario and filters reset.';current.inputError='';bridge.render();}
  else if(actionName==='institute'&&['all','iisc','iitm'].includes(button.dataset.institute)){current.filters.institute=button.dataset.institute;current.page=0;bridge.render();}
  else if(actionName==='compare'&&row){
   if(current.selected.includes(id)){current.selected=current.selected.filter(value=>value!==id);current.notice='Record removed from comparison.';}
   else if(current.selected.length>=3){current.notice='Compare up to three records. Remove one before adding another.';}
   else{current.selected.push(id);current.notice='Added '+row.programme+' · '+row.year+' · '+row.category+'.';}
   patch(section);
  }else if(actionName==='clear'){current.selected=[];current.notice='Comparison cleared.';patch(section);}
  else if(actionName==='display'&&['cards','table'].includes(button.dataset.display)){current.display=button.dataset.display;patch(section);}
  else if(actionName==='page'){current.page=Math.max(0,current.page+Number(button.dataset.delta||0));patch(section);}
  else if(actionName==='detail'&&row){
   if(section==='admissions')bridge.navigate('institutes',admissionNavigationValues(current.filters,{record:id,compared:current.selected}));
   else{current.record=id;patch(section);if(typeof document!=='undefined')document.getElementById('admissions-evidence-'+section)?.scrollIntoView?.({block:'start'});}
  }else if(actionName==='close-detail'){current.record=null;patch(section);}
  else return false;
  return true;
 }
 function handleKeyDown(event){if(!['Enter',' '].includes(event.key)||event.target.tagName?.toLowerCase()!=='g'||!event.target.dataset?.admissionsAction)return false;event.preventDefault();return handleClick(event);}
 return {renderers:{admissions:()=>render('admissions'),institutes:()=>render('institutes')},handleInput,handleChange,handleClick,handleSubmit,handleKeyDown,afterRender(){},resetUser(){},getSnapshot(section='admissions'){const current=state[section];return {filters:{...current.filters},selected:[...current.selected],record:current.record,page:current.page,display:current.display};}};
}
