/** Canonical Atlas rows from the attributed Seat Map snapshot. No fuzzy joins. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..'),directory=resolve(root,'research/imported/seatmap');
const data=JSON.parse(await readFile(resolve(directory,'data.json'),'utf8'));
const manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));
const sourceReferences=new Map(manifest.sourceReferences.map(reference=>[reference.collection+':'+reference.recordIndex,reference]));
const hash=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,18);
const categoryMap={OPEN:'GEN','OPEN-PwD':'GEN_PWD',GEN:'GEN',EWS:'GEN_EWS','EWS-PwD':'GEN_EWS_PWD','OBC-NCL':'OBC_NCL','OBC-NCL-PwD':'OBC_NCL_PWD',OBC_NCL:'OBC_NCL',SC:'SC','SC-PwD':'SC_PWD',ST:'ST','ST-PwD':'ST_PWD',PwD:'PWD'};
const roundCodes=['R1','R2','R3','SR1','SR2','NSR'];
const number=raw=>typeof raw==='number'&&Number.isFinite(raw)?raw:typeof raw==='string'&&/^\d+(?:\.\d+)?$/.test(raw.trim())?Number(raw.trim()):null;
const yearValue=value=>Number(String(value).match(/\b(20\d{2})\b/)?.[1])||null;
const officialCcmt='https://ccmt.admissions.nic.in/';
const sourceIdFor=url=>'seatmap-source-'+hash(url);
const sources=[{id:'seatmap-ccmt-index',title:'CCMT official admissions index',url:officialCcmt,sourceDataset:'seatmap',evidenceLabel:'Imported CCMT reference',exactDocumentLink:false,notes:'Supplied compilation links the CCMT index; a row-specific original PDF/page has not been reverified during import.'}];
for(const url of manifest.officialSources.filter(url=>url!==officialCcmt)){
 const references=manifest.sourceReferences.filter(reference=>reference.url===url);
 sources.push({id:sourceIdFor(url),title:[...new Set(references.map(reference=>reference.institution))].join(' / ')+' admissions reference',url,sourceDataset:'seatmap',evidenceLabel:'Imported institute reference',exactDocumentLink:references.every(reference=>reference.status==='supplied_document_or_page_url'),notes:references.filter(reference=>reference.status!=='supplied_document_or_page_url').map(reference=>reference.rawReference).join(' | ')});
}
const degrees=data.degrees.map((label,index)=>{
 const any=Object.entries(data.anyDegree).find(([prefix])=>label.startsWith(prefix));
 return {code:String(index),index,ccmtCode:label.match(/\(([^()]*)\)\s*$/)?.[1]||null,label,level:any?.[0]||label.split(' in ')[0].trim(),anyDegreeCode:any?String(any[1]):null,isAnyDegree:Object.values(data.anyDegree).includes(index)};
});
const programmeEntries=data.programs.map((programme,index)=>({programme,index})).filter(({programme})=>programme.inst.trim()&&programme.icode&&programme.pcode&&programme.group);
const programmes=programmeEntries.map(({programme,index})=>{
 const programmeKey=`seatmap:ccmt:${programme.icode}:${programme.pcode}:g${programme.group}`;
 const ruleGroups=Object.entries(programme.elig).map(([paper,acceptedIndices])=>{
  const exactIndices=new Set(acceptedIndices);
  const allowAnyDegreeLevels=[];
  for(const [prefix,anyIndex] of Object.entries(data.anyDegree))if(exactIndices.has(anyIndex)){
   allowAnyDegreeLevels.push(prefix);
   degrees.forEach(degree=>{if(degree.label.startsWith(prefix))exactIndices.add(degree.index);});
  }
  return {paper,degreeCodes:[...exactIndices].sort((a,b)=>a-b).map(String),suppliedDegreeCodes:acceptedIndices.map(String),allowAnyDegreeLevels};
 });
 return {id:programmeKey,programmeKey,sourceRecordIndex:index,instituteId:'ccmt:'+programme.icode,institute:programme.inst,instituteCode:programme.icode,instituteType:programme.type,programme:programme.prog,programmeCode:programme.pcode,department:programme.dept,meritGroup:programme.group,branch:programme.field,branchLabel:Object.fromEntries(data.fields)[programme.field]||programme.field,seats:programme.seats,seatsYear:2026,eligibility:{ruleYear:2026,ruleGroups,notes:'2026 mapping only; historical/current acceptance must be checked. Related-degree text is not an exact eligibility rule.'}};
});
const opportunities=[];
for(const normalized of programmes){
 const index=normalized.sourceRecordIndex,programme=data.programs[index];
 for(const year of new Set(['2026',...Object.keys(programme.cut)])){
  const categories=programme.cut[year]||{};
  const categoryKeys=new Set(Object.keys(categories));
  if(year==='2026')Object.keys(programme.seats).forEach(category=>categoryKeys.add(category));
  for(const category of categoryKeys){
   const series=categories[category]||Array(6).fill(null);
   const rounds=series.flatMap((pair,order)=>pair===null?[]:[{round:roundCodes[order],roundLabel:data.rounds[order],opening:pair[0],closing:pair[1],order,sourceId:'seatmap-ccmt-index',sourceUrl:officialCcmt}]);
   const last=rounds.at(-1)||null;
   opportunities.push({
    id:`${normalized.programmeKey}:${year}:${categoryMap[category]||category}`,programmeKey:normalized.programmeKey,
    instituteId:normalized.instituteId,institute:normalized.institute,instituteType:normalized.instituteType,instituteCode:programme.icode,
    programme:normalized.programme,programmeCode:programme.pcode,department:programme.dept,meritGroup:programme.group,
    branch:programme.field,branchLabel:normalized.branchLabel,paper:'',category:categoryMap[category]||category,sourceCategory:category,year:Number(year),round:last?.round||null,
    rounds,closingScore:last?.closing??null,openingScore:last?.opening??null,
    roundSelection:'Chronologically last supplied round: NSR, SR2, SR1, R3, R2, then R1.',
    seats:year==='2026'?(programme.seats[category]??null):null,seatsYear:2026,
    metric:'gate_score',sourceDataset:'seatmap',sourceId:'seatmap-ccmt-index',sourceUrl:officialCcmt,sourcePage:null,
    evidenceLabel:'Imported CCMT reference',cutoffType:'CCMT round opening / closing GATE score',evidenceKind:'ccmt_round_cutoff',eligibility:normalized.eligibility,
    sourceRecordLocator:`window.DATA.programs[${index}].cut[${JSON.stringify(year)}][${JSON.stringify(category)}]`,sourceBuiltAt:data.built,
    originalEvidenceReverified:false
   });
  }
 }
}
for(const [collectionName,collection] of [['iit',data.iit],['other',data.other]])for(const [index,record] of collection.entries()){
 const source=sourceReferences.get(collectionName+':'+index);
 assert(source,'Missing source mapping');
 const context=record.cutoff_type+' '+record.admission_route;
 const metric=/\b(?:raw\s+)?marks?\b/i.test(context)?'raw_marks':/\b(?:AIR|rank)\b/i.test(record.cutoff_type)?'air':'gate_score';
 const acceptedPapers=/any gate paper/i.test(record.gate_papers)?[]:record.gate_papers.split(/[,/]/).map(value=>value.trim()).filter(Boolean);
 const programmeKey=`seatmap:${collectionName}:${hash([record.iit,record.degree,record.program,record.admission_route,record.gate_papers,record.cutoff_type].join('|'))}`;
 for(const category of ['GEN','EWS','OBC_NCL','SC','ST','PwD']){
  const rawValue=record[category];if(rawValue===undefined||String(rawValue).trim()==='')continue;
  const value=number(rawValue);
  const evidenceKind=/skips|waiv/i.test(record.cutoff_type)?'test_waiver_threshold':/shortlist/i.test(record.cutoff_type)?'shortlisting_threshold':/eligibility|minimum.*apply/i.test(record.cutoff_type)?'application_minimum':/last|final|closing|offer|admitted|COAP/i.test(record.cutoff_type)?'offer_or_closing_reference':'supplied_threshold';
  opportunities.push({
   id:`seatmap:${collectionName}:${index}:${categoryMap[category]||category}`,programmeKey,
   instituteId:'seatmap-institute-'+hash(record.iit),institute:record.iit,instituteType:collectionName==='iit'?'IIT':record.iit.startsWith('IISc')?'IISc':'IIIT',programme:record.program,degree:record.degree,department:record.department,branch:record.department,paper:record.gate_papers,acceptedPapers,acceptsAnyGatePaper:/any gate paper/i.test(record.gate_papers),
   category:categoryMap[category]||category,sourceCategory:category,year:yearValue(record.year),sourceYear:record.year,
   round:record.cutoff_type,rounds:value===null?[]:[{round:record.cutoff_type,opening:null,closing:value,order:0,sourceId:sourceIdFor(source.url),sourceUrl:source.url}],closingScore:value,openingScore:null,
   seats:null,seatsYear:null,metric,sourceDataset:'seatmap',sourceId:sourceIdFor(source.url),sourceUrl:source.url,sourcePage:null,evidenceLabel:'Imported institute reference',
   cutoffType:record.cutoff_type,evidenceKind,admissionRoute:record.admission_route,qualifyingDegree:record.qualifying_degree,notes:record.notes,rawValue,
   sourceReference:record.source_url,sourceLinkStatus:source.status,
   eligibility:{ruleYear:yearValue(record.year),ruleGroups:acceptedPapers.map(paper=>({paper,degreeCodes:[],allowAnyDegreeLevels:[]})),unstructuredQualification:true,allowAnyGatePaper:/any gate paper/i.test(record.gate_papers),notes:'Exact degree acceptance is unstructured in this compilation; check the linked original notice. Supplied qualification: '+record.qualifying_degree},
   sourceRecordLocator:`window.DATA.${collectionName}[${index}].${category}`,sourceBuiltAt:data.built,originalEvidenceReverified:false
  });
 }
}
const normalized={
 id:'seatmap-atlas-v1',sourceDataset:'seatmap',sourceName:'GATE Seat Map',sourceUrl:manifest.sourceUrl,sourceBuiltAt:data.built,repositoryCommit:manifest.repositoryCommit,
 attribution:manifest.attribution,importLimitations:manifest.limitations,anomalies:manifest.anomalies,
 degrees,papers:data.papers.map(([code,label])=>({code,label})),paperOptions:data.papers.map(([code,label])=>({code,label})),categories:data.cats.map(code=>({code:categoryMap[code]||code,label:code})),branches:data.fields.map(([code,label])=>({code,label})),
 programmes,opportunities,sources,
 counts:{opportunities:opportunities.length,ccmtOpportunityRows:opportunities.filter(row=>row.evidenceKind==='ccmt_round_cutoff').length,numericOpportunityRows:opportunities.filter(row=>row.closingScore!==null).length,roundRecords:opportunities.reduce((n,row)=>n+row.rounds.length,0),programmeGroups:programmes.length,ccmtInstitutes:new Set(programmes.map(row=>row.instituteCode)).size,seatsIn2026Matrix:programmes.reduce((n,row)=>n+Object.values(row.seats).reduce((s,v)=>s+v,0),0),aggregateRowsExcluded:data.programs.length-programmes.length,degrees:degrees.length,sources:sources.length},
 caveats:[
  'All cutoff values retain their metric and source-stage type. An application minimum, shortlist threshold, test-waiver threshold and closing score are different evidence.',
  '2026 degree eligibility and seats must not be presented as historical or future cycle eligibility.',
  'Chronologically last available round is used for the summary. The source UI prefers SR2 before NSR; that different choice is retained in import notes.',
  'Empty accepted-degree lists in non-CCMT records mean exact degree acceptance needs review; they never mean any degree.',
  'Related-degree matches are not expanded. Only explicit same-level any-discipline wildcards are expanded into accepted degree codes.'
 ]
};
assert.equal(new Set(opportunities.map(row=>row.id)).size,opportunities.length);
assert.equal(programmes.length,842);assert.equal(degrees.length,530);
assert.equal(normalized.counts.seatsIn2026Matrix,13759);
assert.equal(opportunities.filter(row=>row.evidenceKind==='ccmt_round_cutoff'&&row.year===2026).length,8420);
assert.equal(opportunities.filter(row=>row.evidenceKind==='ccmt_round_cutoff').reduce((n,row)=>n+row.rounds.length,0),34433);
for(const row of opportunities){
 if(row.evidenceKind==='ccmt_round_cutoff'){
  assert(row.year===2026||row.seats===null);
  assert.equal(row.closingScore,row.rounds.at(-1)?.closing??null);
 }
}
const ece=degrees.find(degree=>degree.ccmtCode==='T135');assert.equal(ece.code,'178');
for(const programme of programmes)for(const group of programme.eligibility.ruleGroups){
 const original=data.programs[programme.sourceRecordIndex].elig[group.paper];
 for(const code of group.degreeCodes)assert(original.includes(Number(code))||Object.entries(data.anyDegree).some(([prefix,index])=>original.includes(index)&&degrees[Number(code)].label.startsWith(prefix)));
}
// JSON has no shared references. Store each rule only once, then hydrate rows
// to the same object at runtime rather than serializing it for every year/category.
normalized.format='seatmap-atlas-compact-v1';
normalized.eligibilityRules={};
for(const programme of programmes){
 normalized.eligibilityRules[programme.programmeKey]=programme.eligibility;
 programme.eligibilityRef=programme.programmeKey;delete programme.eligibility;
}
for(const row of opportunities)if(row.evidenceKind==='ccmt_round_cutoff'){
 row.eligibilityRef=row.programmeKey;delete row.eligibility;
 assert(normalized.eligibilityRules[row.eligibilityRef]);
 // Parent-level evidence applies to all rounds unless explicitly overridden.
 for(const round of row.rounds){
  if(round.sourceId===row.sourceId)delete round.sourceId;
  if(round.sourceUrl===row.sourceUrl)delete round.sourceUrl;
  delete round.roundLabel;
 }
 row.sourceProgrammeIndex=Number(row.sourceRecordLocator.match(/programs\[(\d+)\]/)[1]);
 delete row.sourceRecordLocator;
 delete row.roundSelection;delete row.sourceBuiltAt;delete row.originalEvidenceReverified;delete row.cutoffType;
}
normalized.eligibilityStorage='Resolve each eligibilityRef through eligibilityRules once at runtime. Preserve shared object references; do not expand the same rule into serialized rows.';
normalized.ccmtCommon={roundSelection:'Chronologically last supplied round: NSR, SR2, SR1, R3, R2, then R1.',cutoffType:'CCMT round opening / closing GATE score',sourceBuiltAt:data.built,originalEvidenceReverified:false,roundNames:Object.fromEntries(roundCodes.map((code,index)=>[code,data.rounds[index]])),roundSourceInheritance:'A round uses its parent opportunity sourceId/sourceUrl unless it provides its own.'};
await writeFile(resolve(directory,'normalized.json'),JSON.stringify(normalized)+'\n');
console.log(JSON.stringify({file:'research/imported/seatmap/normalized.json',counts:normalized.counts,degreeExample:ece,categoryMap},null,2));
