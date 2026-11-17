import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createCareerFeature} from '../src/features/career.mjs';
import {predictRank,PROGRAMME_RECORDS} from '../src/domains/career/index.mjs';

// Deliberate event/renderer simulation. These checks do not measure browser layout.
const context=vm.createContext({window:{UI_ICONS:{}}});
vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
function workspace(query=''){
 let parameters=new URLSearchParams(query),navigation=null,renders=0;
 const feature=createCareerFeature({C:context.window.TerminalComponents,icon:()=>'',params:()=>parameters,
  navigate(route,values={}){navigation={route,values};parameters=new URLSearchParams(values);},
  render(){renders++;},session:()=>({status:'unavailable'}),api(){throw Error('Public workflow must not call an account API.');}});
 return {feature,get navigation(){return navigation;},get renders(){return renders;},setParams(value){parameters=new URLSearchParams(value);}};
}
function click(attributes){
 const attrs=new Map(Object.entries(attributes)),dataset=Object.fromEntries([...attrs].filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));
 const element={dataset,hasAttribute:key=>attrs.has(key),getAttribute:key=>attrs.get(key),
  closest(selector){return selector.split(',').some(part=>{const match=part.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return match&&attrs.has(match[1])&&(match[2]===undefined||attrs.get(match[1])===match[2]);})?element:null;}};
 return {target:element,preventDefault(){},stopPropagation(){}};
}

test('rank to admissions to exact institute evidence preserves compatible inputs and source identity',()=>{
 const app=workspace('marks=55&year=2025&category=GEN');
 const result=predictRank({marks:55,year:2025,category:'GEN'});
 assert.match(app.feature.renderers.rank(),/>550<\/strong>/);
 assert.equal(app.feature.handleClick(click({'data-career-admission-link':''})),true);
 assert.deepEqual(app.navigation,{route:'opportunities',values:{rank:result.rank,score:result.score,category:'GEN',year:2025,scoreBasis:'model_approximation',metric:'gate_score'}});
 const admission=app.feature.renderers.admissions();
 assert.match(admission,/forwarded score is a donor-model approximation/);
 const record=PROGRAMME_RECORDS.find(row=>row.institute==='iisc'&&row.year===2025&&row.category==='GEN'&&row.cutoff!==null);
 assert.equal(app.feature.handleClick(click({'data-admissions-action':'compare','data-admissions-section':'admissions','data-record':record.id})),true);
 assert.equal(app.feature.handleClick(click({'data-admissions-action':'detail','data-admissions-section':'admissions','data-record':record.id})),true);
 assert.equal(app.navigation.route,'institutes');
 assert.equal(app.navigation.values.score,String(result.score));
 assert.equal(app.navigation.values.scoreBasis,'model_approximation');
 assert.equal(app.navigation.values.record,record.id);
 assert.deepEqual(JSON.parse(app.navigation.values.compared),[record.id]);
 assert.ok(!('marks' in app.navigation.values));assert.ok(!('rank' in app.navigation.values),'Only the active score metric is forwarded.');
 const detail=app.feature.renderers.institutes();
 assert.ok(detail.includes(record.id));assert.ok(detail.includes(record.sourceFilename));
 assert.ok(detail.includes(record.sourceUrl));assert.match(detail,/Historical cutoff evidence/);
 assert.ok(!detail.includes('NaN'));
});

test('rank to PSU forwards model score without confusing exam year with recruitment year',()=>{
 const app=workspace('marks=55&year=2025&category=SC');app.feature.renderers.rank();
 assert.equal(app.feature.handleClick(click({'data-career-psu-link':''})),true);
 assert.deepEqual(app.navigation,{route:'psu-evidence',values:{score:702,category:'SC',scoreBasis:'model_approximation'}});
 const html=app.feature.renderers.psu();
 assert.match(html,/name="value"[^>]*value="702"/);assert.match(html,/forwarded GATE score is a model approximation/);
 assert.match(html,/value="all" selected>All years/);assert.match(html,/Different metric; comparison not made/);
 assert.ok(!html.includes('NaN'));
});

test('switching the PSU candidate unit clears the number and its model-score provenance',()=>{
 const app=workspace('score=702&category=GEN&scoreBasis=model_approximation');app.feature.renderers.psu();
 const form={dataset:{careerForm:'psu'}};
 const changed=app.feature.handleChange({target:{name:'candidateMetric',value:'air',dataset:{},closest:selector=>selector==='[data-career-form="psu"]'?form:null}});
 assert.equal(changed,true);
 const html=app.feature.renderers.psu();
 assert.match(html,/name="value"[^>]*value=""/);assert.match(html,/value="air" selected>AIR/);
 assert.ok(!html.includes('forwarded GATE score is a model approximation'));
 assert.match(html,/No candidate value entered/);
});

test('partial PSU links and unsupported candidate units cannot reuse a previous comparison',()=>{
 const app=workspace('score=702&category=GEN&scoreBasis=model_approximation');app.feature.renderers.psu();
 app.setParams('year=2019&category=SC');let html=app.feature.renderers.psu();
 assert.match(html,/name="value"[^>]*value=""/);assert.ok(!html.includes('forwarded GATE score is a model approximation'));
 app.setParams('candidateMetric=percentile&value=99');html=app.feature.renderers.psu();
 assert.match(html,/Choose a supported candidate metric/);assert.ok(!html.includes('Meets historical reference'));
 app.setParams('rank=316&year=2019&category=GEN&metric=air');html=app.feature.renderers.psu();
 assert.match(html,/name="value"[^>]*value="316"/);assert.match(html,/value="air" selected>AIR/);
 assert.match(html,/Meets historical reference/);
});

test('admissions keeps AIR unavailable at programme level and rejects marks used as scores',()=>{
 const app=workspace('rank=550&year=2025&category=GEN');
 let html=app.feature.renderers.admissions();
 assert.match(html,/Programme AIR cutoffs are unavailable/);assert.match(html,/Programme AIR comparison unavailable/);
 assert.ok(!html.includes('admissions-candidate-marker'));
 app.setParams('metric=marks&score=55&year=2025&category=GEN');html=app.feature.renderers.admissions();
 assert.match(html,/Raw marks cannot be used as an admission score/);assert.ok(!html.includes('NaN'));
});

test('source-only renderers expose the redesigned controls and safe invalid-input states',()=>{
 const app=workspace('marks=%3Cimg%20src=x%3E&year=2025&category=GEN');
 const invalid=app.feature.renderers.rank();assert.ok(!invalid.includes('<img'));assert.match(invalid,/role="alert"/);
 app.setParams('marks=55&year=2025&category=GEN&scenarioB=45&scenarioC=65');
 const rank=app.feature.renderers.rank();assert.match(rank,/rankMarksSlider/);assert.match(rank,/Scenario A/);assert.match(rank,/Scenario B/);assert.match(rank,/Scenario C/);
 assert.match(rank,/±0.75-mark sensitivity/);assert.match(rank,/not a confidence interval/);
 for(const route of ['admissions','institutes','psu']){app.setParams('');const html=app.feature.renderers[route]();assert.ok(html.length>500);assert.ok(!html.includes('NaN'));assert.ok(!html.includes('undefined'));}
});
