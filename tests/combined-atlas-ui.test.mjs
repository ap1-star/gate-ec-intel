import test from 'node:test';
import assert from 'node:assert/strict';
import {createAtlasFeature,atlasEligibility,atlasScoreComparison,filterAtlasRows,atlasCsv,gateQualifyingMark} from '../src/features/atlas.mjs';

const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const opportunity=(id,extra={})=>({id,instituteId:'nit-a',institute:'NIT A',programme:'Electronics & Communication',branch:'ECE',paper:'EC',category:'GEN',year:2026,round:'SR2',closingScore:650,openingScore:750,metric:'gate_score',unit:'GATE score / 1000',sourceDataset:'seatmap',sourceId:'official',sourceUrl:'https://example.test/official.pdf',rounds:[{round:'R1',opening:800,closing:700},{round:'SR2',opening:750,closing:650}],eligibility:{ruleYear:2026,ruleGroups:[{degreeCodes:['T135'],papers:['EC']}]},...extra});
const data=()=>({version:'fixture',importedAt:'2026-11-16',opportunities:[opportunity('o1'),opportunity('o2',{closingScore:770}),opportunity('o3',{closingScore:null}),opportunity('o4',{category:'SC'})],placements:[{id:'p1',institute:'NIT A',programme:'ECE',year:2025,metric:'median_salary',value:12.5,unit:'LPA',sourceUrl:'https://example.test/placements.pdf'}],companies:[{id:'c1',name:'Example Semiconductor',institute:'NIT A',programme:'VLSI',year:2025,offers:3,ctcLpa:20,metric:'CTC offered',unit:'LPA',sourceUrl:'https://example.test/companies.pdf'}],sources:[{id:'official',title:'Original CCMT record',kind:'official_cutoff',url:'https://example.test/official.pdf'}],gateReports:[{id:'g1',year:2026,paper:'EC',appeared:1000,qualified:120,qualifyingMarks:25,category:'GEN',sourceUrl:'https://example.test/gate.pdf'}],psuRecords:[],bitsOffers:[],degrees:[{code:'T135',label:'B.Tech ECE'}],paperOptions:[{code:'EC',label:'EC · Electronics and Communication'}]});
function fixture({payload=data(),query='',load=null}={}){
 let route='opportunities',renders=0,downloads=[],calls=0,params=new URLSearchParams(query);
 const feature=createAtlasFeature({C:{escape,LoadingSkeleton:({label})=>'<p role="status">'+escape(label)+'</p>'},icon:()=>'',params:()=>params,currentRoute:()=>route,render:()=>{renders++;},download:value=>downloads.push(value)},{loader:async requested=>{calls++;return load?load(requested,calls):structuredClone(payload);}});
 return {feature,route:value=>{route=value;},params:value=>{params=new URLSearchParams(value);},renders:()=>renders,downloads,calls:()=>calls};
}
const click=(action,extra={})=>({target:{closest:()=>({dataset:{atlasAction:action,...extra}})},preventDefault(){}});

test('GATE score comparison never treats ranks, marks, missing references or mixed categories as programme scores',()=>{
 const row=opportunity('a'),filters={score:'750',category:'GEN'};
 assert.deepEqual(atlasScoreComparison(row,filters),{state:'above',gap:100,label:'At / above historical reference'});
 assert.equal(atlasScoreComparison({...row,closingScore:770},filters).state,'near');
 assert.equal(atlasScoreComparison({...row,closingScore:781},filters).state,'below');
 assert.equal(atlasScoreComparison({...row,closingScore:0},{...filters,score:'0'}).gap,0);
 for(const metric of ['air','rank','composite_score','ceed_score','cat_percentile','gate_marks_normalized'])assert.equal(atlasScoreComparison({...row,metric},filters).gap,null);
 assert.equal(atlasScoreComparison({...row,metric:undefined},filters).gap,null);
 assert.equal(atlasScoreComparison({...row,paper:'CS'},{...filters,paper:'EC'}).gap,null);
 assert.equal(atlasScoreComparison({...row,closingScore:null},filters).gap,null);
 assert.equal(atlasScoreComparison(row,{...filters,category:'all'}).gap,null);
 assert.equal(atlasScoreComparison(row,{...filters,category:'SC'}).gap,null);
 for(const score of ['-1','1001','0x10','Infinity',' '])assert.equal(atlasScoreComparison(row,{...filters,score}).state,'invalid');
});

