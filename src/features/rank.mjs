import {predictRank,rankSeries,historicalComparison,REFERENCE,SUPPORTED_YEARS,CATEGORIES,SOURCE_LINKS,safeSourceUrl,CAREER_DATA_VERSION} from '../domains/career/index.mjs';

// The presentation consumes the preserved predictor. No model or reference input is changed here.
export const RANK_SCENARIO_IDS=Object.freeze(['A','B','C']);
export function rankInputSupport(year){
 return Number(year)===2026?{minimum:REFERENCE.RECONSTRUCTED_2026_EXTERNAL_CURVE.supported_marks.minimum,maximum:REFERENCE.RECONSTRUCTED_2026_EXTERNAL_CURVE.supported_marks.maximum}:{minimum:-20,maximum:100};
}
export function evaluateRankScenarios({year,category='GEN',toughness=0,scenarios=[]}){
 return scenarios.slice(0,3).map(scenario=>{
  const value=scenario.marks;
  if(scenario.inputError)return {...scenario,result:null,error:scenario.inputError,empty:false};
  if(value===null||value===undefined||String(value).trim()==='')return {...scenario,result:null,error:'',empty:true};
  try{return {...scenario,result:predictRank({marks:value,year,category,toughness:Number(year)===2027?toughness:0}),error:'',empty:false};}
  catch(error){return {...scenario,result:null,error:error.message,empty:false};}
 });
}
const curveCache=new Map();
function cachedCurve(year,category,toughness){
 const key=[year,category,Number(year)===2027?toughness:0].join(':');
 if(!curveCache.has(key))curveCache.set(key,rankSeries(Number(year),category,Number(year)===2027?Number(toughness):0));
 return curveCache.get(key);
}
export function createRankChartModel({year,category='GEN',toughness=0,scenarios=[],referenceYear='',width=760,height=330}){
 const support=rankInputSupport(year),curve=cachedCurve(year,category,toughness);
 const reference=referenceYear&&Number(referenceYear)!==Number(year)?cachedCurve(referenceYear,category,0).filter(point=>point.marks>=support.minimum&&point.marks<=support.maximum):[];
 const evaluations=evaluateRankScenarios({year,category,toughness,scenarios});
 const maximumRank=Math.max(10,...curve.map(point=>point.rank),...reference.map(point=>point.rank));
 const left=58,right=width-24,top=30,bottom=height-46;
 const x=marks=>left+(marks-support.minimum)/(support.maximum-support.minimum)*(right-left);
 const y=rank=>top+Math.log10(Math.max(1,rank))/Math.log10(maximumRank)*(bottom-top);
 const anchor=REFERENCE.DATA.years_data.find(row=>row.year===Number(year));
 const sourceAnchor=anchor&&Number(year)!==2027&&Number.isFinite(anchor.air1_marks)&&anchor.air1_marks>=support.minimum&&anchor.air1_marks<=support.maximum?{marks:anchor.air1_marks,rank:1,x:x(anchor.air1_marks),y:y(1)}:null;
 const tickCount=width<500?2:4;
 return {width,height,support,maximumRank,left,right,top,bottom,
  curve:curve.map(point=>({...point,x:x(point.marks),y:y(point.rank)})),
  reference:reference.map(point=>({...point,x:x(point.marks),y:y(point.rank)})),
  yTicks:[1,10,100,1000,10000,100000,1000000].filter(value=>value<=maximumRank).map(value=>({value,y:y(value)})),
  xTicks:Array.from({length:tickCount+1},(_,i)=>{const value=support.minimum+(support.maximum-support.minimum)*i/tickCount;return {value,x:x(value)};}),
  markers:evaluations.filter(item=>item.result).map(item=>({id:item.id,result:item.result,x:x(item.result.marks),y:y(item.result.rank),lowY:y(item.result.lowRank),highY:y(item.result.highRank)})),
  sourceAnchor
 };
}
export function rankHandoff(result){
 if(!result)return null;
 return {admissions:{rank:result.rank,score:result.score,category:result.category,year:result.year,scoreBasis:'model_approximation',metric:'gate_score'},
  psu:{score:result.score,category:result.category,scoreBasis:'model_approximation'}};
}

