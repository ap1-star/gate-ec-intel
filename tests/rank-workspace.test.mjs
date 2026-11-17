import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {predictRank,rankSeries} from '../src/domains/career/index.mjs';
import {rankInputSupport,evaluateRankScenarios,createRankChartModel,rankHandoff,createRankWorkspace} from '../src/features/rank.mjs';

function fixture(query=''){
 const context=vm.createContext({window:{UI_ICONS:{}}});
 vm.runInContext(readFileSync(new URL('../src/ui/components.js',import.meta.url),'utf8'),context);
 let params=new URLSearchParams(query),renders=0,navigation=null,session={status:'anonymous'},request=null,resolve;
 const workspace=createRankWorkspace({C:context.window.TerminalComponents,icon:()=>'',params:()=>params,render:()=>{renders++;},navigate:(id,values)=>{navigation={id,values};},session:()=>session,api:(path,options)=>{request={path,...options};return new Promise(done=>{resolve=done;});}});
 return {workspace,setQuery:value=>{params=new URLSearchParams(value);},setSession:value=>{session=value;},renders:()=>renders,navigation:()=>navigation,request:()=>request,completeSave:()=>resolve({})};
}
function action(name,id,extra={}){
 const button={dataset:{rankAction:name,...(id?{rankId:id}:{}),...extra},hasAttribute:()=>false};
 button.closest=()=>button;
 return {target:button,preventDefault(){}};
}
const input=(value,field='marks')=>({target:{value,dataset:{rankField:field}}});

test('rank support, central estimates and sensitivity remain the real preserved predictor',()=>{
 assert.deepEqual(rankInputSupport(2026),{minimum:21,maximum:89.67});
 assert.deepEqual(rankInputSupport(2025),{minimum:-20,maximum:100});
 const items=evaluateRankScenarios({year:2025,category:'GEN',scenarios:[{id:'A',marks:45},{id:'B',marks:55},{id:'C',marks:65}]});
 for(const item of items)assert.deepEqual(item.result,predictRank({marks:item.marks,year:2025,category:'GEN',toughness:0}));
 assert.deepEqual([items[1].result.rank,items[1].result.lowRank,items[1].result.highRank,items[1].result.score],[550,502,599,702]);
 assert(items.every(item=>item.result.rangeKind==='marks_sensitivity'));
});

test('empty and invalid scenarios cannot retain stale estimates or escape 2026 support',()=>{
 const rows=evaluateRankScenarios({year:2026,scenarios:[{id:'A',marks:''},{id:'B',marks:20.99},{id:'C',marks:89.68}]});
 assert.equal(rows[0].empty,true);assert.equal(rows[0].result,null);
 assert.match(rows[1].error,/supports marks/);assert.match(rows[2].error,/supports marks/);
 assert(rows.every(row=>row.result===null));
 for(const value of [true,[],{},'0x10',NaN,Infinity]){
  const result=evaluateRankScenarios({year:2025,scenarios:[{id:'A',marks:value}]})[0];
  assert.equal(result.result,null);
 }
});

test('relationship markers and optional historical models map actual values with no extrapolation',()=>{
 const model=createRankChartModel({year:2026,category:'SC',referenceYear:2025,width:360,scenarios:[{id:'A',marks:55},{id:'B',marks:65}]});
 assert.deepEqual(model.curve.map(({marks,rank})=>({marks,rank})),rankSeries(2026,'SC'));
 assert(model.curve.every(point=>point.marks>=21&&point.marks<=89.67));
 assert(model.reference.every(point=>point.marks>=21&&point.marks<=89.67));
 for(const marker of model.markers){
  assert.equal(marker.result.rank,predictRank({marks:marker.result.marks,year:2026,category:'SC'}).rank);
  assert(Number.isFinite(marker.x)&&Number.isFinite(marker.y));
  assert(marker.lowY<=marker.y&&marker.y<=marker.highY);
 }
 assert.equal(model.xTicks.length,3,'mobile uses a readable sparse axis');
 const historical=createRankChartModel({year:2025});
 assert.equal(historical.sourceAnchor.marks,82.67);assert.equal(historical.sourceAnchor.rank,1);
 assert.equal(createRankChartModel({year:2027}).sourceAnchor,null,'a hypothetical year has no historical AIR 1 observation marker');
});

