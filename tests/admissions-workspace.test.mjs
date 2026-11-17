import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {PROGRAMME_RECORDS,filterProgrammes} from '../src/domains/career/index.mjs';
import {createAdmissionsFeature,admissionsCandidate,admissionsRows,compareAdmissionRecord,admissionNavigationValues} from '../src/features/admissions.mjs';

const defaults={metric:'gate_score',score:'',rank:'',scoreBasis:'entered',year:'all',category:'GEN',institute:'all',programme:'all',query:'',ecOnly:false,availableOnly:false};
function fixture(query=''){
 const context=vm.createContext({window:{UI_ICONS:{}}});vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
 let params=new URLSearchParams(query),route='admissions',renders=0,navigation=null;
 const feature=createAdmissionsFeature({C:context.window.TerminalComponents,icon:()=>'',params:()=>params,currentRoute:()=>route,render(){renders++;},navigate(id,values){navigation={id,values};}});
 return {feature,params:next=>{params=new URLSearchParams(next);},route:next=>{route=next;},renders:()=>renders,navigation:()=>navigation};
}
const field=(name,value,section='admissions',extra={})=>({target:{dataset:{admissionsField:name,admissionsSection:section},value,type:'number',validity:{badInput:false},...extra}});
const click=(action,record,section='admissions',extra={})=>({target:{closest:()=>({dataset:{admissionsAction:action,admissionsSection:section,record,...extra}})}});

test('candidate controls validate units without reinterpreting AIR or marks as GATE score',()=>{
 assert.deepEqual(admissionsCandidate({...defaults,score:'0'}),{value:0,error:''});
 assert.equal(admissionsCandidate({...defaults,score:'702.5'}).value,702.5);
 assert.equal(admissionsCandidate({...defaults,metric:'air',rank:'550'}).value,550);
 assert.match(admissionsCandidate({...defaults,metric:'air',rank:'550.5'}).error,/integer/);
 assert.match(admissionsCandidate({...defaults,metric:'marks',score:'55'}).error,/Raw marks/);
 for(const score of ['1001','-1','0x10','Infinity',' '])assert(admissionsCandidate({...defaults,score}).error);
 assert.equal(admissionsCandidate(defaults).value,null);
});

test('score overview distinguishes comparable records from missing and incompatible source rows',()=>{
 const app=fixture('score=702&year=2025&category=GEN');
 const html=app.feature.renderers.admissions();
 assert.match(html,/9 of 22 comparable records are at or below your score/);
 assert.match(html,/<strong>26<\/strong>source rows/);
 assert.match(html,/<strong>23<\/strong>numeric references/);
 assert.match(html,/<strong>13<\/strong>above your score/);
 assert.equal(app.feature.getSnapshot().display,'table');
 assert(html.indexOf('class="admissions-results"')<html.indexOf('class="admissions-chart-drawer"'));
 app.params('score=1000&year=2025&category=all');
 const browseOnly=app.feature.renderers.admissions();
 assert(!browseOnly.includes('comparable records are at or below your score'));
 assert.match(browseOnly,/Choose a candidate category to compare/);
});

test('institute shortcuts retain candidate context and cross-filter selected evidence without inventing institutes',()=>{
 const app=fixture('score=702&year=2025&category=GEN');app.route('institutes');
 app.feature.renderers.institutes();
 const record=PROGRAMME_RECORDS.find(row=>row.institute==='iisc'&&row.year===2025&&row.category==='GEN');
 app.feature.handleClick(click('compare',record.id,'institutes'));
 app.feature.handleClick(click('institute',null,'institutes',{institute:'iitm'}));
 const state=app.feature.getSnapshot('institutes');
 assert.equal(state.filters.institute,'iitm');assert.equal(state.filters.score,'702');assert.equal(state.filters.year,'2025');assert.equal(state.filters.category,'GEN');
 assert.deepEqual(state.selected,[record.id]);
 const html=app.feature.renderers.institutes();assert.match(html,/data-institute="iitm" aria-pressed="true"/);
 assert.match(html,/IISc Bengaluru/);assert.match(html,/Selected evidence/);
 assert.equal(app.feature.handleClick(click('institute',null,'institutes',{institute:'invented-institute'})),false);
 assert.equal(app.feature.getSnapshot('institutes').filters.institute,'iitm');
});

