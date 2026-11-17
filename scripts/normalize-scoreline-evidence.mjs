/** Decode only acquired public Score Line evidence. Nulls, units and source stages survive. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),directory=resolve(root,'research/imported/scoreline');
const load=async name=>JSON.parse(await readFile(resolve(directory,'raw/data/'+(name==='youtube'?'youtube-public':name)+'.json'),'utf8'));
const names=['placements','nirf','youtube','companies','gate','gate-extra','psu','bits','compare','sources'];
const d=Object.fromEntries(await Promise.all(names.map(async name=>[name,await load(name)])));
const manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));
const sources=new Map(),digest=value=>createHash('sha256').update(value).digest('hex').slice(0,20);
const finite=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const optionalNumber=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const dictionary=(values,index)=>Number.isInteger(index)&&index>=0&&index<values.length?values[index]:null;
const fileUrl=file=>file?'https://score-line.pages.dev/files/'+file.split('/').map(encodeURIComponent).join('/'):null;
const originalUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
const labels={official:'Official source indexed by Score Line',RTI:'RTI reply indexed by Score Line',rti:'RTI reply indexed by Score Line',nirf:'NIRF programme-level submission; not branch-specific',youtube:'Video-extracted evidence; not institute-verified',video:'Video-extracted evidence; not institute-verified',gate:'Official GATE report indexed by Score Line',reported:'Candidate-reported aggregate; not official cutoff',aggregator:'Aggregator reference; not official verification',comment:'Viewer-reported comment; unverified'};
function source(value={},context={}){
 const kind=value.k||context.kind||'unknown',file=value.f||null,page=value.p??context.page??null;
 const original=originalUrl(value.u),video=value.yt?'https://www.youtube.com/watch?v='+encodeURIComponent(value.yt)+(value.t!=null?'&t='+Math.max(0,Math.floor(value.t))+'s':''):null;
 const target=fileUrl(file)||original||video||'https://score-line.pages.dev/'+(context.route||'sources')+'/';
 const url=page&&file?target+'#page='+page:target;
 const id='SL-src-'+digest(JSON.stringify([kind,file,original,value.yt||null,value.t??null,page,file||original||value.yt?null:value.l||context.title||context.dataset||'unspecified']));
 if(!sources.has(id))sources.set(id,{id,title:value.l||context.title||file||'Score Line '+(context.dataset||'public evidence'),url,originalUrl:original,kind,file,page,notes:value.note||context.notes||null,upstreamProject:'Score Line',sourceDataset:'scoreline'});
 return {sourceId:id,sourceUrl:url,sourcePage:page,evidenceLabel:labels[kind]||String(kind)+' evidence indexed by Score Line'};
}
const institute=code=>d.compare.inst[code]?.name||d.compare.inst[code]?.short||String(code||'Institute not supplied');
const programme={MTech:'M.Tech',BTech:'B.Tech',DualDegree:'Dual degree',MS:'MS (Research)',MSc:'M.Sc',MBA:'MBA',MCA:'MCA',PhD:'PhD',MA:'MA',MDes:'M.Des',BDes:'B.Des',BArch:'B.Arch',MArch:'M.Arch',MPlan:'M.Plan',All:'Not split by programme'};
const result={schemaVersion:1,sourceProject:'Score Line',acquiredAt:manifest.acquiredAt,attributionUrl:'https://score-line.pages.dev/about/',placements:[],companies:[],sources:[],gateReports:[],gateAuxiliary:{},psuRecords:[],bitsOffers:[],metadata:{privacy:'Individual applicant identities are not included. Public video-comment author handles and freeform comments are deliberately excluded.',aggregation:'Never sum offers across potentially overlapping documents. BITS iteration 0 is an aggregate and overlaps iteration-specific rows.'}};

// 6,447 branch/programme rows. A pay observation remains distinct from its count metrics.
d.placements.rows.forEach((row,index)=>{
 const record=Object.fromEntries(d.placements.cols.map((name,i)=>[name,row[i]]));
 const evidence=source(dictionary(d.placements.src,record.src)||{},{dataset:'placements',route:'placements'});
 const median=finite(record.median),average=finite(record.average),highest=finite(record.highest);
 const metric=median!==null?'median_ctc':average!==null?'average_ctc':highest!==null?'highest_ctc':'placement_counts';
 result.placements.push({id:'SL-placement-'+index,instituteId:record.inst,institute:institute(record.inst),programme:programme[record.program]||record.program,branch:[dictionary(d.placements.dept,record.dept),record.spec].filter(Boolean).join(' · '),year:record.season,metric,value:median??average??highest,unit:metric==='placement_counts'?'count':'LPA',...evidence,sourceDataset:'scoreline',sourceTable:'placements',registered:finite(record.registered),eligible:finite(record.eligible),placed:finite(record.placed),offers:finite(record.offers),pct:finite(record.pct),highestLpa:highest,averageLpa:average,medianLpa:median,lowestLpa:finite(record.lowest),companyCount:finite(record.companies),ppo:finite(record.ppo),international:finite(record.intl),note:dictionary(d.placements.note,record.note),level:record.program,sourceType:record.srcType,family:dictionary(d.placements.families,record.fam)?.[0]??null});
});
// NIRF rows describe the submitted programme level, which must not be recast as a branch statistic.
d.nirf.rows.forEach((row,index)=>{
 const record=Object.fromEntries(d.nirf.cols.map((name,i)=>[name,row[i]]));
 const evidence=source(dictionary(d.nirf.src,record.src)||{},{dataset:'nirf',route:'placements'});
 result.placements.push({id:'SL-nirf-'+index,instituteId:record.inst,institute:institute(record.inst),programme:record.level,branch:'Institution-wide '+record.level+' submission',year:record.gradYear||record.edition,metric:finite(record.medianLpa)!==null?'median_ctc':'placement_counts',value:finite(record.medianLpa),unit:finite(record.medianLpa)!==null?'LPA':'count',...evidence,sourceDataset:'scoreline',sourceTable:'nirf',registered:null,placed:finite(record.placed),offers:null,pct:finite(record.pct),highestLpa:null,averageLpa:null,medianLpa:finite(record.medianLpa),note:'NIRF edition '+record.edition+'; programme level '+record.level+'. Branch-specific M.Tech outcomes cannot be inferred.',level:record.level,edition:record.edition,admissionYear:record.admYear,graduationYear:record.gradYear,intake:finite(record.intake),admitted:finite(record.admitted),lateral:finite(record.lateral),graduating:finite(record.graduating),higherStudies:finite(record.higher),latest:record.latest===1});
});
// Video rows remain video evidence; comments are excluded because their authors/text are unnecessary.
const videos=new Map(d.youtube.videos.map(video=>[video.id,video]));
d.youtube.rows.forEach((row,index)=>{
 const record=Object.fromEntries(d.youtube.cols.map((name,i)=>[name,row[i]])),video=videos.get(record.video);
 const evidence=source({k:'youtube',yt:record.video,t:record.t,l:video?.title||'Placement video'},{dataset:'youtube',route:'placements'});
 const ctc=finite(record.ctc),metric=ctc!==null?'reported_ctc':record.metric||'video_observation';
 result.placements.push({id:'SL-video-'+(record.row||index),instituteId:record.code,institute:record.inst||institute(record.code),programme:record.program,branch:record.dept||'',year:record.season,metric,value:ctc??optionalNumber(record.value),unit:ctc!==null?'LPA':['students_placed','placed','offers','batch_size','students','registered','eligible'].includes(metric)?'count':/percent|percentage|pct/.test(metric)?'%':'source-defined',...evidence,sourceDataset:'scoreline',sourceTable:'youtube',registered:null,placed:['students_placed','placed'].includes(metric)?optionalNumber(record.value):null,offers:finite(record.offers),pct:/percent|percentage|pct/.test(metric)?optionalNumber(record.value):null,highestLpa:null,averageLpa:null,medianLpa:null,ctcLpa:ctc,baseLpa:finite(record.base),company:record.company||null,role:record.role||null,note:record.notes||null,level:record.program,videoId:record.video,timestampSeconds:record.t,rawMetric:record.metric,rawValue:record.value,shotIndex:record.shot});
});

// One row is one printed company line. documentId exists to prevent naive cross-document sums.
d.companies.rows.forEach((row,index)=>{
 const company=dictionary(d.companies.cos,row[0]),inst=dictionary(d.companies.insts,row[1]);
 const evidence=source(dictionary(d.companies.src,row[13])||{},{dataset:'companies',route:'companies'});
 result.companies.push({id:'SL-company-row-'+index,companyId:'SL-company-'+row[0],name:company?.[0]||'Unspecified company',instituteId:inst?.[0]||null,institute:inst?.[1]||'Not supplied',programme:programme[dictionary(d.companies.progs,row[3])]||dictionary(d.companies.progs,row[3]),branch:dictionary(d.companies.fams,row[4])?.[1]||null,year:row[2]||null,offers:finite(row[7]),ctcLpa:finite(row[8]),...evidence,documentId:'SL-company-document-'+row[14],sourceDataset:'scoreline',sourceTable:'companies',note:dictionary(d.companies.str,row[16]),role:dictionary(d.companies.str,row[10]),offerType:dictionary(d.companies.types,row[6]),department:dictionary(d.companies.str,row[5]),ctcText:dictionary(d.companies.str,row[9]),printedCompany:dictionary(d.companies.str,row[11]),printedSeason:dictionary(d.companies.str,row[15]),sourceKind:dictionary(d.companies.kinds,row[12]),companyDomain:company?.[5]||null,companySlug:company?.[1]||null});
});

const paperNames=new Map(d.gate.papers.map(paper=>[paper.y+'|'+paper.c,paper.n]));
d.gate.summary.forEach(row=>{
 const evidence=source({k:'gate',f:'gate_reports/GATE_'+row.y+'_report.pdf',p:row.p,l:'GATE '+row.y+' statistical and performance report'},{dataset:'gate',route:'gate'});
 const distribution=d.gate.dist.filter(item=>item.y===row.y&&item.c===row.c),rank=d.gate.ranks.find(item=>item.y===row.y&&item.c===row.c);
 result.gateReports.push({id:'SL-gate-'+row.y+'-'+row.c,year:row.y,paper:row.c,paperName:paperNames.get(row.y+'|'+row.c)||row.c,appeared:finite(row.app),registered:finite(row.reg),qualified:finite(row.qual),qualifyingMarks:Array.isArray(row.qm)?{GEN:row.qm[0]??null,OBC_NCL_EWS:row.qm[1]??null,SC_ST_PWD:row.qm[2]??null}:null,qualifyingScores:Array.isArray(row.qs)?{GEN:row.qs[0]??null,OBC_NCL_EWS:row.qs[1]??null,SC_ST_PWD:row.qs[2]??null}:null,...evidence,sourceDataset:'scoreline',notes:[row.groups,row.note].filter(Boolean).join(' '),qualificationPercent:finite(row.qpct),meanMarks:finite(row.mean),standardDeviationMarks:finite(row.sd),topCandidateMeanMarks:finite(row.mt),maxMarks:finite(row.maxM),minMarks:finite(row.minM),maxScore:finite(row.maxS),minScore:finite(row.minS),marksPage:row.pm??null,distributions:distribution.map(value=>({...value,sourceUrl:fileUrl('gate_reports/GATE_'+row.y+'_report.pdf')+'#page='+value.p})),rankBands:rank?.bands||[],rankBandsPage:rank?.p??null,categories:d.gate.cats.filter(value=>value[0]===row.y&&value[1]===row.c).map(value=>({rawCategory:value[2],category:value[3],registered:value[4],appeared:value[5],qualified:value[6],page:value[7],note:value[8]})),gender:d.gate.gender.filter(value=>value[0]===row.y&&value[1]===row.c).map(value=>({gender:value[2],registered:value[3],appeared:value[4],qualified:value[5],page:value[6]}))});
});
result.gateAuxiliary={sourceDataset:'scoreline',sourceUrlPattern:'https://score-line.pages.dev/files/gate_reports/GATE_{year}_report.pdf#page={page}',packedColumns:{stateGender:['year','stateCode','state','gender','registered','appeared','qualified','page'],stateCategory:['year','stateCode','state','category','registered','appeared','qualified','page'],stateTop:['year','stateCode','state','rankBandUpperLimit','candidatesInRankBand','page','notes'],degree:['year','degree','category','registered','appeared','qualified','page'],discipline:['year','discipline','registered','appeared','qualified','page'],topInst:['year','position','institute','registered','appeared','qualified','page'],twoPaper:['year','firstPaper','secondPaper','registered','appeared','qualified','page']},...d['gate-extra'],videoMetadata:d.youtube.videos,videoScreenshots:d.youtube.shots.map(shot=>({...shot,url:fileUrl(shot.file)})),excludedViewerComments:(d.youtube.excludedViewerCommentCount??d.youtube.comments.length)};

const psuMetric={score:'gate_score',marks:'gate_marks',rank:'air',overall:'overall_selection_score',unclear:'unclear_metric',test:'recruitment_test_score',interview:'interview_score',merit:'merit_rank'};
const stage={S:'Shortlist',F:'Final',U:'Not stated',I:'Final, with interview',T:'Online test (not GATE)'};
d.psu.cuts.forEach((row,index)=>{
 const record=Object.fromEntries(d.psu.cols.map((name,i)=>[name,row[i]]));
 const evidence=source(dictionary(d.psu.src,record.src)||{},{dataset:'psu',route:'psu'});
 result.psuRecords.push({id:'SL-psu-'+index,institute:dictionary(d.psu.psus,record.psu),programme:dictionary(d.psu.posts,record.post),category:dictionary(d.psu.cats,record.cat),year:record.year,gateYear:record.gate,paper:dictionary(d.psu.papers,record.paper)?.[0]||null,metric:psuMetric[record.unit]||record.unit,closingScore:finite(record.v),round:stage[record.stage]||record.stage,...evidence,sourceDataset:'scoreline',notes:dictionary(d.psu.str,record.note),rawStage:record.stage,rawUnit:record.unit,unitText:dictionary(d.psu.str,record.unitText),printedValue:record.text,sourceConfidenceCode:record.conf,roundNumber:record.round});
});
result.metadata.psuAuxiliary={cols:{counts:['psu','year','gate','post','paper','cat','stage','count','text','note','source','confidence'],terms:['psu','year','post','term','value','unit','source']},psus:d.psu.psus,posts:d.psu.posts,papers:d.psu.papers,categories:d.psu.cats,sourcePool:d.psu.src.map(value=>source(value,{dataset:'psu',route:'psu'})),strings:d.psu.str,counts:d.psu.counts,terms:d.psu.terms};

d.bits.offers.forEach((row,index)=>{
 const record=Object.fromEntries(d.bits.cols.map((name,i)=>[name,row[i]]));
 const evidence=source(d.bits.src,{dataset:'bits',route:'bits'}),measure=d.bits.measures[record.measure];
 result.bitsOffers.push({id:'SL-bits-'+index,institute:'BITS '+dictionary(d.bits.campuses,record.campus),programme:dictionary(d.bits.progs,record.prog),year:record.year,metric:record.measure==='gate'?'gate_score':record.measure==='gpat'?'gpat_score':record.measure==='hd_ss'?'bits_hd_special_test_marks':'bits_hd_marks',closingScore:finite(record.low),median:finite(record.median),high:finite(record.high),count:finite(record.n),round:record.iteration===0?'All reported iterations (overlapping aggregate)':'Reported iteration '+record.iteration,...evidence,evidenceLabel:'Candidate-reported aggregate; not official cutoff',sourceDataset:'scoreline',route:record.route,scaleMaximum:measure?.[1]??null,measureLabel:measure?.[0]||record.measure,isOverlappingAggregate:record.iteration===0});
});
result.metadata.bits={...d.bits.meta,officialRules:d.bits.official.map(rule=>({...rule,evidence:source(rule.src||{},{dataset:'bits',route:'bits'})})),currentOfferings:{...d.bits.offered,evidence:source(d.bits.offered.src,{dataset:'bits',route:'bits'})},noOffer:d.bits.noOffer,ug:d.bits.ug};
// Preserve the complete original source-file index without downloading its documents.
for(const item of d.sources){const evidence=source({k:item.kind,f:item.f},{dataset:'sources',route:'sources',title:item.f,notes:'Indexed source metadata; '+item.bytes+' bytes; upstream citations '+item.cites});Object.assign(sources.get(evidence.sourceId),{bytes:item.bytes,citationCount:item.cites,also:item.also,sourceIndexCode:item.code,sourceIndexSeason:item.season});}
result.sources=[...sources.values()];
result.metadata.counts={placements:result.placements.length,companies:result.companies.length,gateReports:result.gateReports.length,psuRecords:result.psuRecords.length,bitsOffers:result.bitsOffers.length,sources:result.sources.length,excludedViewerComments:(d.youtube.excludedViewerCommentCount??d.youtube.comments.length)};
assert.equal(result.placements.length,6447+2986+1958);assert.equal(result.companies.length,19516);assert.equal(result.gateReports.length,178);assert.equal(result.psuRecords.length,3644);assert.equal(result.bitsOffers.length,213);
assert(result.placements.some(row=>row.medianLpa===0)||result.placements.some(row=>row.placed===0),'Reported zero values must survive.');
assert(result.placements.some(row=>row.medianLpa===null),'Missing values must survive.');
assert(result.companies.every(row=>row.documentId));assert(result.gateReports.every(row=>Array.isArray(row.distributions)&&Array.isArray(row.rankBands)));
assert(result.psuRecords.some(row=>row.metric==='gate_score')&&result.psuRecords.some(row=>row.metric==='gate_marks')&&result.psuRecords.some(row=>row.metric==='air'));
assert(!JSON.stringify(result.gateAuxiliary).includes('"author":'),'Comment authors must not be exported.');
const sourceIds=new Set(result.sources.map(value=>value.id));assert.equal(sourceIds.size,result.sources.length);
for(const key of ['placements','companies','gateReports','psuRecords','bitsOffers']){assert.equal(new Set(result[key].map(row=>row.id)).size,result[key].length,key+' IDs must be unique.');assert(result[key].every(row=>sourceIds.has(row.sourceId)&&/^https?:\/\//.test(row.sourceUrl)),key+' source references must resolve.');}
const serialized=JSON.stringify(result);
await writeFile(resolve(directory,'normalized-evidence.json'),serialized+'\n');
await writeFile(resolve(directory,'NORMALIZATION_REPORT.json'),JSON.stringify({source:'Score Line',acquiredAt:manifest.acquiredAt,generatedAt:new Date().toISOString(),counts:result.metadata.counts,bytes:Buffer.byteLength(serialized),sha256:createHash('sha256').update(serialized+'\n').digest('hex'),checks:'Passed row counts, dictionary references (acquisition validation), null/zero preservation, unit separation, document group IDs and excluded comment author fields.',limitations:manifest.limitations},null,2)+'\n');
console.log(JSON.stringify({counts:result.metadata.counts,bytes:Buffer.byteLength(serialized),output:'research/imported/scoreline/normalized-evidence.json'}));
