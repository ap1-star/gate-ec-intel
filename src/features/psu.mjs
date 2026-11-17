import {filterPsus,comparePsu,PSU_DIRECTORY,PSU_CATEGORIES,CAREER_DATA_VERSION,parseNumeric} from '../domains/career/index.mjs';

// Historical PSU references retain their original units and comparison engine.
export function createPsuWorkspace(bridge){
 const {C,icon}=bridge,E=C.escape;
 const defaults={psu:{year:'all',category:'GEN',metric:'all',query:'',value:'',candidateMetric:'gate_score',scoreBasis:'entered',linkSignature:null}};
 const state={psu:{...defaults.psu},page:{psu:0},error:{}};
 const number=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('en',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const select=(name,label,options,value,attributes='')=>'<label><span>'+E(label)+'</span><select name="'+E(name)+'" aria-label="'+E(label)+'" '+attributes+'>'+options.map(item=>{const [id,text]=Array.isArray(item)?item:[item,item];return '<option value="'+E(id)+'" '+(String(id)===String(value)?'selected':'')+'>'+E(text)+'</option>';}).join('')+'</select></label>';
 const input=(name,label,value,attributes='')=>'<label><span>'+E(label)+'</span><input name="'+E(name)+'" aria-label="'+E(label)+'" value="'+E(value)+'" '+attributes+'></label>';
 const panel=(title,description,body,extra='')=>'<section class="panel career-panel '+extra+'"><div class="panel-head"><div><h2>'+E(title)+'</h2>'+(description?'<p class="panel-description">'+E(description)+'</p>':'')+'</div></div><div class="panel-content">'+body+'</div></section>';
 const disclosure=()=>'<div class="career-evidence-note">'+icon('circle-help')+'<p>Preserved donor reference inputs · '+E(CAREER_DATA_VERSION)+'. Source labels are inherited claims, not a new independent certification. Historical comparisons do not establish future selection or admission.</p></div>';
 const error=(message)=>message?'<div class="career-error" role="alert">'+icon('circle-alert')+'<span>'+E(message)+'</span></div>':'';
 const metrics=items=>'<div class="metrics career-metrics">'+items.map(([label,value,detail])=>C.StatCard({label,valueHtml:E(value),detailHtml:E(detail)})).join('')+'</div>';
 const blank=(title,description)=>C.EmptyState({title,description});
 function setParamsFor(){
  const params=bridge.params(),signature=params.toString();
  if(state.psu.paramSignature===signature)return;
  state.psu={...defaults.psu,paramSignature:signature,linkSignature:signature};state.page.psu=0;
  for(const key of ['year','category','metric','query','candidateMetric','value'])if(params.has(key))state.psu[key]=params.get(key);
  if(params.has('score')){state.psu.value=params.get('score');state.psu.candidateMetric='gate_score';}
  else if(params.has('rank')){state.psu.value=params.get('rank');state.psu.candidateMetric='air';}
  state.psu.scoreBasis=params.get('scoreBasis')==='model_approximation'?'model_approximation':'entered';
 }
 function pagination(section,total){const p=state.page[section];return '<div class="pagination"><span>'+(total?p*20+1:0)+'–'+Math.min(total,p*20+20)+' of '+total+' rows</span><div><button class="button" data-career-page="'+section+'" data-delta="-1" '+(p===0?'disabled':'')+'>Previous</button><button class="button" data-career-page="'+section+'" data-delta="1" '+((p+1)*20>=total?'disabled':'')+'>Next</button></div></div>';}

 function psu(){setParamsFor('psu');const p=bridge.params();if(p.toString()!==state.psu.linkSignature){state.psu.linkSignature=p.toString();if(p.has('score')){state.psu.value=p.get('score');state.psu.candidateMetric='gate_score';state.psu.scoreBasis=p.get('scoreBasis')||'entered';}}let rows=[];try{if(!['marks','gate_score','air'].includes(state.psu.candidateMetric))throw Error('Choose a supported candidate metric.');rows=filterPsus(state.psu);if(state.psu.value!=='')parseNumeric(state.psu.value,'Candidate value',{minimum:state.psu.candidateMetric==='marks'?-20:state.psu.candidateMetric==='air'?1:0,maximum:state.psu.candidateMetric==='marks'?100:state.psu.candidateMetric==='gate_score'?1000:10000000,integer:state.psu.candidateMetric==='air'});state.error.psu='';}catch(e){state.error.psu=e.message;}
  const filters=state.psu,years=[...new Set(rows.map(r=>r.year))].sort((a,b)=>b-a),form='<form class="career-filter-form psu-context-form" data-career-form="psu"><div class="psu-primary-fields">'+select('candidateMetric','Your comparison unit',[['gate_score','GATE score /1000'],['marks','Marks /100'],['air','AIR']],filters.candidateMetric)+input('value','Your value',filters.value,'type="number" step="any" placeholder="Optional"')+select('category','Category',[['all','All categories'],...PSU_CATEGORIES],filters.category)+'<button class="button career-primary" type="submit">Compare references</button></div><details class="psu-more-filters"><summary>Refine historical records <span>Organization · recruitment year · record unit</span></summary><div>'+input('query','Search PSU',filters.query,'type="search" placeholder="Name or role"')+select('year','Recruitment year',[['all','All years'],2019,2021],filters.year)+select('metric','Record metric',[['all','All metrics'],['marks','Marks /100'],['gate_score','GATE score /1000'],['air','AIR']],filters.metric)+'</div></details></form>';
  const shown=rows.slice(state.page.psu*20,state.page.psu*20+20),table=C.DataTable({headers:['PSU / role','Year','Category','Metric','Historical cutoff','Comparison','Evidence'],rowsHtml:shown.map(row=>{let comp;try{comp=comparePsu(row,filters.value,filters.candidateMetric);}catch(e){comp={status:e.message};}return '<tr><td><strong>'+E(row.psu)+'</strong><small>'+E(row.role)+'</small></td><td>'+row.year+'</td><td>'+E(row.category)+'</td><td>'+E(row.metric==='gate_score'?'Score /1000':row.metric==='marks'?'Marks /100':'AIR')+'</td><td class="number-cell">'+(row.cutoff===null?'Not supplied':number(row.cutoff,row.metric==='marks'?2:0))+'</td><td>'+E(comp.status)+'</td><td>'+E(row.sourceDescription)+'<small>Donor claimed verified; compiled source, not independently certified here. Exact URL absent.</small></td></tr>';}).join('')});
  return '<div class="career-workspace psu-workspace"><section class="psu-summary"><div><span class="admissions-eyebrow">Historical PSU references</span><h2>Compare the right number, in the right unit.</h2><p>Marks, GATE score and AIR stay separate. These records describe past selection references.</p></div><a class="button" href="#recruitment">Find technical recruitment routes '+icon('arrow-right')+'</a></section><div class="psu-evidence-strip"><span><strong>'+rows.length+'</strong> matching source rows</span><span><strong>'+years.length+'</strong> recruitment years</span><span><strong>'+PSU_DIRECTORY.length+'</strong> organizations in the reference directory</span><span>Current hiring: check the exact notice</span></div>'+panel('Historical cutoff ledger','Candidate values are compared only to records using the same unit.',form+(filters.scoreBasis==='model_approximation'?'<p class="career-form-note">The forwarded GATE score is a model approximation, not an official score. Supply your official score for a direct unit-matched comparison.</p>':'')+error(state.error.psu)+table+(!rows.length?blank('No historical PSU rows match','Change the filters; no missing drive records are generated.'):'')+pagination('psu',rows.length))+'<details class="psu-directory-drawer"><summary>Explore the historical PSU directory <span>'+PSU_DIRECTORY.length+' organizations · context only</span></summary>'+panel('Recruitment reference directory','Preserved context; no active vacancy or present eligibility assertion',C.DataTable({headers:['Organisation','Sector','Typical role','Reference note'],rowsHtml:PSU_DIRECTORY.map(row=>'<tr><td><strong>'+E(row.psu)+'</strong><small>'+E(row.full_name)+'</small></td><td>'+E(row.sector)+'</td><td>'+E(row.typical_role)+'</td><td>'+E(row.note.replace(/verified cutoffs/gi,'supplied cutoff references'))+'<small>Historical donor context; verify the current recruitment notice.</small></td></tr>').join('')}))+'</details><details class="psu-method-drawer"><summary>Source quality and comparison limits</summary>'+disclosure()+'</details></div>';
 }

 function handleSubmit(event){
  const form=event.target.closest?.('[data-career-form="psu"]');if(!form||form.dataset.careerForm!=='psu')return false;
  event.preventDefault();const data=Object.fromEntries(new FormData(form).entries()),previous=state.psu;
  const unitChanged=data.candidateMetric!==previous.candidateMetric;
  state.psu={...previous,...data,value:unitChanged?'':data.value,scoreBasis:unitChanged||data.value!==previous.value?'entered':previous.scoreBasis};state.page.psu=0;
  bridge.render();return true;
 }
 function handleChange(event){
  const target=event.target,form=target.closest?.('[data-career-form="psu"]');
  if(!form||form.dataset.careerForm!=='psu'||target.name!=='candidateMetric')return false;
  // A number entered as a score must never silently become marks or AIR.
  state.psu.candidateMetric=target.value;state.psu.value='';state.psu.scoreBasis='entered';bridge.render();return true;
 }
 function handleClick(event){
  const button=event.target.closest?.('[data-career-page]');if(!button||button.dataset?.careerPage!=='psu')return false;
  let count=0;try{count=filterPsus(state.psu).length;}catch{}
  const delta=Number(button.dataset.delta);if(![-1,1].includes(delta))return false;
  state.page.psu=Math.max(0,Math.min(Math.max(0,Math.ceil(count/20)-1),state.page.psu+delta));bridge.render();return true;
 }
 return {render:psu,handleClick,handleChange,handleSubmit};
}
