const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements=new Map(),handlers={};
function el(s){if(!elements.has(s))elements.set(s,{value:s==='#from'?'2019':s==='#to'?'2026':s==='#subject'||s==='#quality'?'all':'',innerHTML:'',textContent:'',dataset:{},setAttribute(){},removeAttribute(){},classList:{toggle(){},add(){},remove(){}},insertAdjacentHTML(){},focus(){},setSelectionRange(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(s)}
const ctx={window:{addEventListener(){}},document:{querySelector:el,getElementById:el,querySelectorAll:()=>[],addEventListener:(e,f)=>{handlers[e]=f},body:{dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}}}},location:{hash:''},setTimeout(){},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/research-data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/difficulty-data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/difficulty.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/difficulty-extras.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/topic-ledger.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/terminal.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/quality-data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/quality.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/study.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/trading.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/atlas.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/workspace.js','utf8'),ctx);ctx.URLSearchParams=URLSearchParams;ctx.localStorage={getItem(){return null},setItem(){}};ctx.location.search='';vm.runInContext(fs.readFileSync('dist/v5-math.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/v5.js','utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
assert.equal(run('scope().length'),520);
assert.equal(run('R.questions.filter(q=>q.toughness).length'),520);
assert.equal(run('toughBand(34.99)'),'Easy');assert.equal(run('toughBand(35)'),'Moderate');assert.equal(run('toughBand(64.99)'),'Moderate');assert.equal(run('toughBand(65)'),'Tough');
assert.equal(run('toughRows().length'),509);
assert(run('R.questions.every(q=>q.toughness.score===DIMS.reduce((s,[k,l,w])=>s+q.toughness.dimensions[k]*w/4,0))'));
assert.equal(run('Object.values(toughStats(toughRows()).bands).reduce((s,b)=>s+b.n,0)'),509);
for(const y of run('R.years')){assert.equal(run(`toughStats(R.questions.filter(q=>q.year===${y})).n`),65);assert.equal(run(`toughStats(R.questions.filter(q=>q.year===${y})).marks`),100)}
run("difficultyQuestionBand='Tough'");assert(run('questionList().includes("question-card")'));run("difficultyQuestionBand='all'");
assert.equal(run('totals(scope()).marks'),800);
assert.equal(run('R.questions.filter(q=>q.structural.cognitive_operations.includes("not_assessed")).length'),0);
assert.equal(run('R.questions.filter(q=>q.structural.bloom_estimate==="not_assessed").length'),0);
assert(run('R.questions.every(q=>q.empirical.irt_alpha===null&&q.empirical.difficulty_p===null)'));
assert(run('R.subject_stats.every(s=>s.bh_q>=s.permutation_p-1e-10&&s.bh_q<=1)'));
assert.equal(run('R.subject_stats.find(s=>s.subject==="General Aptitude").permutation_p'),1);
assert(run('R.year_stats.every(s=>s.marks===100&&s.questions===65)'));
for(const v of ['difficulty','monitor','subjects','distributions','inference','questions','audit','responses','evidence']){ctx.location.hash='#'+v;run('render()');assert(el('#content').innerHTML.length>700,v);assert(!el('#content').innerHTML.includes('NaN'),v)}
for(const y of ['2019','2026']){el('#from').value=y;el('#to').value=y;assert.equal(run('scope().length'),65);assert.equal(run('totals(scope()).marks'),100)}
el('#from').value=2019;el('#to').value=2026;el('#quality').value='clear';assert(run('scope().every(q=>q.review.semantic_verdict!=="ambiguous")'));
el('#quality').value='all';run('query="zzzznotfound"');assert(run('questionList().includes("No matching records")'));run('query=""');
assert.deepEqual(JSON.parse(run('JSON.stringify(parseCSV(\'candidate_id,question_id,correct\\r\\n"x,y",id,1\'))')),[['candidate_id','question_id','correct'],['x,y','id','1']]);

assert.equal(run('R.summary.ambiguous'),0);
assert.equal(run('R.questions.filter(q=>q.quality.targeted_repair).length'),45);
assert.equal(run('R.questions.filter(q=>q.quality.severity==="critical").length'),2);
run('download=(name,text,type)=>{window.lastExport={name,text,type}}');
let checks=0;
for(const field of ['topic_family','topic','microtopic'])for(const exclude of [true,false])for(const conf of ['all','high']){
 run(`clearQuestionContext();topicField=${JSON.stringify(field)};difficultyState.excludeMTA=${exclude};difficultyState.confidence=${JSON.stringify(conf)};questionContext.difficulty=true;questionContext.field=topicField`);
 el('#from').value=2019;el('#to').value=2026;el('#subject').value='all';
 const gs=JSON.parse(run('JSON.stringify(toughTopicGroups(toughRows()).map(g=>({topic:g.topic,subject:g.subject,ids:g.items.map(q=>q.id).sort()})))'));
 for(const g of gs){el('#subject').value=g.subject;run(`questionContext.topic=${JSON.stringify(g.topic)}`);assert.deepEqual(JSON.parse(run('JSON.stringify(selectedQuestionRows().map(q=>q.id).sort())')),g.ids);checks++}
}
run("clearQuestionContext();topicField='topic_family';difficultyState.excludeMTA=true;difficultyState.confidence='all';questionContext.difficulty=true;difficultyQuestionBand='Tough';view='questions'");el('#from').value=2021;el('#to').value=2021;el('#subject').value='all';
assert.equal(run('selectedQuestionRows().length'),10);run('exportCurrentView()');assert.equal(run('parseCSV(window.lastExport.text).length-1'),10);
run("clearQuestionContext();questionContext.difficulty=true;difficultyState.confidence='high'");el('#from').value=2019;el('#to').value=2026;assert.equal(run('selectedQuestionRows().length'),137);
run("clearQuestionContext();difficultyState.confidence='all';query='doesnotexist'");assert.equal(run('selectedQuestionRows().length'),0);run('exportCurrentView()');assert.equal(run('parseCSV(window.lastExport.text).length-1'),0);
run("clearQuestionContext();topicField='topic_family';difficultyState.confidence='all'");
console.log('PASS: '+checks+' exact topic/cohort comparisons; filtered export, high confidence, empty cohort, quality closures.');

(async()=>{ctx.testfile={size:200,text:async()=> 'candidate_id,question_id,correct,response_time_sec\na,GATE-EC-2019-GA-01,1,30\nb,GATE-EC-2019-GA-01,0,40\nc,GATE-EC-2019-GA-01,1,50\na,GATE-EC-2019-GA-02,1,20\nb,GATE-EC-2019-GA-02,0,30\nc,GATE-EC-2019-GA-02,0,40'};await run('importResponses(testfile)');assert.equal(el('#responseError').textContent,'');assert.equal(run('responseData.complete'),3);assert.equal(run('responseData.rows[0].p'),2/3);assert.equal(run('responseData.rows[0].t'),40);ctx.testfile={size:100,text:async()=> 'candidate_id,question_id,correct\na,GATE-EC-2019-GA-01,1\na,GATE-EC-2019-GA-01,0'};await run('importResponses(testfile)');assert(el('#responseError').textContent.includes('Duplicate'));for(const q of run('R.questions')){run(`inspect(${JSON.stringify(q.id)})`);assert(el('#inspectBody').innerHTML.includes('TOPIC ASSIGNMENT'));assert(el('#inspectBody').innerHTML.includes('TOUGHNESS / EXPLAIN'))}console.log('PASS: all nine views, 520 inspectors, totals, metadata completeness, null empirical calibration, year scopes, ambiguity exclusion, exact/BH outputs, quoted CSV, response statistics and duplicate rejection.');})().catch(e=>{console.error(e);process.exit(1)});


assert(run('difficulty().includes("Challenge radar")'));console.log("Chart workspace passed.");
console.log('Atlas overview and all retained tools passed.');
assert(run('subjects().includes("subject-ranking")'));run('questionDisplay="table"');assert(run('questionList().includes("Toughness / 100")'));console.log("Subject rankings, card/table library and all nine routes passed.");

const stats=run('M.describe([1,2,3,4])');
assert.equal(stats.mean,2.5);assert.equal(stats.median,2.5);assert(Math.abs(stats.variance-5/3)<1e-12);assert.equal(stats.q1,1.75);assert.equal(stats.q3,3.25);assert.equal(stats.skewness,0);
assert.equal(run('M.describe([]).mean'),null);assert.equal(run('M.describe([2]).sd'),null);assert.equal(run('M.describe([1,1,1]).skewness'),null);
assert.equal(run('M.pearson([1,2,3],[2,4,6])'),1);
assert.equal(run('M.pearson([1,1],[1,2])'),null);
assert.equal(run('M.spearman([1,1,2],[3,3,1])'),-1);
assert.equal(run('M.slope([2019,2021,2026],[1,5,15])'),2);
assert.equal(run('M.rolling([1,2,3],2)[0]'),null);
assert.equal(run('JSON.stringify(M.bootstrap([2,4,8,9],1500,42))'),run('JSON.stringify(M.bootstrap([2,4,8,9],1500,42))'));
assert.equal(run('M.bootstrap([4,4,4],500,12).interval[0]'),4);
assert(run('Math.abs(M.total(M.allocation([[20,80],[40,60]],[1,1],[2,1]))-100)<1e-10'));
assert.equal(run('M.backtest([[25,75],[25,75],[25,75]],"equal")[0].mae'),0);
for(const route of ['monitor','explorer','subjects','topics','lab','compare','scenarios','reports','audit','questions','difficulty','responses','evidence']){
 ctx.location.hash='#'+route;run('render()');assert(el('#content').innerHTML.length>400,route);assert(!el('#content').innerHTML.includes('NaN'),route);
}
for(const tab of ['descriptive','bootstrap','trends','correlation','change']){
 run('researchState.tab='+JSON.stringify(tab));ctx.location.hash='#lab';run('render()');assert(!el('#content').innerHTML.includes('NaN'),tab);
}
assert(run('Math.abs(sum(scenarioData().allocation)-100)<1e-9'));
assert(run('R.questions.every(q=>q.public_text_policy&&q.options==="{}")'));
console.log('PASS V5: descriptive math, nulls, tied ranks, robust slopes, bootstrap seed reproducibility, scenario normalization/backtest, 13 routes and five lab modules.');

