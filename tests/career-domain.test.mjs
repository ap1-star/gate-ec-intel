import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {predictRank,parseNumeric,rankSeries,historicalComparison,admissionBenchmarks,filterProgrammes,compareProgramme,normalizeRange,filterPsus,comparePsu,PROGRAMME_RECORDS,PSU_RECORDS,REFERENCE,CATEGORIES,SUPPORTED_YEARS,safeSourceUrl,CAREER_DATA_VERSION} from '../src/domains/career/index.mjs';
import {createCareerFeature} from '../src/features/career.mjs';

test('donor reference seed remains byte-identical to its retained source checksum',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../src/domains/career/source-manifest.json',import.meta.url),'utf8'));
 const digest=createHash('sha256').update(readFileSync(new URL('../src/domains/career/seed.json',import.meta.url))).digest('hex');
 assert.equal(digest,manifest.seedSha256);
 assert.equal(REFERENCE.DATA.years_data.length,15);
 assert.equal(REFERENCE.RECONSTRUCTED_2026_EXTERNAL_CURVE.curve_points.length,364);
});
test('rank golden values retain donor center calculations and sensitivity semantics',()=>{
 const result=predictRank({marks:55,year:2025,category:'GEN'});
 assert.deepEqual([result.rank,result.lowRank,result.highRank,result.score],[550,502,599,702]);
 assert.equal(result.rangeKind,'marks_sensitivity');assert.equal(result.sensitivityMarks,.75);assert.equal(result.calibration,'not_validated');
 assert.equal(result.sourceClaim,'verified');assert.equal(result.confidence,'unverified');assert.equal(result.scoreConfidence,'unverified');
 assert.equal(result.datasetVersion,CAREER_DATA_VERSION);
 const negative=predictRank({marks:-20,year:2023,category:'GEN'});
 assert.equal(negative.rank,44501);assert(negative.lowRank<=negative.rank&&negative.rank<=negative.highRank);
});
test('all 1,763 supported integer year/mark cases are finite, monotone and contain their center',()=>{
 let checked=0;
 for(const year of SUPPORTED_YEARS){let previous=Infinity;for(let marks=-20;marks<=100;marks++){
  if(year===2026&&(marks<21||marks>89.67))continue;
  const result=predictRank({marks,year,category:'GEN'});checked++;
  assert(Number.isFinite(result.rank));assert(result.rank>=1);assert(result.rank<=previous,`${year}/${marks} monotonic`);
  assert(result.lowRank<=result.rank&&result.rank<=result.highRank,`${year}/${marks} interval`);
  assert(result.lowRank>=1&&result.highRank<=REFERENCE.DATA.years_data.find(r=>r.year===year).appeared);
  previous=result.rank;
 }}assert.equal(checked,1763);
});
test('categories affect qualifying cutoffs rather than AIR, score or model sensitivity',()=>{
 const values=CATEGORIES.map(([category])=>predictRank({marks:26,year:2023,category}));
 assert.equal(new Set(values.map(r=>r.rank)).size,1);assert.equal(new Set(values.map(r=>r.score)).size,1);
 assert.equal(values[0].qualifies,false);assert.equal(values[3].qualifies,true);
});
test('2026 reconstructed support and 2027 hypothetical controls remain explicit',()=>{
 assert.throws(()=>predictRank({marks:20.99,year:2026,category:'GEN'}),/supports marks/);
 assert.throws(()=>predictRank({marks:89.68,year:2026,category:'GEN'}),/supports marks/);
 const exact=predictRank({marks:21,year:2026,category:'GEN'});assert.equal(exact.evidenceLabel,'Reconstructed observations');
 const future=predictRank({marks:55,year:2027,category:'GEN',toughness:3});assert.equal(future.confidence,'hypothetical');assert.match(future.scenarioDisclosure,/not a forecast/);
 assert.throws(()=>predictRank({marks:55,year:2025,category:'GEN',toughness:1}),/only/);
 assert.throws(()=>predictRank({marks:55,year:2027,category:'GEN',toughness:-3}),/from -2 to 3/);
 assert.throws(()=>predictRank({marks:55,year:2027,category:'GEN',toughness:.5}),/integer/);
});
test('rank and numeric inputs reject blanks, booleans, unsupported categories and years',()=>{
 for(const marks of ['', ' ',null,true,false,[],{},NaN,Infinity,101,-20.1,'0x10'])assert.throws(()=>predictRank({marks,year:2025,category:'GEN'}));
 for(const category of ['BAD',null,undefined])assert.throws(()=>predictRank({marks:55,year:2025,category}));
 assert.throws(()=>predictRank({marks:55,year:2028,category:'GEN'}));
 assert.equal(parseNumeric('', 'Optional',{optional:true}),null);assert.equal(parseNumeric('0','Value'),0);
});
test('rank comparison series has real supported points and does not extrapolate 2026',()=>{
 const curve=rankSeries(2026);assert.equal(curve.length,61);assert.equal(curve[0].marks,21);assert.equal(curve.at(-1).marks,89.67);
 const comparison=historicalComparison(0);assert.equal(comparison.length,15);assert.equal(comparison.find(r=>r.year===2026).estimate,null);
 assert.match(comparison.find(r=>r.year===2026).error,/supports marks/);
});
test('programmes preserve categories, ranges, source context, missing values and distinct discipline rows',()=>{
 assert.equal(PROGRAMME_RECORDS.length,600);assert.equal(new Set(PROGRAMME_RECORDS.map(r=>r.id)).size,600);
 const row=filterProgrammes({institute:'iisc',year:2022,category:'GEN',query:'Electronics and Communication'})[0];
 assert.deepEqual(row.range,[650,916]);assert.equal(row.sourcePage,2);assert.match(row.sourceUrl,/GATE-2022/);
 const st=filterProgrammes({institute:'iisc',year:2022,category:'ST',query:'Signal Processing'})[0];assert.equal(st.cutoff,null);assert.equal(st.range,null);
 const rows=filterProgrammes({institute:'iitm',year:2026,category:'GEN',query:'ED1Y'});assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);
 const ee=filterProgrammes({institute:'iitm',year:2026,category:'GEN',query:'EE2Y'})[0];assert.equal(ee.degreeEligibility,'CONFIRMED');assert.equal(ee.ecPaperAccepted,false);
 assert(!filterProgrammes({ecOnly:true}).some(r=>r.ecPaperAccepted!==true));
 assert.equal(compareProgramme(ee,900).difference,null);assert.match(compareProgramme(ee,900).status,/not supported/);
 assert.equal(compareProgramme(st,900).status,'Missing cutoff');assert.equal(compareProgramme(row,'').difference,null);
 assert.equal(compareProgramme(row,650).difference,0);assert.throws(()=>compareProgramme(row,' '),/required/);
 assert.equal(normalizeRange(null),null);assert.equal(normalizeRange([650]),null);assert.deepEqual(normalizeRange([916,650]),[650,916]);
});
test('programme filters do not infer missing institutes, years or category data',()=>{
 assert.equal(filterProgrammes({institute:'nit'}).length,0);assert.equal(filterProgrammes({year:2019}).length,0);
 assert.throws(()=>filterProgrammes({category:'NOPE'}));
 assert(filterProgrammes({availableOnly:true}).every(r=>r.cutoff!==null));
 const ews=filterProgrammes({institute:'iitm',year:2026,category:'GEN_EWS',query:'ED1Y'})[0];assert.equal(ews.cutoff,null,'source missing value intentionally preserved');
});
test('tier benchmarks keep unsupported IIIT and NIT programme evidence explicit',()=>{
 assert.equal(admissionBenchmarks('').length,0);assert.throws(()=>admissionBenchmarks(0));
 const rows=admissionBenchmarks(1200);assert.equal(rows.length,7);assert.equal(rows.find(r=>r.key==='iiit').benchmark,null);
 assert.match(rows.find(r=>r.key==='nit_top').note,/branch\/category\/round/);
 assert(rows.every(r=>!('probability'in r)));
});
test('PSU records retain all units and category gaps without converting score, marks or AIR',()=>{
 assert.equal(PSU_RECORDS.length,42);assert.equal(new Set(PSU_RECORDS.map(r=>r.id)).size,42);
 const marks=filterPsus({year:2019,category:'GEN',metric:'marks',query:'NTPC'})[0],air=filterPsus({year:2019,category:'GEN',metric:'air',query:'NTPC'})[0];
 assert.equal(marks.cutoff,64);assert.equal(air.cutoff,316);
 assert.equal(comparePsu(marks,64,'marks').difference,0);assert.equal(comparePsu(air,300,'air').difference,16);
 assert.equal(comparePsu(marks,900,'gate_score').difference,null);assert.match(comparePsu(marks,900,'gate_score').status,/Different metric/);
 const missing=filterPsus({category:'ST',year:2021,query:'ONGC'}).find(r=>r.role==='AEE (Electronics)');assert.equal(missing.cutoff,null);assert.equal(comparePsu(missing,900,'gate_score').status,'Missing category cutoff');
 assert.equal(filterPsus({category:'PWBD',year:2019,metric:'air'})[0].cutoff,11242);
 assert.equal(comparePsu(marks,'','marks').status,'No candidate value entered');
 assert.throws(()=>comparePsu(marks,' ','marks'));assert.equal(filterPsus({year:2026}).length,0);
});
test('source URLs allow HTTPS only and never invent missing exact PSU URLs',()=>{
 assert.equal(safeSourceUrl('javascript:alert(1)'),null);assert.equal(safeSourceUrl('https://u:p@example.com'),null);assert.equal(safeSourceUrl('https://example.com'), 'https://example.com/');
 assert(PSU_RECORDS.every(r=>r.sourceUrl===null));assert(PROGRAMME_RECORDS.every(r=>safeSourceUrl(r.sourceUrl)));
});

