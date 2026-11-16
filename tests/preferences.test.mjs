import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../src/app/preferences.js',import.meta.url),'utf8'),context,{filename:'src/app/preferences.js'});
const preferences=context.window.TerminalPreferences;
const clone=value=>JSON.parse(JSON.stringify(value));
const snapshot={route:'lab',scope:['2019','2026','all','all'],query:'MOSFET',verdict:'all',questionDisplay:'cards',questionContext:{topic:null,field:'topic_family',difficulty:false,label:''},difficulty:{easy:35,tough:65,unit:'questions',excludeMTA:true,confidence:'all',minN:3,topicSort:'hard',compareA:2021,compareB:2026},research:{subject:'Analog Circuits',otherSubject:'Communications',tab:'descriptive',iterations:1500,seed:20261114,window:3,compareA:2021,compareB:2026,scheme:'equal',multipliers:[1,1],topic:'',subtopic:'',plotLow:0,plotHigh:100,columns:['year','subject']},issueFilter:'all'};
const baseOptions={allowedRoutes:['monitor','lab','questions','settings'],scopeOptions:{from:[2019,2020,2021,2026],to:[2019,2020,2021,2026],subject:['all','Analog Circuits','Communications'],quality:['all','clear','changed']},templates:{questionContext:snapshot.questionContext,difficulty:snapshot.difficulty,research:snapshot.research}};
const memory=()=>{const items=new Map();let writes=0;return{getItem:key=>items.has(key)?items.get(key):null,setItem:(key,value)=>{writes++;items.set(key,value);},get writes(){return writes;},items};};
const create=storage=>preferences.create({...baseOptions,storage});

// The API validates/serializes local preferences only; no DOM or research state is mutated.
test('legacy saved-view schema and all values round-trip without changing caller state',()=>{
  const store=memory(),api=create(store),input=clone(snapshot),before=clone(input);
  input.questionContext.topic='MOSFET Circuits';before.questionContext.topic='MOSFET Circuits';
  const saved=api.save(input);
  assert.equal(saved.ok,true);
  assert.deepEqual(clone(saved.value),before);
  assert.deepEqual(input,before);
  assert.equal(store.writes,1);
  assert.deepEqual(JSON.parse(store.items.get('gate-v5-saved-view')),before);
  input.query='Changed after save';
  const restored=api.load();
  assert.equal(restored.ok,true);
  assert.deepEqual(clone(restored.value),before);
  restored.value.research.multipliers[0]=3;
  assert.equal(api.load().value.research.multipliers[0],1);
});

test('validate returns a detached clone and never writes storage',()=>{
  const store=memory(),api=create(store),value=clone(snapshot);
  const result=api.validate(value);assert.equal(result.ok,true);
  result.value.scope[0]='2020';result.value.research.columns.push('marks');
  assert.equal(value.scope[0],'2019');assert.equal(value.research.columns.length,2);
  assert.equal(store.writes,0);
});

test('blocked getters, missing storage and quota errors never report save success',()=>{
  const blocked=preferences.create({...baseOptions,storage:()=>{throw new Error('denied');}});
  assert.equal(blocked.save(clone(snapshot)).ok,false);
  assert.equal(blocked.load().error.code,'unavailable');
  assert.equal(create(undefined).save(clone(snapshot)).error.code,'unavailable');
  const quota=create({getItem(){return null;},setItem(){throw new Error('quota exceeded');}});
  assert.equal(quota.save(clone(snapshot)).error.code,'write-failed');
  const read=create({getItem(){throw new Error('denied');},setItem(){}});
  assert.equal(read.load().error.code,'read-failed');
});

test('missing and malformed saved values are distinct errors and are left untouched',()=>{
  const store=memory(),api=create(store);
  assert.equal(api.load().error.code,'not-found');
  store.items.set('gate-v5-saved-view','{broken JSON');
  assert.equal(api.load().error.code,'invalid-json');
  assert.equal(store.items.get('gate-v5-saved-view'),'{broken JSON');
  store.items.set('gate-v5-saved-view','null');
  assert.equal(api.load().error.code,'invalid-view');
  store.items.set('gate-v5-saved-view','[]');
  assert.equal(api.load().error.code,'invalid-view');
  assert.equal(store.writes,0);
});

test('route and scope options are validated before any mutation or write',()=>{
  const store=memory(),api=create(store);
  const mutations=[
    value=>value.route='rank',
    value=>value.scope=['2019','2026','all'],
    value=>value.scope[0]=2019,
    value=>value.scope[0]='2030',
    value=>value.scope[0]='2026',
    value=>value.scope[1]='2019',
    value=>value.scope[2]='Unknown subject',
    value=>value.scope[3]='unsupported',
  ];
  // A reverse range is invalid only when both endpoints differ in reverse order.
  mutations[4]=value=>{value.scope[0]='2026';value.scope[1]='2019';};
  mutations[5]=value=>{value.scope[0]='2020';value.scope[1]='2019';};
  for(const mutate of mutations){const value=clone(snapshot),before=clone(value);mutate(value);const invalid=clone(value);const result=api.save(value);assert.equal(result.ok,false);assert.equal(result.error.code,'invalid-view');assert.deepEqual(value,invalid);assert.equal(before.route,'lab');}
  assert.equal(store.writes,0);
});

