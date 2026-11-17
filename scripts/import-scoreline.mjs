/** Public Score Line dataset acquisition; no authentication or access-control bypass. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'research/imported/scoreline'),base='https://score-line.pages.dev';
await mkdir(out,{recursive:true});
const manifest={source:'Score Line',sourceOrigin:base,acquiredAt:new Date().toISOString(),authorization:'User identified this as one of their own sites and explicitly requested combination/import.',license:'No license identified yet; preserve upstream attribution and original evidence links. User authorization is the reuse basis.',assets:[],limitations:['Imported public structured data is an upstream snapshot, not independent verification of every source.','Source document files are linked, not bulk-downloaded.']};
const fetched=new Map();
const shape=value=>Array.isArray(value)?{kind:'array',rows:value.length,itemType:Array.isArray(value[0])?'packed_row':typeof value[0],...(Array.isArray(value[0])?{width:value[0].length}:value[0]&&typeof value[0]==='object'?{fields:Object.keys(value[0])}:{})}:value&&typeof value==='object'?{kind:'object',keys:Object.keys(value).slice(0,20)}:{kind:typeof value};
async function acquire(path){
 const url=new URL(path,base);if(url.origin!==base)throw Error('Only the declared public Score Line origin is acquired.');
 if(fetched.has(url.href))return fetched.get(url.href);
 const task=(async()=>{
  const response=await fetch(url);if(!response.ok)throw Error('HTTP '+response.status+' '+url.pathname);
  const bytes=new Uint8Array(await response.arrayBuffer()),type=response.headers.get('content-type')||'';
  const file='raw/'+(url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'').replace(/\/$/,'/index.html'));
  await mkdir(dirname(resolve(out,file)),{recursive:true});await writeFile(resolve(out,file),bytes);
  const item={url:url.href,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),contentType:type};manifest.assets.push(item);
  return {item,text:new TextDecoder().decode(bytes)};
 })();fetched.set(url.href,task);return task;
}
const pages=['/','/about/','/options/','/explore/','/lab/','/compare/','/findings/','/cutoffs/','/placements/','/companies/','/institutes/','/gate/','/psu/','/bits/','/sources/'];
const scripts=new Set();
for(const page of pages){const {text}=await acquire(page);for(const match of text.matchAll(/<script[^>]+src="([^"]+)"/g))if(match[1].startsWith('/'))scripts.add(match[1]);}
const datasetNames=new Set();
for(const script of scripts){
 const {text}=await acquire(script);
 for(const match of text.matchAll(/\.P\)\("([a-z0-9_-]+)"/g))datasetNames.add(match[1]);
 for(const match of text.matchAll(/["'`]\/data\/([a-z0-9_-]+)\.json["'`]/g))datasetNames.add(match[1]);
}
manifest.datasets=[];
for(const name of datasetNames){
 const {item,text}=await acquire('/data/'+name+'.json'),data=JSON.parse(text);
 const schema=Array.isArray(data)?shape(data):Object.fromEntries(Object.entries(data).map(([key,value])=>[key,shape(value)]));
 const dataset={name,file:item.file,url:item.url,bytes:item.bytes,sha256:item.sha256,schema};manifest.datasets.push(dataset);console.log(JSON.stringify(dataset));
}
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({pages:pages.length,scripts:scripts.size,datasets:datasetNames.size,assets:manifest.assets.length,bytes:manifest.assets.reduce((n,a)=>n+a.bytes,0)}));