test('degree and GATE paper must occur together in one exact rule group',()=>{
 const row=opportunity('rules',{eligibility:{ruleYear:2026,ruleGroups:[{degreeCodes:['T135'],papers:['EC']},{degreeCodes:['T999'],papers:['CS']}]}});
 assert.equal(atlasEligibility(row,{degree:'T135',paper:'EC'}).state,'exact');
 assert.equal(atlasEligibility(row,{degree:'T135',paper:'CS'}).state,'not_listed');
 assert.equal(atlasEligibility(row,{degree:'',paper:'EC'}).state,'unknown');
 assert.equal(atlasEligibility({...row,eligibility:{degreeCodes:[],papers:['EC']}},{degree:'T135',paper:'EC'}).state,'unknown');
 assert.equal(atlasEligibility({...row,eligibility:{ruleGroups:[{nearDegreeCodes:['T135'],papers:['EC']}] }},{degree:'T135',paper:'EC'}).state,'review');
 assert.equal(atlasEligibility({...row,eligibility:{ruleGroups:[{allowAnyDegree:true,papers:['EC']}] }},{degree:'T135',paper:'EC'}).state,'exact');
});

test('2026 eligibility mapping cannot certify a 2025 historical admission row',()=>{
 const result=atlasEligibility(opportunity('old',{year:2025}),{degree:'T135',paper:'EC'});
 assert.equal(result.state,'unknown');assert.match(result.label,/2026 mapping/);assert.match(result.reason,/does not verify eligibility/);
});

test('source filters preserve category scope and distinguish score clearance from exact eligibility',()=>{
 const rows=data().opportunities,filters={score:'750',category:'GEN',year:'2026',branch:'ECE',paper:'EC',degree:'T135',result:'above'};
 assert.deepEqual(filterAtlasRows(rows,filters).map(row=>row.id),['o1']);
 assert.deepEqual(filterAtlasRows(rows,{...filters,result:'near'}).map(row=>row.id),['o2']);
 assert.deepEqual(filterAtlasRows(rows,{...filters,result:'missing'}).map(row=>row.id),['o3']);
 assert.equal(filterAtlasRows(rows,{...filters,result:'exact'}).length,3);
 assert.equal(filterAtlasRows(rows,{...filters,query:'not-present',result:'all'}).length,0);
 assert.equal(filterAtlasRows([{year:2026,paper:'CS'},{year:2026,paper:'EC'}],{year:'all',paper:'EC'},'gateReports').length,1);
});

