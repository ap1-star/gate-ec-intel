import test from 'node:test';
import assert from 'node:assert/strict';
import {backendFixture} from './backend-fixture.mjs';
test('long literal forum searches remain compatible with D1 and do not reinterpret percent or underscore',async()=>{
 const f=await backendFixture();try{
  const client=f.client();await client.register('literal_search');const needle='RF_%'+ 'electronic-systems-'.repeat(4);
  const created=await client.request('/api/forum',{method:'POST',body:{title:'Literal technical discussion',body:'Check the exact string '+needle+' before matching.',subject:'Communications',tags:[]}});assert.equal(created.status,201);
  const prepare=f.db.prepare;f.db.prepare=sql=>{assert(!/\bLIKE\b|\bGLOB\b/i.test(sql),'Production search must not depend on a long pattern.');return prepare(sql);};
  const found=await client.request('/api/forum?search='+encodeURIComponent(needle));assert.equal(found.status,200);assert.equal(found.data.items.length,1);
  const missing=await client.request('/api/forum?search='+encodeURIComponent(needle.replace('RF_%','RFxx')));assert.equal(missing.status,200);assert.equal(missing.data.items.length,0);
 }finally{f.close();}
});
