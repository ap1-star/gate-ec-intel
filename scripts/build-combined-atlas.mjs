/** Offline, reproducible merge. Acquisition is explicit and separate from production builds. */
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {PROGRAMME_RECORDS} from '../src/domains/career/index.mjs';
const root=resolve(import.meta.dirname,'..'),read=async file=>JSON.parse(await readFile(resolve(root,file),'utf8'));
// Keep unnecessary public commenter identities out of Git/source downloads as well as UI data.
try{
 const bytes=await readFile(resolve(root,'research/imported/scoreline/raw/data/youtube.json'),'utf8'),video=JSON.parse(bytes);
 const publicVideo={...video,comments:[],excludedViewerCommentCount:video.comments?.length||0,publicationTransform:'Comment author/text records removed; evidence rows unchanged.',originalAssetSha256:createHash('sha256').update(bytes).digest('hex')};
 await writeFile(resolve(root,'research/imported/scoreline/raw/data/youtube-public.json'),JSON.stringify(publicVideo));
}catch(error){if(error.code!=='ENOENT')throw error;}
for(const file of ['normalize-seatmap.mjs','normalize-scoreline-evidence.mjs']){
 const result=spawnSync(process.execPath,[resolve(root,'scripts',file)],{encoding:'utf8'});if(result.status!==0)throw Error('Offline normalization failed: '+file+' '+(result.stderr||result.stdout).slice(-3000));
}
const sm=await read('research/imported/seatmap/normalized.json'),sl=await read('research/imported/scoreline/normalized-evidence.json');
const ccmt=await read('research/imported/scoreline/raw/data/ccmt.json'),coap=await read('research/imported/scoreline/raw/data/coap.json');
const smManifest=await read('research/imported/seatmap/manifest.json'),slManifest=await read('research/imported/scoreline/manifest.json');
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const norm=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'');
const safeUrl=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}};
const num=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const category=value=>({OPEN:'GEN',UR:'GEN',GN:'GEN',GENERAL:'GEN',EWS:'GEN_EWS',OBC:'OBC_NCL','OBC-NCL':'OBC_NCL','OBC_NCL':'OBC_NCL','OPEN-PWD':'GEN_PWD','OBC-PWD':'OBC_NCL_PWD','OBC-NCL-PWD':'OBC_NCL_PWD','EWS-PWD':'GEN_EWS_PWD','SC-PWD':'SC_PWD','ST-PWD':'ST_PWD',PWBD:'PWD',PWD:'PWD'}[String(value).toUpperCase()]||String(value));
const sources=new Map(),sourceAliases=new Map();
function registerSource(source,namespace='source'){
 const url=safeUrl(source.url||source.sourceUrl),originalUrl=safeUrl(source.originalUrl);
 const key=JSON.stringify([url,source.file||'',source.page??null,source.title||'',source.kind||'']);
 const id='atlas-src-'+hash(key).slice(0,20);
 if(source.id)sourceAliases.set(source.id,id);
 if(!sources.has(id))sources.set(id,{...source,id,url,originalUrl,sourceDataset:source.sourceDataset||namespace,independentReview:false});
 return id;
}
for(const source of [...(sm.sources||[]),...(sl.sources||[])])registerSource(source);
const sourceCache=new WeakMap();
function scoreLineSource(raw={}){
 if(sourceCache.has(raw))return sourceCache.get(raw);
 const file=typeof raw.f==='string'&&!raw.f.split('/').includes('..')?raw.f:null;
 const url=file?'https://score-line.pages.dev/files/'+file.split('/').map(encodeURIComponent).join('/')+(raw.p?'#page='+raw.p:''):safeUrl(raw.u);
 const id=registerSource({title:raw.l||file?.split('/').at(-1)||'Source reference; direct document not supplied',url,originalUrl:raw.u||null,file,page:raw.p??null,kind:raw.k||'imported',notes:url?'Imported source reference; not independently re-audited.':'Upstream did not publish a direct source link.'},'scoreline');
 const result={sourceId:id,sourceUrl:url,sourcePage:raw.p??null,evidenceLabel:'Imported '+(raw.k||'source')+' reference'};sourceCache.set(raw,result);return result;
}
const compactRound=r=>({round:r.round,opening:num(r.opening??r.openingScore),closing:num(r.closing??r.closingScore),order:r.order??r.roundOrder??0,...(r.sourceId?{sourceId:sourceAliases.get(r.sourceId)||r.sourceId}:{})});
function remap(row){const result={...row};if(result.group===undefined&&result.meritGroup!==undefined)result.group=result.meritGroup;if(result.sourceId)result.sourceId=sourceAliases.get(result.sourceId)||result.sourceId;if(result.sourceUrl)result.sourceUrl=safeUrl(result.sourceUrl);if(result.rounds)result.rounds=result.rounds.map(compactRound);if(result.year!==undefined&&result.season===undefined&&typeof result.year==='string'&&result.year.includes('-'))result.season=result.year;if(result.note&&!result.notes)result.notes=result.note;return result;}
const opportunities=(sm.opportunities||[]).map(remap),eligibilityRules=sm.eligibilityRules||{};
for(const rule of Object.values(eligibilityRules))for(const group of rule.ruleGroups||[])if(!group.papers&&group.paper)group.papers=[group.paper];
for(const row of opportunities)if(row.eligibilityRef)row.papers=[...new Set((eligibilityRules[row.eligibilityRef]?.ruleGroups||[]).flatMap(group=>group.papers||[]))];
const smKeys=new Map(),instNames=new Map();
for(const row of opportunities){
 if(row.sourceDataset!=='seatmap'||row.admissionRoute&&row.admissionRoute!=='CCMT')continue;
 if(row.group===undefined&&!(row.programmeKey||'').includes('ccmt'))continue;
 const key=[norm(row.institute),norm(row.programme),String(row.group??'1'),row.year,category(row.category)].join('|');
 if(!smKeys.has(key))smKeys.set(key,[]);smKeys.get(key).push(row);instNames.set(norm(row.institute),row.institute);
}
const groups=new Map();
for(const [index,packed] of ccmt.rows.entries()){
 const [year,roundIndex,order,instIndex,progIndex,group,catIndex,opening,closing,srcIndex]=packed;
 const institution=ccmt.inst[instIndex],programme=ccmt.prog[progIndex],cat=category(ccmt.cat[catIndex]);
 const programmeKey='ccmt:'+norm(institution.name)+':'+norm(programme)+':'+group;
 const key=[instIndex,progIndex,String(group),year,catIndex].join('|');
 const source=scoreLineSource(ccmt.src[srcIndex]);
 if(!groups.has(key))groups.set(key,{id:'sl-ccmt-'+hash(key).slice(0,18),programmeKey,instituteId:'ccmt-name-'+hash(institution.name).slice(0,12),institute:instNames.get(norm(institution.name))||institution.name,programme,branch:ccmt.families[ccmt.progFam[progIndex]]?.[0]||'other',branchLabel:ccmt.families[ccmt.progFam[progIndex]]?.[1]||'Other programmes',paper:'',category:cat,sourceCategory:ccmt.cat[catIndex],year,group:String(group),metric:'gate_score',sourceDataset:'scoreline',sourceDatasets:['scoreline'],...source,stage:'CCMT published round scores',seats:null,seatsYear:null,rounds:[],evidence:[],rawObservationCount:0});
 const row=groups.get(key);row.rounds.push({round:ccmt.round[roundIndex],order,opening:num(opening),closing:num(closing),sourceId:source.sourceId});row.rawObservationCount++;
 if(!row.evidence.some(x=>x.sourceId===source.sourceId))row.evidence.push(source);
}
let mergedGroups=0,conflictingGroups=0,duplicateRoundObservations=0,sameSourceDuplicateRounds=0;
const roundKey=value=>norm(value).replace('specialround','sr').replace('nationalspotround','nsr').replace('round','r');
for(const row of groups.values()){
 const seen=new Set();row.rounds=row.rounds.filter(round=>{const key=JSON.stringify([roundKey(round.round),round.opening,round.closing]);if(seen.has(key)){sameSourceDuplicateRounds++;return false;}seen.add(key);return true;});
}
const scoreLineMatchCounts=new Map();
const matchKey=row=>[norm(row.institute),norm(row.programme),String(row.group??'1'),row.year,category(row.category)].join('|');
for(const row of groups.values())scoreLineMatchCounts.set(matchKey(row),(scoreLineMatchCounts.get(matchKey(row))||0)+1);
for(const row of groups.values()){
 const key=matchKey(row),matches=smKeys.get(key)||[],existing=matches.length===1&&scoreLineMatchCounts.get(key)===1?matches[0]:null;
 const overlapping=existing?row.rounds.map(r=>[r,(existing.rounds||[]).find(x=>roundKey(x.round)===roundKey(r.round))]).filter(([,r])=>r):[];
 const conflicts=overlapping.some(([a,b])=>a.opening!==b.opening||a.closing!==b.closing);
 if(existing&&!conflicts&&overlapping.length){
  duplicateRoundObservations+=overlapping.length;mergedGroups++;
  existing.sourceDatasets=['seatmap','scoreline'];existing.sourceDataset='combined';existing.evidence=[...(existing.evidence||[]),...row.evidence];existing.rawObservationCount=(existing.rounds?.length||0)+row.rawObservationCount;
  for(const round of row.rounds)if(!existing.rounds.some(r=>roundKey(r.round)===roundKey(round.round)))existing.rounds.push(round);
  existing.rounds.sort((a,b)=>a.order-b.order);
  const last=existing.rounds.filter(x=>x.closing!==null).at(-1);if(last){existing.round=last.round;existing.closingScore=last.closing;existing.openingScore=last.opening;}
 }else{
  row.rounds.sort((a,b)=>a.order-b.order);const last=row.rounds.filter(x=>x.closing!==null).at(-1);
  row.round=last?.round||'No numeric closing score';row.closingScore=last?.closing??null;row.openingScore=last?.opening??null;
  if(existing){row.eligibilityRef=existing.eligibilityRef;row.conflict=conflicts;existing.conflict=conflicts;if(conflicts){conflictingGroups++;row.notes='Imported websites disagree on at least one overlapping round. Both records are retained.';}}
  opportunities.push(row);
 }
}
const directories=[await read('research/imported/scoreline/raw/data/options.json'),await read('research/imported/scoreline/raw/data/compare.json')];
const instituteNames=new Map();for(const d of directories)for(const item of Array.isArray(d.inst)?d.inst:Object.values(d.inst||{}))if(item&&typeof item==='object'&&item.code&&!instituteNames.has(item.code))instituteNames.set(item.code,item.name||item.short||item.code);
const paperCodes=new Set((sm.paperOptions||[]).map(p=>typeof p==='string'?p:p.code));
for(const [index,packed] of coap.rows.entries()){
 const [year,inst,dept,prog,paper,cat,stage,type,value,maximum,round,note,src,fam]=packed;
 const metric=coap.type[type],paperText=coap.paper[paper]||'',papers=paperText.split(/[^A-Z]+/).filter(p=>paperCodes.has(p));
 const programmeKey='coap:'+coap.inst[inst]+':'+norm(coap.prog[prog])+':'+norm(paperText)+':'+coap.stage[stage];
 opportunities.push({id:'sl-coap-'+index,programmeKey,instituteId:coap.inst[inst],institute:instituteNames.get(coap.inst[inst])||coap.inst[inst],programme:coap.prog[prog],department:coap.dept[dept],branch:coap.families[fam]?.[1]||'Not grouped',paper:paperText,papers,category:category(coap.cat[cat]),sourceCategory:coap.cat[cat],year,round:round||coap.stage[stage],stage:coap.stage[stage],metric,maximum:num(maximum),closingScore:num(value),openingScore:null,seats:null,seatsYear:null,sourceDataset:'scoreline',sourceDatasets:['scoreline'],...scoreLineSource(coap.src[src]),notes:coap.note[note]||'',eligibility:{papers,ruleYear:year,notes:'Source GATE paper is preserved; the exact qualifying degree is not independently established.'},rounds:[]});
}
for(const record of PROGRAMME_RECORDS)opportunities.push({id:'original-'+record.id,programmeKey:'original:'+record.institute+':'+record.programme,instituteId:record.institute,institute:record.instituteName,programme:record.programme,category:record.category,year:record.year,paper:record.ecPaperAccepted===true?'EC':'',branch:'Original reference',metric:record.metric,round:record.stage,stage:record.stage,closingScore:record.cutoff,openingScore:record.range?.[1]??null,seats:null,sourceDataset:'original-terminal',sourceDatasets:['original-terminal'],sourceId:registerSource({title:record.sourceFilename||record.cutoffType,url:record.sourceUrl,page:record.sourcePage,kind:'original-reference',notes:record.note||record.eligibilityNote},'original-terminal'),sourceUrl:record.sourceUrl,sourcePage:record.sourcePage,evidenceLabel:'Original supplied reference; independent review not claimed',notes:record.eligibilityNote,rounds:[],eligibility:{papers:record.ecPaperAccepted===true?['EC']:[],notes:record.eligibilityNote}});
for(const row of opportunities){row.category=category(row.category);row.advertStatus='historical_reference';if(row.sourceId)row.sourceId=sourceAliases.get(row.sourceId)||row.sourceId;}
const counts={opportunities:opportunities.length,programmeKeys:new Set(opportunities.map(r=>r.programmeKey)).size,institutes:new Set(opportunities.map(r=>norm(r.institute))).size,placements:sl.placements.length,companies:sl.companies.length,companyNames:new Set(sl.companies.map(r=>r.companyId||r.name)).size,gateReports:sl.gateReports.length,psuRecords:sl.psuRecords.length,bitsOffers:sl.bitsOffers.length,sourceEntries:sources.size,rawCcmtObservations:ccmt.rows.length,rawCoapObservations:coap.rows.length,seatMapRoundObservations:34433,mergedGroups,conflictingGroups,duplicateRoundObservations,sameSourceDuplicateRounds,seatMapProgrammeGroups:sm.counts?.programmeGroups??842,seatMap2026Seats:13759};
const importedAt=slManifest.acquiredAt||'2026-11-16T00:00:00Z',version='combined-'+hash([slManifest,smManifest,await readFile(import.meta.filename,'utf8'),await readFile(resolve(root,'scripts/normalize-seatmap.mjs'),'utf8'),await readFile(resolve(root,'scripts/normalize-scoreline-evidence.mjs'),'utf8')]).slice(0,16);
const sections={opportunities,placements:sl.placements.map(remap),companies:sl.companies.map(remap),gateReports:sl.gateReports.map(remap),psuRecords:sl.psuRecords.map(remap),bitsOffers:sl.bitsOffers.map(remap)};
const families=coap.families.map(([code,label])=>({code,label})),familyCodes=new Set(families.map(row=>row.code)),familyLabels=new Map(families.map(row=>[row.label,row.code]));
for(const key of ['opportunities','placements','companies'])for(const row of sections[key]){
 row.branchLabel=row.branchLabel||row.branch;
 row.branch=familyCodes.has(row.family)?row.family:familyCodes.has(row.branch)?row.branch:familyLabels.get(row.branch)||'other';
 if(row.level){row.rawLevel=row.level;row.level=/^M[.\s-]*Tech/i.test(row.level)?'MTech':/^B[.\s-]*Tech/i.test(row.level)?'BTech':/^(UG\d|PG\d|PG-INT\d)$/.test(row.level)?row.level:/dual/i.test(row.level)?'Dual degree':/^(MSc|MBA|PhD|MS\(R\)|BArch|MA|All)$/.test(row.level)?row.level:'Other source-defined scope';}
}
for(const rows of Object.values(sections))for(const row of rows)if(!row.unit&&row.metric)row.unit=({gate_score:'GATE score / 1000',gate_marks_normalized:'Normalized GATE marks / 100',rank:'Source rank',merit_rank:'Source merit rank',hd_marks:'BITS HD marks'}[row.metric]||row.measureLabel||row.metric);
const assets={opportunities:[],placements:'career-atlas-placements.json',companies:'career-atlas-companies.json',gateReports:'career-atlas-gate-reports.json',psuRecords:'career-atlas-psu-evidence.json',bitsOffers:'career-atlas-bits-offers.json'};
const out=resolve(root,'dist');await mkdir(out,{recursive:true});
for(const dir of ['dist','public'])await unlink(resolve(root,dir,'career-atlas-opportunities.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
const manifest={counts,sources:[{id:'scoreline',name:'Score Line',url:'https://score-line.pages.dev/',license:'No public reuse license declared; imported at the site owner’s explicit request.'},{id:'seatmap',name:'GATE Seat Map',url:'https://giri256.github.io/gate-seat-map/',license:'No repository license declared; imported at the site owner’s explicit request.'},{id:'original-terminal',name:'Original terminal reference corpus',url:'https://gate-ec-research-terminal.precioussky4.chatgpt.site/'}],limitations:['Imported snapshots, not live counselling or vacancy feeds.','No independent document-by-document re-audit is claimed.','Overlapping conflicting records are retained. Exact matching only; unmatched equivalent names can remain separate.','Seat Map degree and seat rules are scoped to 2026, including when attached to older cutoff rows.','NIRF programme-level outcomes, branch-level placements and video observations are distinct.','Company offers must not be added across documents that can repeat the same cohort.','BITS aggregate ranges are candidate-reported; iteration 0 overlaps reported rounds.','The upstream Seat Map older-year row-count metadata differs from its available object. Actual parsed counts are used.'],acquisition:{scoreline:slManifest.acquiredAt,seatmap:smManifest.acquiredAt||smManifest.acquired_at},excluded:{viewerComments:136,reason:'Personal handles and unverified freeform comments are not republished.'}};
for(let start=0;start<opportunities.length;start+=8000){const file='career-atlas-opportunities-'+String(start/8000)+'.json';assets.opportunities.push(file);await writeFile(resolve(out,file),JSON.stringify({version,opportunities:opportunities.slice(start,start+8000)}));}
await writeFile(resolve(out,'career-atlas.json'),JSON.stringify({version,importedAt,manifest,counts,families,degrees:sm.degrees,paperOptions:sm.paperOptions,eligibilityRules,assets,sources:[...sources.values()]}));
for(const [key,rows] of Object.entries(sections))if(key!=='opportunities')await writeFile(resolve(out,assets[key]),JSON.stringify({version,[key]:rows,...(key==='gateReports'?{gateAuxiliary:sl.gateAuxiliary||{}}:{})}));
for(const [key,rows] of Object.entries(sections)){if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Duplicate canonical IDs: '+key);if(rows.some(row=>row.sourceId&&!sources.has(row.sourceId)))throw Error('Unresolved source reference: '+key);}
const report={version,importedAt,counts,assets,files:await Promise.all(['career-atlas.json',...Object.values(assets).flat()].map(async file=>{const bytes=await readFile(resolve(out,file));if(bytes.length>24*1024*1024)throw Error('Split this public asset before hosting: '+file);return {file,bytes:bytes.length,sha256:hash(bytes.toString())};}))};
await writeFile(resolve(root,'research/COMBINED_ATLAS_REPORT.json'),JSON.stringify(report,null,2)+'\n');
console.log('Combined evidence atlas: '+JSON.stringify(counts));
