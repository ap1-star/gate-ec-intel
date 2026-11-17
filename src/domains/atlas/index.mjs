/** Public evidence snapshots are fetched only when their workspace opens. */
export function createAtlasLoader({fetch:fetcher=globalThis.fetch,baseUrl=()=>document.baseURI}={}){
 const cache=new Map();
 async function read(file){
  if(!cache.has(file))cache.set(file,(async()=>{
   const response=await fetcher(new URL(file,baseUrl()).href,{headers:{accept:'application/json'},cache:'no-cache',signal:AbortSignal.timeout(30000)});
   if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('The combined atlas snapshot could not be loaded. Retry after the deployment finishes.');
   return response.json();
  })().catch(error=>{cache.delete(file);throw error;}));
  return cache.get(file);
 }
 const sections={opportunities:'opportunities',placements:'placements',companies:'companies','career-sources':null,'gate-reports':'gateReports','psu-evidence':'psuRecords','bits-offers':'bitsOffers'};
 return async function loadAtlas(route='opportunities'){
  const section=sections[route];if(section===undefined)throw Error('Unknown atlas workspace.');
  const base=await read('career-atlas.json');
  if(!section)return base;
  const value=base.assets?.[section],files=Array.isArray(value)?value:[value];if(!files.length||files.some(file=>typeof file!=='string'||!/^career-atlas-[a-z0-9-]+\.json$/.test(file)))throw Error('This atlas section is missing from the published manifest.');
  const chunks=await Promise.all(files.map(read));
  if(chunks.some(chunk=>chunk.version!==base.version||!Array.isArray(chunk[section]))){cache.clear();throw Error('Atlas files belong to different releases. Retry after deployment finishes.');}
  const rows=chunks.flatMap(chunk=>chunk[section]);
  return {...base,...chunks[0],[section]:section==='opportunities'?rows.map(row=>row.eligibilityRef?{...row,eligibility:base.eligibilityRules?.[row.eligibilityRef]||{notes:'Mapping reference is unavailable; review required.'}}:row):rows};
 };
}