test('rank handoffs preserve units and model provenance without treating exam year as PSU recruitment year',()=>{
 const result=predictRank({marks:55,year:2025,category:'SC'}),links=rankHandoff(result);
 assert.deepEqual(links.admissions,{rank:550,score:702,category:'SC',year:2025,scoreBasis:'model_approximation',metric:'gate_score'});
 assert.deepEqual(links.psu,{score:702,category:'SC',scoreBasis:'model_approximation'});
 assert.equal('year' in links.psu,false);assert.equal('marks' in links.psu,false);assert.equal(rankHandoff(null),null);
});

test('rank workspace starts empty, supports three explicit scenarios, and updates every real comparison',()=>{
 const app=fixture(),rank=app.workspace;
 assert.match(rank.render(),/Enter a marks scenario/);assert(!rank.render().includes('career-rank-number'));
 assert.equal(rank.handleInput(input('45')),true);assert.match(rank.render(),/value="45"/);
 rank.handleClick(action('add'));rank.handleInput(input('55'));rank.handleClick(action('add'));rank.handleInput(input('65'));
 let html=rank.render();assert.equal((html.match(/<article class="rank-scenario-card /g)||[]).length,3);
 for(const marks of [45,55,65])assert(html.includes(predictRank({marks,year:2025,category:'GEN'}).rank.toLocaleString('en')));
 rank.handleClick(action('add'));assert.equal((rank.render().match(/<article class="rank-scenario-card /g)||[]).length,3);
 rank.handleClick(action('activate','A'));assert.match(rank.render(),/name="marks"[^>]*value="45"/);
 rank.handleClick(action('remove','B'));assert.equal((rank.render().match(/<article class="rank-scenario-card /g)||[]).length,2);
 rank.handleInput(input('101'));html=rank.render();assert(!html.includes('career-rank-number'));assert.match(html,/outside the supported inputs/);
});

test('partial linked parameters reset stale marks/toughness and escape invalid input',()=>{
 const app=fixture('marks=55&year=2027&category=SC&toughness=3'),rank=app.workspace;
 assert.match(rank.render(),/Hypothetical scenario/);
 app.setQuery('marks=55&year=2025&category=GEN');
 assert.match(rank.render(),/>550<\/strong>/);assert.match(rank.render(),/±0.75-mark sensitivity/);
 app.setQuery('year=2024');assert(!rank.render().includes('career-rank-number'));assert.match(rank.render(),/name="marks"[^>]*value=""/);
 app.setQuery('marks=%3Cimg%20src=x%3E&year=2025&category=GEN');
 assert(!rank.render().includes('<img'));assert.match(rank.render(),/outside the supported inputs/);
 assert.match(rank.render(),/role="alert"/,'invalid linked input is reported in the initial HTML, before afterRender');
});

test('native number badInput is reported immediately instead of silently showing an empty scenario',()=>{
 const app=fixture('marks=55&year=2025&category=GEN'),rank=app.workspace;rank.render();
 rank.handleInput({target:{value:'',dataset:{rankField:'marks'},validity:{badInput:true}}});
 const html=rank.render();assert.match(html,/Enter a numeric marks value/);assert.match(html,/role="alert"/);assert(!html.includes('career-rank-number'));
 rank.handleInput(input('55','slider'));assert.match(rank.render(),/>550<\/strong>/);assert(!rank.render().includes('Enter a numeric marks value'));
});

test('a queued live update cannot rerender an unrelated route after the rank root is removed',()=>{
 const app=fixture('marks=55&year=2025&category=GEN'),rank=app.workspace;rank.render();
 const previousDocument=globalThis.document,previousFrame=globalThis.requestAnimationFrame;
 const root={};let currentRoot=root,callback;
 globalThis.document={querySelector:()=>currentRoot};globalThis.requestAnimationFrame=fn=>{callback=fn;return 1;};
 try{rank.handleInput(input('65'));currentRoot=null;callback();assert.equal(app.renders(),0);}
 finally{globalThis.document=previousDocument;globalThis.requestAnimationFrame=previousFrame;}
});

test('live updates retain focused input identity and batch multiple slider events into one frame',()=>{
 const app=fixture('marks=55&year=2025&category=GEN'),rank=app.workspace;rank.render();
 const previousDocument=globalThis.document,previousFrame=globalThis.requestAnimationFrame;
 const attributes=new Map(),numberInput={value:'55',setAttribute:(key,value)=>attributes.set(key,value)},slider={value:'55',setAttribute:(key,value)=>attributes.set('slider:'+key,value),style:{setProperty(){}}};
 const regions=new Map(['result','tabs','scenarios','history','error'].map(name=>[name,{innerHTML:''}]));
 const markerContainer={querySelectorAll:()=>[],insertAdjacentHTML(){}};
 const root={querySelector:selector=>selector==='[data-rank-field="marks"]'?numberInput:selector==='[data-rank-field="slider"]'?slider:selector==='[data-rank-markers]'?markerContainer:selector==='.rank-add-scenario'?{disabled:false}:regions.get(selector.match(/data-rank-region="([^"]+)"/)?.[1])??null};
 let callback,frames=0;
 globalThis.document={activeElement:numberInput,querySelector:()=>root};
 globalThis.requestAnimationFrame=fn=>{callback=fn;frames++;return frames;};
 try{
  numberInput.value='65';
  rank.handleInput(input('45'));rank.handleInput(input('55'));rank.handleInput(input('65'));
  assert.equal(frames,1);assert.equal(regions.get('result').innerHTML,'');
  callback();
  assert.equal(slider.value,'65');assert.equal(numberInput.value,'65');assert.equal(globalThis.document.activeElement,numberInput);assert.equal(app.renders(),0);
  assert(regions.get('result').innerHTML.includes(predictRank({marks:65,year:2025,category:'GEN'}).rank.toLocaleString('en')));
  assert.equal(attributes.get('aria-invalid'),'false');
  globalThis.document.activeElement=slider;slider.value='64';rank.handleInput({target:{...slider,dataset:{rankField:'slider'}}});callback();assert.equal(numberInput.value,'64');
 }finally{globalThis.document=previousDocument;globalThis.requestAnimationFrame=previousFrame;}
});

test('valid slider updates retain the result number and use only optional opacity motion',()=>{
 const app=fixture('marks=55&year=2025&category=GEN'),rank=app.workspace;rank.render();
 const previousDocument=globalThis.document,previousFrame=globalThis.requestAnimationFrame,previousMatchMedia=globalThis.matchMedia;
 const animations=[];let reducedMotion=false,cancellations=0;
 const numericNode=value=>({nodeType:1,nodeName:'STRONG',attributes:[],childNodes:[{nodeType:3,nodeName:'#text',nodeValue:value}],get textContent(){return this.childNodes[0].nodeValue;}});
 const numberNode=numericNode(predictRank({marks:55,year:2025,category:'GEN'}).rank.toLocaleString('en'));
 numberNode.animate=(frames,options)=>{animations.push({frames,options});return {cancel(){cancellations++;}};};
 const panel={childNodes:[numberNode],querySelector:selector=>selector==='.rank-primary-number'?numberNode:null,set innerHTML(value){assert.fail('a valid update replaced the live result panel');}};
 const regions=new Map(['tabs','scenarios','history','error'].map(name=>[name,{innerHTML:''}]));
 const markerContainer={querySelectorAll:()=>[],insertAdjacentHTML(){}};
 const root={querySelector:selector=>selector==='[data-rank-region="result"]'?panel:selector==='[data-rank-markers]'?markerContainer:regions.get(selector.match(/data-rank-region="([^"]+)"/)?.[1])??null};
 globalThis.document={querySelector:()=>root,createElement:tag=>{
  assert.equal(tag,'template');
  return {content:null,set innerHTML(html){const value=html.match(/class="career-rank-number rank-primary-number">([^<]+)<\/strong>/)?.[1];assert(value,'a valid result contains its AIR');this.content={childNodes:[numericNode(value)]};}};
 }};
 globalThis.requestAnimationFrame=undefined;
 globalThis.matchMedia=query=>{assert.equal(query,'(prefers-reduced-motion: reduce)');return {matches:reducedMotion};};
 try{
  for(const marks of ['65','75']){
   rank.handleInput(input(marks,'slider'));
   assert.equal(panel.childNodes[0],numberNode,'rank digit changes retain the mounted result node');
   assert.equal(numberNode.textContent,predictRank({marks:Number(marks),year:2025,category:'GEN'}).rank.toLocaleString('en'));
  }
  assert.equal(app.renders(),0);assert.equal(animations.length,2);assert.equal(cancellations,1);
  for(const animation of animations){assert.deepEqual(animation.frames,[{opacity:.55},{opacity:1}]);assert(animation.options.duration>0&&animation.options.duration<=250,'result motion stays brief');}
  reducedMotion=true;rank.handleInput(input('45','slider'));
  assert.equal(panel.childNodes[0],numberNode);assert.equal(numberNode.textContent,predictRank({marks:45,year:2025,category:'GEN'}).rank.toLocaleString('en'));
  assert.equal(animations.length,2,'reduced motion suppresses new animation');assert.equal(cancellations,2,'an existing animation is stopped');
 }finally{globalThis.document=previousDocument;globalThis.requestAnimationFrame=previousFrame;globalThis.matchMedia=previousMatchMedia;}
});

test('save captures the validated scenario and rejects stale completion after editing or identity change',async()=>{
 const app=fixture('marks=55&year=2025&category=GEN'),rank=app.workspace;
 app.setSession({status:'authenticated',user:{id:'first'}});rank.render();
 const saving=rank.handleClick(action('save'));
 assert.deepEqual(app.request(),{path:'/api/estimates',method:'POST',body:{marks:55,year:2025,category:'GEN',toughness:0}});
 rank.handleInput(input('65'));app.setSession({status:'authenticated',user:{id:'second'}});rank.resetUser();app.completeSave();await saving;
 assert(!rank.render().includes('Estimate saved to your authenticated workspace.'));
 app.setSession({status:'anonymous'});await rank.handleClick(action('save'));assert.equal(app.navigation().id,'profile');
});

test('navigation and SVG keyboard actions are scoped and preserve the active scenario',()=>{
 const app=fixture('marks=55&year=2025&category=GEN'),rank=app.workspace;rank.render();
 assert.equal(rank.handleInput({target:{dataset:{}}}),false);assert.equal(rank.handleChange({target:{dataset:{}}}),false);assert.equal(rank.handleClick({target:{closest:()=>null}}),false);
 rank.handleClick(action('add'));rank.handleInput(input('65'));
 rank.handleClick(action('admissions'));assert.equal(app.navigation().id,'opportunities');assert.equal(app.navigation().values.rank,predictRank({marks:65,year:2025,category:'GEN'}).rank);
 let prevented=false;const marker=action('activate','A').target;
 rank.handleKeyDown({key:'Enter',target:marker,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);rank.handleClick(action('psu'));assert.equal(app.navigation().values.score,702);assert.equal('year' in app.navigation().values,false);
});

test('rank styling uses shared themes and disables bounded motion for reduced-motion preference',()=>{
 const css=readFileSync(new URL('../src/features/rank.css',import.meta.url),'utf8');
 assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/transition:transform 200ms/);
 assert.match(css,/var\(--chart-series-1\)/);assert.match(css,/var\(--color-control-border\)/);
 assert(!/#[0-9a-f]{3,8}\b/i.test(css),'no hard-coded palette is introduced');
});
