/** Import public Seat Map facts without executing upstream JavaScript. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'research/imported/seatmap');
const refresh=process.argv.includes('--refresh');
const base='https://api.github.com/repos/giri256/gate-seat-map';
const published='https://giri256.github.io/gate-seat-map/';
const headers={'user-agent':'GATE-EC-Research-Terminal-Data-Import','accept':'application/vnd.github+json'};
await mkdir(output,{recursive:true});

async function acquire(name,url){
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Seat Map ${name}: HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 await writeFile(resolve(output,name),bytes);
 return {name,url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}

let acquisitions;
if(refresh){
 const metadata=await Promise.all([acquire('repository.json',base),acquire('latest-commit.json',base+'/commits/main')]);
 const commit=JSON.parse(await readFile(resolve(output,'latest-commit.json'),'utf8')).sha;
 assert.match(commit,/^[a-f0-9]{40}$/);
 acquisitions=[...metadata,...await Promise.all([
  acquire('data.js',`https://raw.githubusercontent.com/giri256/gate-seat-map/${commit}/data.js`),
  acquire('index.html',`https://raw.githubusercontent.com/giri256/gate-seat-map/${commit}/index.html`),
  acquire('README.md',`https://raw.githubusercontent.com/giri256/gate-seat-map/${commit}/README.md`)
 ])];
}else{
 const urls={'data.js':published+'data.js','index.html':published,'README.md':'https://raw.githubusercontent.com/giri256/gate-seat-map/main/README.md','repository.json':base,'latest-commit.json':base+'/commits/main'};
 acquisitions=await Promise.all(Object.entries(urls).map(async([name,url])=>{const bytes=await readFile(resolve(output,name));return {name,url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
}

const repository=JSON.parse(await readFile(resolve(output,'repository.json'),'utf8'));
const latestCommit=JSON.parse(await readFile(resolve(output,'latest-commit.json'),'utf8'));
const raw=await readFile(resolve(output,'data.js'),'utf8');
const match=raw.trim().match(/^window\.DATA\s*=\s*({[\s\S]*});\s*$/);
assert(match,'The upstream asset must contain only a JSON DATA assignment');
const data=JSON.parse(match[1]);
assert(Array.isArray(data.programs)&&Array.isArray(data.degrees)&&Array.isArray(data.papers));
assert.equal(data.rounds.length,6);
const rowsByYear=Object.fromEntries(data.years.map(year=>[year,0]));
const programmeKeys=new Set();
let eligibilityPaperMappings=0,eligibilityDegreeMemberships=0,numericCategoryFigures=0;
const anomalies=[];
const sourceReferences=[];
data.programs.forEach((programme,index)=>{
 const key=[programme.icode,programme.pcode,programme.group].join('|');
 assert(!programmeKeys.has(key),'Duplicate programme-group key: '+key);programmeKeys.add(key);
 for(const [paper,degrees] of Object.entries(programme.elig)){
  eligibilityPaperMappings++;
  assert(data.papers.some(([code])=>code===paper),'Unknown paper: '+paper);
  for(const degree of degrees){assert(Number.isInteger(degree)&&degree>=0&&degree<data.degrees.length,'Invalid degree index');eligibilityDegreeMemberships++;}
 }
 for(const [year,categories] of Object.entries(programme.cut))for(const [category,rounds] of Object.entries(categories)){
  assert(data.cats.includes(category),'Unknown category: '+category);assert.equal(rounds.length,6);
  for(const [roundIndex,pair] of rounds.entries()){
   if(pair===null)continue;
   assert(Array.isArray(pair)&&pair.length===2);
   assert(pair.every(score=>Number.isFinite(score)&&score>=0&&score<=1000),'Invalid score at '+index);
   assert(pair[0]>=pair[1],'Opening score below closing score');
   rowsByYear[year]=(rowsByYear[year]||0)+1;
  }
 }
 for(const [category,seats] of Object.entries(programme.seats))assert(data.cats.includes(category)&&Number.isInteger(seats)&&seats>=0);
});
for(const [level,index] of Object.entries(data.anyDegree))assert(Number.isInteger(index)&&data.degrees[index]?.startsWith(level));
for(const [collectionName,collection] of [['iit',data.iit],['other',data.other]])for(const [recordIndex,record] of collection.entries()){
 const candidate=record.source_url.match(/^https?:\/\/[^\s]+/)?.[0];
 assert(candidate,'No supported source URL in '+collectionName+':'+recordIndex);
 const url=new URL(candidate);assert(!url.username&&!url.password);
 const status=candidate===record.source_url?'supplied_document_or_page_url':'homepage_with_unresolved_document_note';
 sourceReferences.push({collection:collectionName,recordIndex,institution:record.iit,rawReference:record.source_url,url:url.href,status});
 if(status!=='supplied_document_or_page_url')anomalies.push({code:'source_reference_contains_homepage_and_prose',collection:collectionName,recordIndex,rawReference:record.source_url,url:url.href,handling:'Retain the original reference and show the homepage only with an exact-document link missing warning.'});
 if(url.protocol!=='https:')anomalies.push({code:'upstream_source_uses_http',collection:collectionName,recordIndex,url:url.href,handling:'Retain supplied URL; no silent HTTPS rewrite or document verification is claimed.'});
 for(const key of ['GEN','EWS','OBC_NCL','SC','ST','PwD'])if(/^\d+(\.\d+)?$/.test(record[key]))numericCategoryFigures++;
}
for(const [year,metadata] of Object.entries(data.stats)){
 const [joined,total]=metadata.split('/').map(Number);
 if(joined!==rowsByYear[year])anomalies.push({code:'declared_join_count_differs_from_exported_round_rows',year,declaredJoined:joined,declaredTotal:total,availableRoundRows:rowsByYear[year],handling:'Preserve supplied data and metadata separately; do not claim the declared joined count was imported.'});
}

const officialSources=[...new Set(['https://ccmt.admissions.nic.in/',...sourceReferences.map(row=>row.url)])].sort();
const isProgramme=row=>!!(row.inst.trim()&&row.icode&&row.pcode&&row.group);
const actualProgrammes=data.programs.filter(isProgramme);
const excludedAggregateRows=data.programs.flatMap((row,index)=>isProgramme(row)?[]:[{index,institute:row.inst,programme:row.prog,seats:row.seats,handling:'Aggregate/blank-identity row retained in raw snapshot, excluded from programme and seat totals.'}]);
for(const row of excludedAggregateRows)anomalies.push({code:'aggregate_row_is_not_a_programme',...row});
const counts={
 rawProgrammeRows:data.programs.length,aggregateRowsExcluded:excludedAggregateRows.length,
 programmeGroups:actualProgrammes.length,
 uniqueProgrammeCodes:new Set(actualProgrammes.map(row=>row.icode+'|'+row.pcode)).size,
 ccmtInstitutes:new Set(actualProgrammes.map(row=>row.icode)).size,
 qualifyingDegrees:data.degrees.length,
 gatePapers:data.papers.length,
 categories:data.cats.length,
 roundRowsByYear:rowsByYear,
 ccmtRoundRows:Object.values(rowsByYear).reduce((sum,n)=>sum+n,0),
 eligibilityPaperMappings,eligibilityDegreeMemberships,
 seatsIn2026Matrix:actualProgrammes.reduce((sum,row)=>sum+Object.values(row.seats).reduce((n,v)=>n+v,0),0),
 iitProgrammeYearRecords:data.iit.length,
 iitInstitutes:new Set(data.iit.map(row=>row.iit)).size,
 otherProgrammeYearRecords:data.other.length,
 otherInstitutes:new Set(data.other.map(row=>row.iit)).size,
 numericNonCcmtCategoryFigures:numericCategoryFigures,
 officialSourceUrls:officialSources.length
};
const manifest={
 id:'gate-seat-map-2026-10-22',name:'GATE Seat Map',sourceUrl:published,
 repositoryUrl:'https://github.com/giri256/gate-seat-map',repositoryCommit:latestCommit.sha,
 repositoryCommitAt:latestCommit.commit?.committer?.date||null,datasetBuiltAt:data.built,
 acquiredAt:new Date().toISOString(),attribution:'giri256 / GATE Seat Map; original CCMT and institute sources remain credited per record.',
 license:repository.license?.spdx_id||null,licenseStatus:repository.license?'repository_declared_license':'No repository license declared in public metadata or repository root. User stated ownership and expressly requested this integration; no open-source license is inferred.',
 reuseBasis:'User supplied both sites as their own and expressly requested combining their data into this terminal.',
 officialEvidenceReverified:false,
 evidenceStatus:'Imported public compilation. Each original official PDF/page has not been independently re-audited during this import.',
 acquisitions,counts,officialSources,sourceReferences,anomalies,excludedAggregateRows,
 limitations:[
  'CCMT seat counts and degree/GATE-paper eligibility describe the supplied 2026 matrix. They do not establish historical 2023–2025 eligibility or current/future-cycle eligibility.',
  'Programmes are keyed by institute code, programme code and merit group. Merit groups must not be collapsed before matching the gate paper and qualifying degree.',
  'Any-degree entries are scoped to the qualification level. B.E./B.Tech. any-discipline does not automatically cover M.Sc. or B.S.',
  'Related-degree hints are heuristic prompts for review, never verified exact eligibility.',
  'A missing cutoff or category is null/absent, not a zero score or a confirmed lack of seats.',
  'IIT/IISc/IIIT rows mix application minima, shortlisting thresholds, offers/closing scores and test-waiver scores. Preserve cutoff_type/admission_route and raw category values.',
  'The source lastSpecial helper prioritizes SR2, then NSR, SR1, R3, R2, R1. Do not silently treat that as chronological last round; label selection rules explicitly.',
  'Historical cutoff comparisons are descriptive, not admission probabilities or guarantees.',
  'Top-level stats joined-row counts for prior years differ from the numeric rows present in this exported object; both are retained in anomalies.',
  'Some IIT source_url fields contain homepage plus prose instead of an exact document URL; retain those strings and flag the missing exact-document link.',
  'The raw programmes array includes a Total Seats aggregate with blank institute/programme codes. It is excluded from canonical programme/institute/seat totals to prevent double counting.'
 ]
};
await writeFile(resolve(output,'data.json'),JSON.stringify(data)+'\n');
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(resolve(output,'sources.json'),JSON.stringify({officialSources,sourceReferences},null,2)+'\n');
console.log(JSON.stringify({source:manifest.id,commit:latestCommit.sha,counts,anomalies},null,2));