test('historical score comparisons use actual source ranges and suppress unsupported metrics, categories and paper context',()=>{
 const row=filterProgrammes({institute:'iisc',year:2022,category:'GEN',query:'Electronics and Communication'})[0];
 assert.deepEqual(row.range,[650,916]);
 assert.equal(compareAdmissionRecord(row,{...defaults,score:'702'}).difference,52);
 assert.equal(compareAdmissionRecord(row,{...defaults,score:'650'}).difference,0);
 assert.equal(compareAdmissionRecord(row,{...defaults,score:'649'}).tone,'below');
 assert.equal(compareAdmissionRecord(row,{...defaults,metric:'air',rank:'550'}).difference,null);
 assert.equal(compareAdmissionRecord(row,{...defaults,score:'900',category:'SC'}).difference,null);
 assert.equal(compareAdmissionRecord(row,{...defaults,score:'900',category:'all'}).difference,null);
 const ee=filterProgrammes({institute:'iitm',year:2026,category:'GEN',query:'EE2Y'})[0];
 assert.equal(compareAdmissionRecord(ee,{...defaults,score:'900'}).difference,null);
 const missing=filterProgrammes({institute:'iisc',year:2022,category:'ST',query:'Signal Processing'})[0];
 assert.equal(compareAdmissionRecord(missing,{...defaults,score:'900',category:'ST'}).status,'Cutoff not supplied');
});

test('filtering keeps exact programme and qualifying-discipline record identities without inventing absent years or institutes',()=>{
 const initial=admissionsRows(defaults);assert.equal(initial.rows.length,120);assert.equal(initial.rows.filter(row=>row.cutoff!==null).length,103);
 assert(admissionsRows({...defaults,institute:'nit'}).rows.length===0);
 assert(admissionsRows({...defaults,year:'2019'}).rows.length===0);
 assert(admissionsRows({...defaults,year:'not-a-year'}).error);
 assert(admissionsRows({...defaults,category:'BAD'}).error);
 const rows=admissionsRows({...defaults,institute:'iitm',year:'2026',query:'ED1Y'}).rows;
 assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);
 const programme=rows[0].programme;
 assert(admissionsRows({...defaults,programme}).rows.every(row=>row.programme===programme));
});

test('programme comparison selection caps at three actual records and preserves exact context on detail navigation',()=>{
 const app=fixture('score=702&year=2025&category=GEN&scoreBasis=model_approximation');
 app.feature.renderers.admissions();
 const rows=filterProgrammes({year:2025,category:'GEN'}).slice(0,4);
 for(const row of rows)app.feature.handleClick(click('compare',row.id));
 assert.deepEqual(app.feature.getSnapshot().selected,rows.slice(0,3).map(row=>row.id));
 assert.match(app.feature.renderers.admissions(),/Compare up to three records/);
 app.feature.handleClick(click('detail',rows[1].id));
 const nav=app.navigation();assert.equal(nav.id,'institutes');assert.equal(nav.values.record,rows[1].id);
 assert.equal(nav.values.score,'702');assert.equal(nav.values.scoreBasis,'model_approximation');assert.equal(nav.values.category,'GEN');
 assert.deepEqual(JSON.parse(nav.values.compared),rows.slice(0,3).map(row=>row.id));
 assert(!Object.hasOwn(nav.values,'rank'));
 app.feature.handleClick(click('compare',rows[0].id));assert.equal(app.feature.getSnapshot().selected.length,2);
 app.feature.handleClick(click('clear'));assert.deepEqual(app.feature.getSnapshot().selected,[]);
});

test('linked partial filters reset stale scope, guard invalid metrics and retain safe exact source details',()=>{
 const app=fixture('score=900&year=2026&category=GEN&institute=iitm&query=EE2Y');app.feature.renderers.admissions();
 app.params('score=702&rank=550&year=2025&category=GEN&scoreBasis=model_approximation');
 const html=app.feature.renderers.admissions();
 assert.match(html,/value="all" selected>All institutes/);assert.match(html,/name="query"[^>]*value=""/);
 assert.match(html,/forwarded score is a donor-model approximation/);
 assert.equal(app.feature.getSnapshot().filters.metric,'gate_score');
 app.params('metric=marks&score=55');const invalid=app.feature.renderers.admissions();
 assert.match(invalid,/Choose a supported comparison unit/);assert(!invalid.includes('data-admissions-candidate class='));
 app.params('metric=air&rank=550');const air=app.feature.renderers.admissions();assert.match(air,/Programme AIR cutoffs are unavailable/);assert(!air.includes('data-admissions-chart role="img"'));
 const row=filterProgrammes({institute:'iisc',year:2022,category:'GEN',query:'Electronics and Communication'})[0];
 app.params(new URLSearchParams({record:row.id,score:'702',year:'2022',category:'GEN'}));
 const detail=app.feature.renderers.institutes();assert(detail.includes(row.sourceFilename));assert(detail.includes(row.sourceUrl+'#page=2'));assert.match(detail,/not independently certified/);
 app.params('record=%3Cimg%20src=x%3E&query=%3Csvg%20onload=alert(1)%3E');const escaped=app.feature.renderers.institutes();assert(!escaped.includes('<img'));assert(!escaped.includes('<svg onload'));
});