export function createRankWorkspace(bridge){
 const {C,icon}=bridge,E=C.escape;
 const fresh=()=>({year:'2025',category:'GEN',toughness:'0',scenarios:[{id:'A',marks:''}],active:'A',referenceYear:'',params:null,message:'',saving:false,revision:0,chartWidth:760});
 let state=fresh(),frame=null,announcementTimer=null,resizeObserver=null,observedRoot=null,saveGeneration=0;
 const doc=()=>typeof document==='undefined'?null:document;
 const root=()=>doc()?.querySelector?.('[data-rank-root]')??null;
 const active=()=>state.scenarios.find(scenario=>scenario.id===state.active)??state.scenarios[0];
 const number=(value,decimals=0)=>Number.isFinite(value)?value.toLocaleString('en',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}):'—';
 const evaluations=()=>evaluateRankScenarios({...state});
 const activeEvaluation=()=>evaluations().find(item=>item.id===state.active);
 const validationHtml=()=>{const current=activeEvaluation();return current?.error?'<div class="rank-input-error" role="alert">'+icon('circle-alert')+'<span>'+E(current.error)+'</span></div>':'';};
 const source=(url,label)=>{const safe=safeSourceUrl(url);return safe?'<a class="text-link" href="'+E(safe)+'" target="_blank" rel="noopener noreferrer">'+E(label)+' '+icon('external-link')+'</a>':'';};
 const select=(name,label,options,value,attributes='')=>'<label><span>'+E(label)+'</span><select name="'+E(name)+'" data-rank-field="'+E(name)+'" '+attributes+'>'+(!options.some(item=>String(Array.isArray(item)?item[0]:item)===String(value))?'<option value="'+E(value)+'" selected disabled>Unsupported selection</option>':'')+options.map(item=>{const [id,text]=Array.isArray(item)?item:[item,item];return '<option value="'+E(id)+'" '+(String(value)===String(id)?'selected':'')+'>'+E(text)+'</option>';}).join('')+'</select></label>';
 function loadParams(){
  const params=bridge.params(),signature=params.toString();
  if(signature===state.params)return;
  state.params=signature;
  if(!['marks','year','category','toughness','scenarioB','scenarioC'].some(key=>params.has(key)))return;
  const revision=state.revision+1;state={...fresh(),params:signature,revision};saveGeneration++;
  for(const field of ['year','category','toughness'])if(params.has(field))state[field]=params.get(field);
  if(Number(state.year)!==2027)state.toughness='0';
  if(params.has('marks'))state.scenarios[0].marks=params.get('marks');
  for(const id of ['B','C'])if(params.has('scenario'+id))state.scenarios.push({id,marks:params.get('scenario'+id)});
 }
 function controls(){
  const support=rankInputSupport(state.year),item=active(),numeric=Number(item.marks),filled=String(item.marks).trim()!==''&&Number.isFinite(numeric);
  return '<form class="rank-input-form" data-career-form="rank" novalidate><div class="rank-input-heading"><span class="rank-eyebrow">01 / Your scenario</span><button class="text-link" type="button" data-rank-action="reset">'+icon('rotate-ccw')+' Reset</button></div>'+
   '<div class="rank-active-scenario" data-rank-region="tabs">'+scenarioTabs()+'</div>'+
   '<label class="rank-marks-label" for="rankMarks">GATE EC marks <span>/ 100</span></label><div class="rank-marks-input"><input id="rankMarks" name="marks" data-rank-field="marks" type="number" inputmode="decimal" min="'+support.minimum+'" max="'+support.maximum+'" step="0.01" value="'+E(item.marks)+'" placeholder="—" aria-describedby="rankInputHelp rankInputError"><span>marks</span></div>'+
   '<label class="rank-sr-only" for="rankMarksSlider">Adjust marks for scenario '+E(item.id)+'</label><input id="rankMarksSlider" class="rank-marks-slider" data-rank-field="slider" type="range" min="'+support.minimum+'" max="'+support.maximum+'" step="0.01" value="'+(filled?Math.min(support.maximum,Math.max(support.minimum,numeric)):support.minimum)+'" aria-describedby="rankInputHelp" aria-valuetext="'+E(filled?item.marks+' marks':'Move to enter a marks scenario')+'">'+
   '<div class="rank-slider-scale"><span>'+support.minimum+'</span><span>Drag or use arrow keys</span><span>'+support.maximum+'</span></div><p id="rankInputHelp" class="rank-context">'+(Number(state.year)===2026?'Reconstructed 2026 curve: supported only from 21 to 89.67 marks.':'Enter marks or move the slider. The estimate updates as you work.')+'</p><div id="rankInputError" data-rank-region="error">'+validationHtml()+'</div>'+
   '<div class="rank-settings">'+select('year','Reference year',SUPPORTED_YEARS.slice().reverse().map(year=>[year,year+(year===2027?' · hypothetical':year===2026?' · reconstructed':'')]),state.year)+select('category','Admission category',CATEGORIES,state.category)+'</div>'+
   (Number(state.year)===2027?select('toughness','Hypothetical paper toughness',[[-2,'Much easier'],[-1,'Easier'],[0,'Historical baseline'],[1,'Harder'],[2,'Very hard'],[3,'Extreme']],state.toughness):'')+
   '<p class="rank-context rank-category-note">'+icon('circle-help')+' Category changes the qualifying-mark reference. AIR remains category-agnostic.</p><button type="button" class="button rank-add-scenario" data-rank-action="add" '+(state.scenarios.length>=3?'disabled':'')+'>'+icon('plus')+' Add comparison scenario</button>'+
   '<p class="rank-context">Up to three marks scenarios share the selected year and category.</p><button class="rank-sr-only" type="submit">Update estimate</button></form>';
 }
 function scenarioTabs(){
  return state.scenarios.map(item=>'<button class="rank-scenario-tab '+(item.id===state.active?'is-active':'')+'" style="--scenario-color:var(--chart-series-'+({A:1,B:2,C:4}[item.id])+')" type="button" data-rank-action="activate" data-rank-id="'+item.id+'" aria-pressed="'+(item.id===state.active)+'"><span class="rank-scenario-dot">'+item.id+'</span> Scenario '+item.id+'</button>').join('');
 }
 function resultHtml(){
  const item=activeEvaluation(),result=item?.result;
  if(!result)return '<div class="rank-empty-result"><span class="rank-eyebrow">02 / Estimated all-India rank</span><div class="rank-empty-orbit" aria-hidden="true">'+icon('chart-no-axes-combined')+'</div><h2>'+(item?.error?'This scenario is outside the supported inputs':'Enter a marks scenario')+'</h2><p>'+(item?.error?'Correct the highlighted input to calculate a supported estimate. No previous result is shown for an invalid scenario.':'Explore the relationship between marks and estimated AIR. Your result and marks sensitivity will appear here immediately.')+'</p><p class="rank-live-message" role="status">'+E(state.message)+'</p><div class="rank-result-disclosure"><span>'+icon('activity')+' Preserved calculation engine</span><span>Uncalibrated estimate</span></div></div>';
  const support=rankInputSupport(state.year),span=support.maximum-support.minimum,low=Math.max(support.minimum,result.marks-.75),high=Math.min(support.maximum,result.marks+.75);
  const at=value=>(value-support.minimum)/span*100;
  return '<div class="rank-result-top"><span class="rank-eyebrow">02 / Estimated all-India rank</span><span class="career-evidence-label">'+E(result.evidenceLabel)+'</span></div>'+
   '<div class="rank-result-main"><div><span class="rank-result-approx">Approximate AIR · scenario '+E(state.active)+'</span><strong class="career-rank-number rank-primary-number">'+number(result.rank)+'</strong></div><div class="rank-entered-context"><span>Your marks</span><strong>'+number(result.marks,2)+'</strong><small>'+result.year+' · '+E(result.categoryLabel)+'</small></div></div>'+
   '<div class="rank-sensitivity-head"><strong>'+number(result.lowRank)+'–'+number(result.highRank)+'</strong><span>±0.75-mark sensitivity</span></div><p class="rank-context">Input sensitivity, not a confidence interval or rank probability.</p>'+
   '<div class="rank-sensitivity-track" aria-hidden="true"><span class="rank-sensitivity-band" style="left:'+at(low)+'%;width:'+Math.max(.5,at(high)-at(low))+'%"></span><span class="rank-sensitivity-pin" style="left:'+at(result.marks)+'%"></span></div><div class="rank-sensitivity-labels"><span>'+number(low,2)+' marks</span><span>Centre '+number(result.marks,2)+'</span><span>'+number(high,2)+' marks</span></div>'+
   '<div class="rank-result-statistics"><div><span>Approximate GATE score</span><strong>'+number(result.score)+' <small>/ 1000</small></strong></div><div><span>'+E(result.categoryLabel)+' qualifying marks</span><strong>'+number(result.categoryCutoff,2)+' <small>/ 100</small></strong></div></div>'+
   '<div class="career-qualification '+(result.qualifies?'is-qualified':'is-below-reference')+'">'+icon(result.qualifies?'circle-check':'circle-alert')+'<span>'+(result.qualifies?'At/above':'Below')+' the supplied historical qualifying-mark reference</span></div>'+
   (result.scenarioDisclosure?'<p class="career-scenario-note">'+E(result.scenarioDisclosure)+'</p>':'')+
   '<div class="rank-result-actions"><button class="button career-primary" type="button" data-career-admission-link data-rank-action="admissions">Explore admissions '+icon('arrow-right')+'</button><button class="button" type="button" data-career-psu-link data-rank-action="psu">PSU references</button>'+
   (bridge.session()?.status==='authenticated'?'<button class="button rank-save-button" type="button" data-career-save-estimate data-rank-action="save" '+(state.saving?'disabled':'')+'>'+icon('bookmark')+(state.saving?'Saving…':'Save estimate')+'</button>':'<a class="text-link rank-save-link" href="#dashboard">Sign in to save '+icon('arrow-up-right')+'</a>')+'</div>'+
   '<p class="rank-live-message" role="status">'+E(state.message)+'</p>';
 }
 function scenarioCards(){
  const items=evaluations(),baseline=items[0]?.result;
  return items.map(item=>{
   const difference=baseline&&item.result?item.result.rank-baseline.rank:null;
   return '<article class="rank-scenario-card '+(item.id===state.active?'is-active':'')+'" style="--scenario-color:var(--chart-series-'+({A:1,B:2,C:4}[item.id])+')"><div class="rank-scenario-card-top"><button type="button" class="rank-scenario-select" data-rank-action="activate" data-rank-id="'+item.id+'" aria-pressed="'+(item.id===state.active)+'"><span class="rank-scenario-dot">'+item.id+'</span> Scenario '+item.id+'</button>'+(item.id!=='A'?'<button class="icon-button" type="button" data-rank-action="remove" data-rank-id="'+item.id+'" aria-label="Remove scenario '+item.id+'">'+icon('x')+'</button>':'<span class="rank-baseline-label">Baseline</span>')+'</div><div class="rank-scenario-values"><div><span>Marks</span><strong>'+E(item.error?'Invalid':item.empty?'—':item.marks)+'</strong></div><div><span>Estimated AIR</span><strong>'+(item.result?number(item.result.rank):'—')+'</strong></div></div><p class="rank-scenario-difference">'+(item.error?E(item.error):!item.result?'Enter marks to compare':item.id==='A'?'Shared year and category':difference===0?'Same estimated AIR as A':number(Math.abs(difference))+(difference<0?' places lower AIR than A':' places higher AIR than A'))+'</p><button class="text-link" type="button" data-rank-action="activate" data-rank-id="'+item.id+'">Edit this scenario '+icon('arrow-up-right')+'</button></article>';
  }).join('')+(items.length<3?'<button class="rank-scenario-add-tile" type="button" data-rank-action="add">'+icon('plus')+'<strong>Add scenario '+RANK_SCENARIO_IDS.find(id=>!items.some(item=>item.id===id))+'</strong><span>Compare another marks input</span></button>':'');
 }
 function plotModel(){return createRankChartModel({...state,width:state.chartWidth});}
 function markerHtml(marker){
  const item=marker.result,selected=marker.id===state.active;
  return '<g class="rank-plot-marker '+(selected?'is-active':'')+'" data-rank-marker="'+marker.id+'" style="--scenario-color:var(--chart-series-'+({A:1,B:2,C:4}[marker.id])+');transform:translate('+marker.x+'px,'+marker.y+'px)" role="button" tabindex="0" data-rank-action="activate" data-rank-id="'+marker.id+'" aria-pressed="'+selected+'" aria-label="'+E('Scenario '+marker.id+': '+item.marks+' marks, approximate AIR '+item.rank+', sensitivity '+item.lowRank+' to '+item.highRank)+'"><title>'+E('Scenario '+marker.id+' · '+item.marks+' marks · approximate AIR '+item.rank+' · '+item.lowRank+'–'+item.highRank+' marks sensitivity')+'</title><line class="rank-marker-sensitivity" x1="0" x2="0" y1="'+(marker.lowY-marker.y)+'" y2="'+(marker.highY-marker.y)+'"/><circle class="rank-marker-halo" r="15"/><circle class="rank-marker-point" r="6"/><text class="rank-marker-letter" x="'+(marker.id==='C'?-17:12)+'" y="'+(marker.id==='B'?19:-12)+'">'+marker.id+'</text></g>';
 }
 function plotHtml(){
  try{
   const model=plotModel(),path=points=>points.map(point=>point.x+','+point.y).join(' ');
   return '<svg class="rank-relationship-svg" role="img" aria-label="Preserved model marks versus estimated AIR, logarithmic rank axis; lower rank is better. Circle markers are user scenarios; the square is a supplied AIR 1 reference." viewBox="0 0 '+model.width+' '+model.height+'"><g class="rank-plot-grid">'+model.yTicks.map(tick=>'<line x1="'+model.left+'" x2="'+model.right+'" y1="'+tick.y+'" y2="'+tick.y+'"/><text x="'+(model.left-10)+'" y="'+(tick.y+4)+'" text-anchor="end">'+number(tick.value)+'</text>').join('')+model.xTicks.map(tick=>'<text x="'+tick.x+'" y="'+(model.bottom+25)+'" text-anchor="middle">'+number(tick.value,tick.value%1?2:0)+'</text>').join('')+'</g>'+
    '<text class="rank-axis-label" x="'+model.left+'" y="14">AIR · log scale · lower is better</text><text class="rank-axis-label" x="'+model.right+'" y="'+(model.height-3)+'" text-anchor="end">Marks / 100</text>'+
    (model.reference.length?'<polyline class="rank-reference-curve" points="'+path(model.reference)+'"/>':'')+'<polyline class="rank-model-curve" points="'+path(model.curve)+'"/>'+
    (model.sourceAnchor?'<g class="rank-source-anchor" tabindex="0" role="img" aria-label="'+E('Supplied '+state.year+' AIR 1 reference: '+model.sourceAnchor.marks+' marks, not independently certified here')+'"><rect x="'+(model.sourceAnchor.x-4)+'" y="'+(model.sourceAnchor.y-4)+'" width="8" height="8"/><title>'+E('Supplied AIR 1 reference · '+model.sourceAnchor.marks+' marks · inherited source claim, not independently certified here')+'</title></g>':'')+
    '<g data-rank-markers>'+model.markers.map(markerHtml).join('')+'</g></svg>';
  }catch(error){return '<div class="rank-plot-unavailable"><strong>Reference curve unavailable</strong><p>'+E(error.message)+'</p></div>';}
 }
 function historyHtml(){
  const item=activeEvaluation();
  if(!item?.result)return '<p class="rank-context">Enter supported marks to compare the same input across the preserved year-specific models. No candidate history is inferred.</p>';
  return '<div class="rank-history-strip">'+historicalComparison(item.result.marks,state.category).slice().reverse().map(row=>'<button type="button" class="rank-history-item '+(String(row.year)===state.year&&(row.year!==2027||Number(state.toughness)===0)?'is-current':'')+'" data-rank-action="year" data-rank-year="'+row.year+'" aria-label="'+E(row.year+(row.year===2027?' hypothetical baseline, toughness zero':'')+(row.estimate?': approximate AIR '+row.estimate.rank:': unavailable, '+row.error))+'"><span>'+row.year+(row.year===2027?' · baseline':'')+'</span><strong>'+(row.estimate?number(row.estimate.rank):'—')+'</strong><small>'+(row.estimate?E(row.estimate.evidenceLabel):'Outside supported marks')+'</small></button>').join('')+'</div><p class="rank-context">Same marks, different historical inputs. Select a year to inspect that model. The 2027 card uses hypothetical baseline toughness (zero); 2026 has a restricted supported marks range.</p>';
 }
 function render(){
  loadParams();
  return '<div class="career-workspace rank-workspace" data-rank-root><div class="rank-workspace-context"><span>'+icon('activity')+' Interactive marks simulator</span><span>EC paper · historical inputs · no validated accuracy claim</span></div><div class="rank-workbench"><section class="rank-input-panel">'+controls()+'</section><section class="rank-result-panel" data-rank-region="result">'+resultHtml()+'</section></div>'+
   '<section class="rank-scenarios-section" aria-labelledby="rankScenariosTitle"><div class="rank-section-heading"><div><span class="rank-eyebrow">Compare / A → C</span><h2 id="rankScenariosTitle">What changes with your marks?</h2></div><p>Actual estimates · shared assumptions · differences versus A</p></div><div class="rank-scenario-grid" data-rank-region="scenarios">'+scenarioCards()+'</div></section>'+
   '<section class="panel rank-relationship-panel"><div class="panel-head"><div><span class="rank-eyebrow">03 / Relationship explorer</span><h2>Marks to estimated AIR</h2><p class="panel-description">Explore the preserved model and compare scenario markers.</p></div><div class="rank-reference-control">'+select('referenceYear','Overlay reference year',[['','No overlay'],...SUPPORTED_YEARS.filter(year=>String(year)!==state.year).slice().reverse().map(year=>[year,year+(year===2027?' · hypothetical':'')])],state.referenceYear)+'</div></div><div class="rank-plot-legend"><span><i class="rank-legend-model"></i>'+E(state.year)+' model</span><span><i class="rank-legend-reference"></i>Optional reference model</span><span><i class="rank-legend-scenario"></i>Scenario + marks sensitivity</span><span><i class="rank-legend-anchor"></i>Supplied AIR 1 reference</span></div><div class="rank-plot-host" data-rank-region="plot">'+plotHtml()+'</div><div class="panel-foot">The line is a calculation, not an observed rank distribution. Circle markers are user scenarios; the square is a supplied historical reference. Hover or focus markers for values.</div></section>'+
   '<section class="rank-history-section"><div class="rank-section-heading"><div><span class="rank-eyebrow">Historical context</span><h2>The same marks across years</h2></div><span class="rank-context">Estimated AIR · source-dependent</span></div><div data-rank-region="history">'+historyHtml()+'</div></section>'+
   '<details class="rank-methodology"><summary>'+icon('circle-help')+' Method, sensitivity and source evidence '+icon('chevron-down')+'</summary><div class="rank-method-grid"><div><h3>What the estimate means</h3><p>2023–2025 interpolate supplied report-derived bins. Earlier years use difficulty-matched anchors. Central AIR is the preserved integer estimate, not an official candidate result.</p>'+source(SOURCE_LINKS.gate2025,'Official 2025 report')+'</div><div><h3>What the range means</h3><p>±0.75 marks is applied by the existing engine to report marks sensitivity. This is not a confidence interval, admission probability or calibrated future forecast. Score /1000 is a model approximation, distinct from marks /100 and AIR.</p></div><div><h3>Coverage and limitations</h3><p>2026 uses a non-official reconstructed curve from 21 to 89.67 marks. 2027 toughness settings are hypothetical. Preserved inputs are not independently certified in this interface.</p>'+source(SOURCE_LINKS.gate,'Official archive')+'<small>Reference dataset: '+E(CAREER_DATA_VERSION)+'</small></div></div></details><p class="rank-sr-only" data-rank-announcement role="status" aria-live="polite" aria-atomic="true"></p></div>';
 }
 function setRegion(name,html){const node=root()?.querySelector?.('[data-rank-region="'+name+'"]');if(node)node.innerHTML=html;}
 function syncInputs(){
  const element=root();if(!element)return;
  const item=active(),support=rankInputSupport(state.year),numeric=Number(item.marks),valid=String(item.marks).trim()!==''&&Number.isFinite(numeric);
  for(const field of ['marks','slider']){
   const node=element.querySelector('[data-rank-field="'+field+'"]');if(!node)continue;
   if(field==='marks'){if(doc()?.activeElement!==node&&node.value!==String(item.marks))node.value=item.marks;node.setAttribute('aria-invalid',String(!!activeEvaluation()?.error));}
   else{node.min=String(support.minimum);node.max=String(support.maximum);const value=valid?Math.min(support.maximum,Math.max(support.minimum,numeric)):support.minimum;if(Number(node.value)!==value)node.value=String(value);node.setAttribute('aria-valuetext',valid?item.marks+' marks':'Move to enter a marks scenario');node.style?.setProperty('--rank-slider-fill',(value-support.minimum)/(support.maximum-support.minimum)*100+'%');}
  }
  const add=element.querySelector('.rank-add-scenario');if(add)add.disabled=state.scenarios.length>=3;
 }
 function updateMarkers(){
  const element=root(),plot=element?.querySelector('[data-rank-markers]');if(!plot){setRegion('plot',plotHtml());return;}
  let model;try{model=plotModel();}catch{setRegion('plot',plotHtml());return;}
  const existing=new Map([...plot.querySelectorAll('[data-rank-marker]')].map(node=>[node.dataset.rankMarker,node]));
  for(const marker of model.markers){
   const node=existing.get(marker.id);if(!node){plot.insertAdjacentHTML('beforeend',markerHtml(marker));continue;}
   node.style.transform='translate('+marker.x+'px,'+marker.y+'px)';node.classList.toggle('is-active',marker.id===state.active);node.setAttribute('aria-pressed',String(marker.id===state.active));
   node.setAttribute('aria-label','Scenario '+marker.id+': '+marker.result.marks+' marks, approximate AIR '+marker.result.rank+', sensitivity '+marker.result.lowRank+' to '+marker.result.highRank);
   const line=node.querySelector('.rank-marker-sensitivity');line?.setAttribute('y1',String(marker.lowY-marker.y));line?.setAttribute('y2',String(marker.highY-marker.y));const title=node.querySelector('title');if(title)title.textContent='Scenario '+marker.id+' · '+marker.result.marks+' marks · approximate AIR '+marker.result.rank+' · '+marker.result.lowRank+'–'+marker.result.highRank+' marks sensitivity';existing.delete(marker.id);
  }
  for(const node of existing.values())node.remove();
 }
 function refresh({fullPlot=false,focusScenario=false}={}){
  const element=root();if(!element){bridge.render();return;}
  syncInputs();setRegion('tabs',scenarioTabs());setRegion('result',resultHtml());setRegion('scenarios',scenarioCards());setRegion('history',historyHtml());
  const current=activeEvaluation();setRegion('error',current?.error?'<div class="rank-input-error" role="alert">'+icon('circle-alert')+'<span>'+E(current.error)+'</span></div>':'');
  if(fullPlot)setRegion('plot',plotHtml());else updateMarkers();
  if(focusScenario)element.querySelector('.rank-active-scenario [data-rank-id="'+state.active+'"]')?.focus?.();
  clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>{const node=root()?.querySelector('[data-rank-announcement]'),result=activeEvaluation()?.result;if(node)node.textContent=(state.message?state.message+' ':'')+(result?'Scenario '+state.active+': '+result.marks+' marks. Approximate AIR '+result.rank+'. Marks sensitivity '+result.lowRank+' to '+result.highRank+'.':'');},220);
 }
 function schedule(){
  if(frame!==null)return;
  const scheduledRoot=root();
  if(doc()&&!scheduledRoot)return;
  if(typeof globalThis.requestAnimationFrame==='function')frame=globalThis.requestAnimationFrame(()=>{frame=null;if(scheduledRoot&&root()!==scheduledRoot)return;refresh();});
  else refresh();
 }
 function afterRender(){
  const element=root();if(!element)return;
  syncInputs();const item=activeEvaluation();setRegion('error',item?.error?'<div class="rank-input-error" role="alert">'+icon('circle-alert')+'<span>'+E(item.error)+'</span></div>':'');
  const plot=element.querySelector('.rank-plot-host'),width=Math.max(280,Math.round(plot?.clientWidth||state.chartWidth));
  if(Math.abs(width-state.chartWidth)>1){state.chartWidth=width;setRegion('plot',plotHtml());}
  if(element!==observedRoot){resizeObserver?.disconnect();observedRoot=element;if(typeof globalThis.ResizeObserver==='function'&&plot){resizeObserver=new ResizeObserver(entries=>{if(root()!==element)return;const next=Math.max(280,Math.round(entries[0].contentRect.width));if(Math.abs(next-state.chartWidth)>1){state.chartWidth=next;setRegion('plot',plotHtml());}});resizeObserver.observe(plot);}}
 }
 function handleInput(event){
  const target=event.target;if(!target?.dataset?.rankField||!['marks','slider'].includes(target.dataset.rankField))return false;
  active().marks=target.value;active().inputError=target.validity?.badInput?'Enter a numeric marks value.':'';state.message='';state.revision++;schedule();return true;
 }
 function handleChange(event){
  const field=event.target?.dataset?.rankField;if(!field)return false;
  if(['marks','slider'].includes(field))return handleInput(event);
  if(!['year','category','toughness','referenceYear'].includes(field))return false;
  state[field]=event.target.value;state.message='';state.revision++;
  if(field==='referenceYear'){refresh({fullPlot:true});return true;}
  if(Number(state.year)!==2027)state.toughness='0';
  if(state.referenceYear===state.year)state.referenceYear='';
  bridge.render();return true;
 }
 function handleSubmit(event){
  if(event.target?.dataset?.careerForm!=='rank'&&!event.target?.matches?.('[data-career-form="rank"]'))return false;
  event.preventDefault?.();refresh();return true;
 }
 async function saveEstimate(){
  const result=activeEvaluation()?.result;if(!result)return true;
  if(bridge.session()?.status!=='authenticated'){bridge.navigate('profile');return true;}
  if(state.saving)return true;
  const identity=bridge.session()?.user?.id,revision=state.revision,generation=++saveGeneration;
  const input={marks:result.marks,year:result.year,category:result.category,toughness:Number(state.year)===2027?Number(state.toughness):0};
  const current=()=>generation===saveGeneration&&state.revision===revision&&bridge.session()?.status==='authenticated'&&bridge.session()?.user?.id===identity;
  state.saving=true;state.message='';refresh();
  try{await bridge.api('/api/estimates',{method:'POST',body:input});if(current())state.message='Estimate saved to your authenticated workspace.';}
  catch(error){if(current())state.message=error.message||'The estimate could not be saved.';}
  finally{if(generation===saveGeneration){state.saving=false;refresh();}}
  return true;
 }
 function handleClick(event){
  const button=event.target?.closest?.('[data-rank-action],[data-career-save-estimate],[data-career-admission-link],[data-career-psu-link]');if(!button)return false;
  const action=button.dataset?.rankAction??(button.hasAttribute?.('data-career-save-estimate')?'save':button.hasAttribute?.('data-career-admission-link')?'admissions':button.hasAttribute?.('data-career-psu-link')?'psu':'');
  if(!['save','admissions','psu','add','activate','remove','reset','year'].includes(action))return false;
  if(action==='save')return saveEstimate();
  if(action==='admissions'||action==='psu'){const handoff=rankHandoff(activeEvaluation()?.result);if(handoff)bridge.navigate(action==='admissions'?'admissions':'psu',handoff[action]);return true;}
  if(action==='reset'){const signature=bridge.params().toString();state={...fresh(),revision:state.revision+1,params:signature};saveGeneration++;bridge.navigate('rank');bridge.render();return true;}
  if(action==='add'){
   if(state.scenarios.length>=3)return true;
   const current=activeEvaluation();if(!current?.result){state.message='Enter a supported marks scenario before adding a comparison.';refresh();const input=root()?.querySelector('#rankMarks');input?.focus?.();return true;}
   const id=RANK_SCENARIO_IDS.find(key=>!state.scenarios.some(item=>item.id===key));state.scenarios.push({id,marks:active().marks});state.active=id;
  }
  if(action==='activate'){const id=button.dataset?.rankId;if(!state.scenarios.some(item=>item.id===id))return false;state.active=id;}
  if(action==='remove'){const id=button.dataset?.rankId;if(id==='A'||!state.scenarios.some(item=>item.id===id))return false;state.scenarios=state.scenarios.filter(item=>item.id!==id);if(state.active===id)state.active='A';}
  if(action==='year'){const year=String(button.dataset?.rankYear);if(!SUPPORTED_YEARS.includes(Number(year)))return false;state.year=year;state.toughness='0';state.revision++;bridge.render();return true;}
  state.revision++;state.message='';refresh({focusScenario:action!=='activate'||!button.hasAttribute?.('data-rank-marker')});return true;
 }
 function handleKeyDown(event){
  if(!['Enter',' '].includes(event.key))return false;
  const target=event.target?.closest?.('.rank-plot-marker');if(!target)return false;
  event.preventDefault?.();return handleClick({...event,target});
 }
 function resetUser(){saveGeneration++;state.revision++;state.saving=false;state.message='';}
 return {render,handleInput,handleChange,handleClick,handleSubmit,handleKeyDown,afterRender,resetUser};
}
