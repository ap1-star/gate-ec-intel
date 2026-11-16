import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(readFileSync(new URL('../docs/integration/research-baseline.json',import.meta.url),'utf8'));
test('existing datasets, math, analytical engines and source exports match the audited baseline',()=>{
 for(const asset of baseline.assets){
  const source=readFileSync(new URL('../'+asset.path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const digest=createHash('sha256').update(source).digest('hex');
  assert.equal(digest,asset.sha256_normalized_lf,asset.path);
 }
});
