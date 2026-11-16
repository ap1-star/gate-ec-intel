import test from 'node:test';import assert from 'node:assert/strict';
import{createPyqFeature}from'../src/features/pyq.mjs';
const C={escape:v=>String(v??'')};
test('late bookmark responses never populate another account after identity reset',async()=>{
 let identity={status:'authenticated',user:{id:'first'}},renders=0;const pending=[];
 const feature=createPyqFeature({C,icon:()=>'',session:()=>identity,api:path=>new Promise(resolve=>pending.push({path,resolve})),render:()=>renders++});
 const first=feature.load();assert.equal(pending.length,2);
 identity={status:'authenticated',user:{id:'second'}};feature.resetUser();const second=feature.load();assert.equal(pending.length,4);
 pending[0].resolve({items:[{targetType:'question',targetId:'first-private',collectionIds:[]}],total:1});pending[1].resolve({items:[{id:'first-only',name:'Private'}]});await first;
 assert.deepEqual(feature.state.bookmarks,[]);assert.deepEqual(feature.state.collections,[]);assert.equal(renders,0);
 pending[2].resolve({items:[{targetType:'question',targetId:'second-private',collectionIds:[]}],total:1});pending[3].resolve({items:[]});await second;
 assert.equal(feature.state.loadedFor,'second');assert.equal(feature.state.bookmarks[0].targetId,'second-private');assert.equal(renders,1);
});