test('unknown, missing and wrongly typed state fields are rejected',()=>{
  const store=memory(),api=create(store);
  const mutations=[
    value=>value.extra='unknown',
    value=>delete value.query,
    value=>value.query=4,
    value=>value.questionDisplay=false,
    value=>value.questionContext=[],
    value=>value.difficulty=[],
    value=>value.research=[],
    value=>value.questionContext.topic=12,
    value=>value.questionContext.extra=true,
    value=>value.research.unknownSetting=0,
    value=>delete value.difficulty.confidence,
    value=>value.difficulty.excludeMTA='false',
    value=>value.research.columns=[1,2],
    value=>value.research.seed=NaN,
    value=>value.research.window=Infinity,
    value=>value.research.multipliers=[1,undefined],
    value=>value.issueFilter=null,
  ];
  for(const mutate of mutations){const value=clone(snapshot);mutate(value);const result=api.save(value);assert.equal(result.ok,false);assert.equal(result.error.code,'invalid-view');}
  assert.equal(store.writes,0);
});

test('prototype keys, accessors, custom objects, cycles, symbols and sparse arrays are rejected',()=>{
  const api=create(memory());
  for(const key of ['__proto__','constructor','prototype']){
    const value=clone(snapshot);Object.defineProperty(value.research,key,{value:{polluted:true},enumerable:true});
    assert.equal(api.validate(value).ok,false,key);
  }
  const accessor=clone(snapshot);let invoked=false;
  Object.defineProperty(accessor,'query',{get(){invoked=true;return 'bad';},enumerable:true});
  assert.equal(api.validate(accessor).ok,false);assert.equal(invoked,false);
  const custom=clone(snapshot);custom.questionContext=new (class State {})();assert.equal(api.validate(custom).ok,false);
  const prototypeAccessor=clone(snapshot);let prototypeRead=false;const customPrototype=Object.create(null);Object.defineProperty(customPrototype,'constructor',{get(){prototypeRead=true;return Object;}});prototypeAccessor.questionContext=Object.create(customPrototype);assert.equal(api.validate(prototypeAccessor).ok,false);assert.equal(prototypeRead,false);
  const cycle=clone(snapshot);cycle.research.topic=cycle;assert.equal(api.validate(cycle).ok,false);
  const symbol=clone(snapshot);symbol.research[Symbol('private')]=1;assert.equal(api.validate(symbol).ok,false);
  const sparse=clone(snapshot);delete sparse.research.multipliers[1];assert.equal(api.validate(sparse).ok,false);
  const arrayProperty=clone(snapshot);arrayProperty.research.multipliers.extra=1;assert.equal(api.validate(arrayProperty).ok,false);
  assert.equal({}.polluted,undefined);
});

test('difficulty, resampling and multiplier numerical constraints preserve valid edges',()=>{
  const api=create(memory());
  const mutations=[
    value=>value.difficulty.easy=-1,
    value=>value.difficulty.tough=101,
    value=>value.difficulty.easy=65,
    value=>value.research.seed=1.5,
    value=>value.research.iterations=199,
    value=>value.research.iterations=10001,
    value=>value.research.iterations=250.5,
    value=>value.research.multipliers=[1],
    value=>value.research.multipliers=[0,0],
    value=>value.research.multipliers=[-1,1],
    value=>value.research.multipliers=[5.1,1],
  ];
  for(const mutate of mutations){const value=clone(snapshot);mutate(value);assert.equal(api.validate(value).ok,false);}
  const edge=clone(snapshot);edge.difficulty.easy=0;edge.difficulty.tough=100;edge.research.seed=-1;edge.research.iterations=200;edge.research.multipliers=[0,5];
  assert.equal(api.validate(edge).ok,true);
  edge.research.iterations=10000;assert.equal(api.validate(edge).ok,true);
});

test('configuration is validated once and external template mutation cannot weaken it',()=>{
  const store=memory(),options={...baseOptions,storage:store,templates:clone(baseOptions.templates)},api=preferences.create(options);
  options.templates.research.unexpected='';
  const value=clone(snapshot);value.research.unexpected='bad';assert.equal(api.validate(value).ok,false);
  const bad=preferences.create({...baseOptions,allowedRoutes:[],storage:store});
  assert.equal(bad.load().error.code,'invalid-configuration');
  assert.equal(bad.save(clone(snapshot)).error.code,'invalid-configuration');
  assert.equal(store.writes,0);
});