test('shared career renderers start without fabricated candidate results and expose source-backed rows',()=>{
 const context=vm.createContext({window:{UI_ICONS:{}}});vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
 const C=context.window.TerminalComponents;
 const feature=createCareerFeature({C,icon:()=>'',render(){},navigate(){},params:()=>new URLSearchParams(),api(){throw Error('not configured');},session:()=>({status:'unavailable'})});
 assert.match(feature.renderers.rank(),/Enter a marks scenario/);assert(!feature.renderers.rank().includes('career-rank-number'));
 for(const name of ['admissions','institutes','psu']){const html=feature.renderers[name]();assert.match(html,/career-workspace/);assert(!html.includes('NaN'));assert(!html.includes('undefined'));}
 const linked=createCareerFeature({C,icon:()=>'',render(){},navigate(){},params:()=>new URLSearchParams('marks=55&year=2025&category=GEN'),api(){},session:()=>({status:'anonymous'})});
 assert.match(linked.renderers.rank(),/550/);assert.match(linked.renderers.rank(),/±0.75-mark sensitivity/);assert(!linked.renderers.rank().includes('data-career-save-estimate'));
 const bad=createCareerFeature({C,icon:()=>'',render(){},navigate(){},params:()=>new URLSearchParams('marks=%3Cimg%20src=x%3E&year=2025&category=GEN'),api(){},session:()=>({status:'anonymous'})});assert(!bad.renderers.rank().includes('<img'));assert.match(bad.renderers.rank(),/role="alert"/);
});