test('CSV preserves quoted multiline source text and nulls while escaping spreadsheet formulas',()=>{
 const csv=atlasCsv([{name:'=HYPERLINK("x")',notes:'line1\nline2, "quoted"',value:null},{name:'Ordinary',notes:'@formula',value:-7}],['name','notes','value'].map(key=>({key,label:key})));
 assert(csv.startsWith('\ufeff'));assert.match(csv,/'=HYPERLINK\(""x""\)/);assert(csv.includes('line1\nline2, ""quoted""'));assert(csv.includes('"-7"'));assert(csv.includes("'@formula"));assert(!csv.includes('"null"'));
});

test('imported datasets load lazily and retain source evidence, degree controls and round drilldown',async()=>{
 const app=fixture({query:'score=750&category=GEN&year=2026&degree=T135&paper=EC'});
 assert.match(app.feature.renderers.opportunities(),/Loading imported/);assert.equal(app.calls(),0);
 await app.feature.load('opportunities');const html=app.feature.renderers.opportunities();assert.equal(app.calls(),1);
 assert.match(html,/1 of 2 comparable reference rows are at or below your score/);assert.match(html,/Exact degree \+ paper listed/);assert.match(html,/B.Tech ECE/);
 await app.feature.handleClick(click('detail',{atlasId:'o1'}));const detailed=app.feature.renderers.opportunities();assert.match(detailed,/Round history supplied/);assert.match(detailed,/Original CCMT record/);assert.match(detailed,/Opening score/);
 await app.feature.load('placements');assert.equal(app.calls(),1,'complete payload is shared across public routes');app.route('placements');app.params('score=750&category=GEN&year=2025');const placements=app.feature.renderers.placements();assert.match(placements,/median_salary/);assert.match(placements,/12.5/);assert.match(placements,/LPA/);
});

test('partial per-route payloads load on demand and successful empty responses do not fabricate rows',async()=>{
 const app=fixture({load:async route=>route==='placements'?{placements:[],sources:[]}:{opportunities:[opportunity('only')],sources:[]}});
 await app.feature.load('opportunities');assert.equal(app.calls(),1);await app.feature.load('placements');assert.equal(app.calls(),2);
 assert.match(app.feature.renderers.placements(),/No records match this context/);assert(!app.feature.renderers.placements().includes('Example Semiconductor'));
});

test('failed and malformed dataset loads show a retry state without marking missing data ready',async()=>{
 const app=fixture({load:async(route,calls)=>calls===1?{}:{opportunities:[opportunity('loaded')],sources:[]}});
 await app.feature.load('opportunities');assert.match(app.feature.renderers.opportunities(),/snapshot has no opportunities dataset/);assert(!app.feature.getSnapshot().loaded.includes('opportunities'));
 await app.feature.handleClick(click('retry',{atlasRoute:'opportunities'}));assert.match(app.feature.renderers.opportunities(),/Electronics &amp; Communication/);assert.equal(app.calls(),2);
});

test('programme comparison is bounded at four records and filters do not silently clear pinned evidence',async()=>{
 const payload=data();payload.opportunities=Array.from({length:6},(_,i)=>opportunity('r'+i,{programme:'Programme '+i}));const app=fixture({payload});await app.feature.load('opportunities');
 for(let i=0;i<5;i++)app.feature.handleChange({target:{dataset:{atlasCompare:'r'+i},checked:true}});
 assert.equal(app.feature.getSnapshot().selected.length,4);assert.match(app.feature.getSnapshot().notice,/up to four/);
 app.feature.handleChange({target:{dataset:{atlasField:'query'},value:'Programme 5'}});assert.equal(app.feature.getSnapshot().selected.length,4);assert.match(app.feature.renderers.opportunities(),/Pinned evidence \/ 4 of 4/);
});

test('pagination limits DOM rows and filtered CSV includes every matching source record',async()=>{
 const payload=data();payload.opportunities=Array.from({length:31},(_,i)=>opportunity('r'+i,{programme:'Programme '+i}));const app=fixture({payload});await app.feature.load('opportunities');
 assert.equal((app.feature.renderers.opportunities().match(/data-atlas-compare=/g)||[]).length,25);
 await app.feature.handleClick(click('next'));assert.equal((app.feature.renderers.opportunities().match(/data-atlas-compare=/g)||[]).length,6);
 await app.feature.handleClick(click('export'));assert.equal(app.downloads.length,1);assert.equal(app.downloads[0].text.split('\r\n').length,32);
 app.feature.handleChange({target:{dataset:{atlasField:'query'},value:'Programme 30'}});await app.feature.handleClick(click('export'));assert.equal(app.downloads[1].text.split('\r\n').length,2);
});

test('source links reject javascript URLs and imported text is HTML escaped',async()=>{
 const payload=data();payload.opportunities=[opportunity('unsafe',{programme:'<img src=x onerror=alert(1)>',sourceId:'unknown',sourceUrl:'javascript:alert(1)'})];const app=fixture({payload});await app.feature.load('opportunities');
 const html=app.feature.renderers.opportunities();assert(!html.includes('href="javascript:'));assert(!html.includes('<img src=x'));assert.match(html,/&lt;img/);assert.match(html,/Source URL not supplied/);
});

test('public task tabs preserve candidate context without transferring unrelated private parameters',async()=>{
 const app=fixture({query:'score=750&category=GEN&year=2026&degree=T135&paper=EC&token=private'});await app.feature.load('opportunities');const html=app.feature.renderers.opportunities();
 assert.match(html,/#placements\?score=750&amp;category=GEN&amp;paper=EC&amp;degree=T135/);assert.match(html,/#gate-reports\?score=750&amp;category=GEN&amp;year=2026/);assert(!html.includes('token=private'));assert.equal(Object.keys(app.feature.renderers).length,7);
});

test('placement summaries never combine different units or institutional scopes into a salary range',async()=>{
 const payload=data();payload.placements.push({...payload.placements[0],id:'p2',value:900000,unit:'INR / year'});const app=fixture({payload});await app.feature.load('placements');app.route('placements');
 const mixed=app.feature.renderers.placements();assert.match(mixed,/Separate metrics/);assert(!mixed.includes('12.5–900,000'));
 app.feature.handleChange({target:{dataset:{atlasField:'unit'},value:'LPA'}});const scoped=app.feature.renderers.placements();assert.match(scoped,/12.5–12.5/);assert(!scoped.includes('<strong>900,000</strong>'));
});

test('official GATE report details expose supplied distributions and rank bands with original field names',async()=>{
 const payload=data();payload.gateReports[0].distributions=[{score_from:500,score_to:600,count:37}];payload.gateReports[0].rankBands=[{rank_from:1,rank_to:100,score_min:800}];const app=fixture({payload});await app.feature.load('gate-reports');app.route('gate-reports');
 await app.feature.handleClick(click('detail',{atlasId:'g1'}));const html=app.feature.renderers['gate-reports']();assert.match(html,/Reported distribution/);assert.match(html,/Reported rank bands/);assert.match(html,/score from/);assert.match(html,/rank from/);assert.match(html,/>37</);
});

test('actual Score Line qualifying objects display the selected printed category group',async()=>{
 const report={qualifyingMarks:{GEN:25,OBC_NCL_EWS:22.5,SC_ST_PWD:16.6}};
 assert.deepEqual(gateQualifyingMark(report,'GEN'),{value:25,label:'GEN'});
 assert.equal(gateQualifyingMark(report,'GEN_EWS').value,22.5);assert.match(gateQualifyingMark(report,'OBC_NCL').label,/printed group/);assert.equal(gateQualifyingMark(report,'PWD').value,16.6);assert.equal(gateQualifyingMark(report,'all').value,null);
 const payload=data();payload.gateReports[0].qualifyingMarks=report.qualifyingMarks;payload.gateReports[0].distributions=[{pop:'qualified',cat:'GEN',m:'marks',bins:[['20<M≤30',20,30,7],['30<M≤40',30,40,187]]}];payload.gateReports[0].rankBands=[['S=(1000-901)',901,1000,1,3,'']];const app=fixture({payload});app.route('gate-reports');await app.feature.load('gate-reports');
 const main=app.feature.renderers['gate-reports']();assert.match(main,/>25<small>GEN/);await app.feature.handleClick(click('detail',{atlasId:'g1'}));const detailed=app.feature.renderers['gate-reports']();assert.match(detailed,/Printed bin/);assert.match(detailed,/atlas-bin-track/);assert.match(detailed,/AIR minimum/);assert(!detailed.includes('&quot;bins&quot;'));
});

test('singular Seat Map paper rules and same-level any-degree codes preserve exact pairing',()=>{
 const row=opportunity('singular',{eligibility:{ruleYear:2026,ruleGroups:[{paper:'EC',degreeCodes:['16']}]}});
 assert.equal(atlasEligibility(row,{degree:'400',degreeAnyCode:'16',paper:'EC'}).state,'exact');
 assert.equal(atlasEligibility(row,{degree:'400',degreeAnyCode:'20',paper:'EC'}).state,'not_listed');
 assert.equal(atlasEligibility(row,{degree:'400',degreeAnyCode:'16',paper:'CS'}).state,'not_listed');
});

test('paper, source-kind, source-type and season facets use actual supplied schema values',()=>{
 const f={category:'GEN',paper:'EC',year:'all'};assert.equal(filterAtlasRows([opportunity('ec'),opportunity('cs',{papers:['CS']})],f).length,1);
 const observations=[{year:'2022-23',sourceType:'RTI',level:'MTech'},{year:'2022-23',sourceType:'NIRF',level:'PG2'},{year:'2024-25',sourceType:'RTI',level:'MTech'}];assert.equal(filterAtlasRows(observations,{season:'2022-23',sourceType:'RTI',level:'MTech'},'placements').length,1);
 assert.equal(filterAtlasRows([{sourceKind:'video'},{sourceKind:'rti'}],{sourceKind:'video'},'companies').length,1);
});

test('rank scenario handoff keeps model score provenance until the candidate actually edits the score',async()=>{
 const app=fixture({query:'metric=gate_score&score=750&rank=1000&scoreBasis=model_approximation&category=GEN&year=2026'});await app.feature.load('opportunities');const model=app.feature.renderers.opportunities();assert.match(model,/Approximate model score \/ 1000/);assert.match(model,/Model approximation/);assert.match(model,/not an official score/);assert.match(model,/#placements\?[^\"]*scoreBasis=model_approximation/);
 app.feature.handleChange({target:{dataset:{atlasField:'year'},value:'2025'}});assert.equal(app.feature.getSnapshot().filters.scoreBasis,'model_approximation');
 app.feature.handleInput({target:{dataset:{atlasField:'score'},value:'755'}});assert.equal(app.feature.getSnapshot().filters.scoreBasis,'entered');const entered=app.feature.renderers.opportunities();assert.match(entered,/Your GATE score \/ 1000/);assert(!entered.includes('not an official score'));
 const air=fixture({query:'metric=air&rank=750&score=750'});await air.feature.load('opportunities');const html=air.feature.renderers.opportunities();assert.equal(air.feature.getSnapshot().filters.score,'');assert.match(html,/AIR 750 stays separate and was not converted/);
});

test('conflicting contexts retain multiple original source links and original notes',async()=>{
 const payload=data();payload.opportunities[0].conflict=true;payload.opportunities[0].note='Application minimum only';payload.opportunities[0].evidence=[{sourceUrl:'https://example.test/alternative.pdf',evidenceLabel:'Alternative official reference'}];const app=fixture({payload});await app.feature.load('opportunities');assert.match(app.feature.renderers.opportunities(),/Conflicting source references/);await app.feature.handleClick(click('detail',{atlasId:'o1'}));const html=app.feature.renderers.opportunities();assert.match(html,/no silent winner/);assert.match(html,/alternative\.pdf/);assert.match(html,/Application minimum only/);
});