test('metric switching clears incompatible candidate values and navigation forwards only the active unit',()=>{
 const app=fixture('score=702&rank=550&scoreBasis=model_approximation');app.feature.renderers.admissions();
 app.feature.handleChange(field('metric','air'));
 assert.equal(app.feature.getSnapshot().filters.score,'');assert.equal(app.feature.getSnapshot().filters.rank,'');
 app.feature.handleInput(field('rank','550'));
 const values=admissionNavigationValues(app.feature.getSnapshot().filters);
 assert.equal(values.rank,'550');assert(!Object.hasOwn(values,'score'));assert(!Object.hasOwn(values,'scoreBasis'));
 app.feature.handleClick(click('reset'));assert.deepEqual(app.feature.getSnapshot().filters,defaults);
});

test('live score editing retains the focused input and SVG marker while updating real cutoff comparisons',()=>{
 const app=fixture('score=702&year=2022&category=GEN&scoreBasis=model_approximation');app.feature.renderers.admissions();
 const row=filterProgrammes({institute:'iisc',year:2022,category:'GEN',query:'Electronics and Communication'})[0];
 const marker={style:{},attributes:{},setAttribute(name,value){this.attributes[name]=value;},querySelector(){return label;}},label={textContent:''},display={textContent:''},summary={textContent:''},error={innerHTML:''},copy={dataset:{admissionsComparison:row.id},innerHTML:''},basis={textContent:''};
 let removed=false;const note={remove(){removed=true;}},controlLabel={textContent:'Approximate model score / 1000'},attrs={};
 const input={dataset:{admissionsField:'score',admissionsSection:'admissions'},value:'800',type:'number',validity:{badInput:false},setAttribute(name,value){attrs[name]=value;},closest(){return {querySelector:()=>controlLabel};}};
 const root={set innerHTML(_value){throw Error('Numeric edit replaced the whole output');},querySelector(selector){return {'[data-admissions-candidate]':marker,'[data-admissions-score-display]':display,'.admissions-score-summary small':basis,'.admissions-model-note':note}[selector]??null;},querySelectorAll(){return [copy];}};
 const original=globalThis.document;
 globalThis.document={activeElement:input,getElementById(id){return id.startsWith('admissions-output-')?root:id.startsWith('admissions-validation-')?error:summary;},querySelector(){return input;}};
 try{
  assert.equal(app.feature.handleInput({target:input}),true);
  assert.equal(globalThis.document.activeElement,input);assert.equal(app.renders(),0);
  assert.equal(marker.style.transform,'translateX(647.2px)');assert.equal(label.textContent,'Your 800');assert.equal(display.textContent,'800');
  assert.match(copy.innerHTML,/\+150 score points/);assert.equal(attrs['aria-invalid'],'false');assert.equal(controlLabel.textContent,'Candidate GATE score / 1000');assert(removed);
  input.value='1001';app.feature.handleInput({target:input});assert.equal(marker.attributes.visibility,'hidden');assert.equal(attrs['aria-invalid'],'true');assert.match(error.innerHTML,/from 0 to 1000/);assert(!copy.innerHTML.includes('score points'));
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test('search debounce does not render an old admission route after navigation',async()=>{
 const app=fixture();app.feature.renderers.admissions();
 assert.equal(app.feature.handleInput(field('query','Signal','admissions',{type:'search'})),true);app.route('rank');
 await new Promise(resolve=>setTimeout(resolve,130));assert.equal(app.renders(),0);
});

test('source rows and keyboard chart markers remain semantically explicit',()=>{
 const app=fixture('score=702&year=2025&category=GEN');const html=app.feature.renderers.admissions();
 assert.match(html,/role="button" tabindex="0"/);assert.match(html,/Supplied cutoff \/ operated range/);assert.match(html,/Your GATE score/);assert.match(html,/No admission probabilities/);
 assert(!html.includes('undefined'));assert(!html.includes('NaN'));
 const row=PROGRAMME_RECORDS.find(record=>record.cutoff!==null);
 let prevented=false;
 const target={tagName:'g',dataset:{admissionsAction:'detail',admissionsSection:'admissions',record:row.id}};target.closest=()=>target;
 assert.equal(app.feature.handleKeyDown({key:'Enter',target,preventDefault(){prevented=true;}}),true);assert(prevented);assert.equal(app.navigation().values.record,row.id);
});