test('partial career links use deterministic defaults and clear stale candidate comparisons',()=>{
 const context=vm.createContext({window:{UI_ICONS:{}}});vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
 let params=new URLSearchParams('marks=55&year=2027&category=SC&toughness=3');
 const feature=createCareerFeature({C:context.window.TerminalComponents,icon:()=>'',render(){},navigate(){},params:()=>params,api(){},session:()=>({status:'anonymous'})});
 feature.renderers.rank();params=new URLSearchParams('marks=55&year=2025&category=GEN');
 assert.match(feature.renderers.rank(),/>550<\/strong>/);assert(!feature.renderers.rank().includes('role="alert"'));
 params=new URLSearchParams('year=2024');assert(!feature.renderers.rank().includes('career-rank-number'));assert.match(feature.renderers.rank(),/name="marks"[^>]*value=""/);
 params=new URLSearchParams('score=900&year=2026&category=GEN&institute=iitm&query=EE2Y');feature.renderers.admissions();
 params=new URLSearchParams('score=702&rank=550&year=2025&category=GEN&scoreBasis=model_approximation');const admissions=feature.renderers.admissions();
 assert.match(admissions,/value="all" selected>All institutes/);assert.match(admissions,/name="query"[^>]*value=""/);assert.match(admissions,/forwarded score is a donor-model approximation/);
 params=new URLSearchParams('score=702&category=GEN&scoreBasis=model_approximation');assert.match(feature.renderers.psu(),/name="value"[^>]*value="702"/);
 params=new URLSearchParams('year=2019&category=SC');const psu=feature.renderers.psu();assert.match(psu,/name="value"[^>]*value=""/);assert(!psu.includes('forwarded GATE score is a model approximation'));
});

test('estimate saving captures validated input and ignores completion after an identity switch',async()=>{
 const context=vm.createContext({window:{UI_ICONS:{}}});vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
 let session={status:'authenticated',user:{id:'first'}},resolve,request,navigation;
 const feature=createCareerFeature({C:context.window.TerminalComponents,icon:()=>'',render(){},navigate:id=>{navigation=id;},params:()=>new URLSearchParams('marks=55&year=2025&category=GEN'),api:(path,options)=>{request={path,...options};return new Promise(r=>{resolve=r;});},session:()=>session});
 feature.renderers.rank();const button={hasAttribute:name=>name==='data-career-save-estimate'},event={target:{closest:()=>button}};
 const saving=feature.handleClick(event);assert.equal(request.path,'/api/estimates');assert.deepEqual(request.body,{marks:55,year:2025,category:'GEN',toughness:0});
 session={status:'authenticated',user:{id:'second'}};feature.resetUser();resolve({});await saving;assert(!feature.renderers.rank().includes('Estimate saved to your authenticated workspace.'));
 session={status:'anonymous'};await feature.handleClick(event);assert.equal(navigation,'profile');
});
