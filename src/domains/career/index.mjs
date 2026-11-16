import seed from './seed.json' with {type:'json'};
import {donorPredictRank} from './predictor.mjs';
export const CAREER_DATA_VERSION='portal-reference-2026-08-16-part2';
export const CATEGORIES=Object.freeze([['GEN','General'],['GEN_EWS','EWS'],['OBC_NCL','OBC-NCL'],['SC','SC'],['ST','ST']]);
export const PSU_CATEGORIES=Object.freeze([...CATEGORIES,['PWBD','PwBD (source category)']]);
export const REFERENCE=seed.datasets;
export const SUPPORTED_YEARS=Object.freeze(REFERENCE.DATA.years_data.map(row=>row.year));
export const SOURCE_LINKS=Object.freeze({
 gate:'https://gate2026.iitg.ac.in/download.html',
 gate2025:'https://gate2025.iitr.ac.in/doc/download/GATE2025StatisticalAndPerformanceReportWebVersion.pdf',
 iisc:'https://www.iisc.ac.in/admissions/cut-off-report-and-gate-score-of-previous-years/',
 iitm:'https://mtechadm.iitm.ac.in/',
 ccmt:'https://ccmt.admissions.nic.in/or-cr/'
});
const iiscUrls={2020:'https://www.iisc.ac.in/wp-content/uploads/2021/01/GATE-SCORE-Direct-admission-2020.pdf',2021:'https://www.iisc.ac.in/wp-content/uploads/2021/09/Direct-MTech-2021.pdf',2022:'https://www.iisc.ac.in/wp-content/uploads/2024/03/GATE-2022-M-tech-Min-Max.pdf',2023:'https://www.iisc.ac.in/wp-content/uploads/2024/03/2023-M-tech-GATE-Min-Max.pdf',2024:'https://www.iisc.ac.in/wp-content/uploads/2024/06/GATE-HIGH_LOW.pdf',2025:'https://www.iisc.ac.in/wp-content/uploads/2025/06/M.Tech-M.Des-Admission-Cutoff-2025.pdf',2026:'https://www.iisc.ac.in/wp-content/uploads/2026/08/Min-Max-MTech-GATE_CFTI.pdf'};
const categoryKey=category=>({GEN:'GEN',GEN_EWS:'EWS',OBC_NCL:'OBC',SC:'SC',ST:'ST'}[category]);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function parseNumeric(value,label,{minimum=-Infinity,maximum=Infinity,integer=false,optional=false}={}){
 if(value===null||value===undefined||(typeof value==='string'&&value.trim()==='')){if(optional)return null;throw new Error(label+' is required.');}
 if(!['number','string'].includes(typeof value)||(typeof value==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())))throw new Error(label+' must be numeric.');
 const number=typeof value==='number'?value:Number(value);
 if(!Number.isFinite(number)||number<minimum||number>maximum||(integer&&!Number.isInteger(number)))throw new Error(label+' must be '+(integer?'an integer ':'')+'from '+minimum+' to '+maximum+'.');
 return number;
}
export function safeSourceUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
export function predictRank(input){
 if(!input||typeof input!=='object')throw new Error('Rank inputs are required.');
 const year=parseNumeric(input.year,'Year',{minimum:2013,maximum:2027,integer:true});
 if(!SUPPORTED_YEARS.includes(year))throw new Error('The requested reference year is unavailable.');
 const marks=parseNumeric(input.marks,'Marks',{minimum:-20,maximum:100});
 const category=input.category;if(!CATEGORIES.some(([id])=>id===category))throw new Error('Choose a supported category.');
 const toughness=parseNumeric(input.toughness??0,'Toughness scenario',{minimum:-2,maximum:3,integer:true});
 if(year!==2027&&toughness!==0)throw new Error('The toughness control applies only to the hypothetical 2027 scenario.');
 const result=donorPredictRank({marks,year,category,toughness},REFERENCE.DATA,REFERENCE.RECONSTRUCTED_2026_EXTERNAL_CURVE);
 const sourceClaim=result.confidence;
 const evidenceLabel=year===2027?'Hypothetical scenario':year===2026?'Reconstructed observations':year>=2023?'Supplied report-derived bins':'Historical anchor approximation';
 return {...result,sourceScoreClaim:result.scoreConfidence,sourceCutoffClaim:result.cutoffConfidence,scoreConfidence:'unverified',cutoffConfidence:'unverified',sourceClaim,confidence:year===2027?'hypothetical':'unverified',confidenceNote:year===2027?result.confidenceNote:'Preserved source inputs have not been independently certified in this integration. '+(year===2026?REFERENCE.RECONSTRUCTED_2026_EXTERNAL_CURVE.disclosure:'Distribution-bin interpolation and historical anchors approximate AIR; they are not official individual results.'),method:result.method.replace('verified distribution interpolation','supplied distribution-bin interpolation'),rangeKind:'marks_sensitivity',sensitivityMarks:0.75,datasetVersion:CAREER_DATA_VERSION,calibration:'not_validated',evidenceLabel,evidence:[{url:year===2025?SOURCE_LINKS.gate2025:SOURCE_LINKS.gate,title:year===2025?'Official 2025 report for comparison':'Official GATE archive',sourceClaim,review:'not_independently_reviewed'}]};
}
export function rankSeries(year,category='GEN',toughness=0){
 const min=year===2026?REFERENCE.RECONSTRUCTED_2026_EXTERNAL_CURVE.supported_marks.minimum:-20,max=year===2026?REFERENCE.RECONSTRUCTED_2026_EXTERNAL_CURVE.supported_marks.maximum:100;
 return Array.from({length:61},(_,i)=>{const marks=min+(max-min)*i/60;return {marks,rank:predictRank({marks,year,category,toughness}).rank};});
}
export function historicalComparison(marks,category='GEN'){
 return REFERENCE.DATA.years_data.map(row=>{try{return {year:row.year,estimate:predictRank({marks,year:row.year,category,toughness:0}),error:null};}catch(error){return {year:row.year,estimate:null,error:error.message};}});
}
export function admissionBenchmarks(rank){
 if(rank===null||rank===undefined||rank==='')return [];
 rank=parseNumeric(rank,'AIR',{minimum:1,maximum:10000000,integer:true});
 const tiers=[['iit_top','IISc / IIT — top tier','IIT'],['iit_old','IIT — established tier','IIT'],['iit_new','IIT — newer tier','IIT'],['nit_top','NIT — top tier','NIT'],['nit_good','NIT — strong tier','NIT'],['nit_general','NIT / IIEST — wider options','NIT'],['iiit','IIIT programmes','IIIT']];
 return tiers.map(([key,name,family])=>{const benchmark=REFERENCE.DATA.admission_benchmarks[key];if(!benchmark)return {key,name,family,benchmark:null,status:'Data needed',note:'No institute/programme-specific cutoff is supplied.'};const range=benchmark.air.startsWith('<')?[1,Number(benchmark.air.slice(1))-1]:benchmark.air.split('-').map(Number);return {key,name,family,benchmark,status:rank<range[0]?'Above historical benchmark':rank<=range[1]?'Within historical benchmark':rank<=range[1]*1.3?'Near historical benchmark':'Outside historical benchmark',note:family==='NIT'?'Tier benchmark only. Reviewed branch/category/round-specific CCMT data is absent.':'Heuristic tier comparison, not a programme-level cutoff or admission probability.'};});
}
export function normalizeRange(value){return Array.isArray(value)&&value.length===2&&value.every(finite)?[Math.min(...value),Math.max(...value)]:null;}
export function programmeRecords(){
 const records=[];
 for(const programme of REFERENCE.IISC_SPECIALIZATIONS)for(const [yearText,values] of Object.entries(programme.years??{})){
  const year=Number(yearText),provenance=REFERENCE.IISC_RECORD_PROVENANCE[yearText],rowProvenance=provenance?.records?.[programme.name];
  const gatePapers=rowProvenance?.acceptedGatePapers??null;
  for(const [category] of CATEGORIES){const sourceCategory=REFERENCE.IISC_YEAR_CAT_MAP[yearText]?.[category]??(category==='GEN'?'GN':categoryKey(category));const range=normalizeRange(values[sourceCategory]);records.push({id:'iisc:'+year+':'+programme.name+':'+category,institute:'iisc',instituteName:'IISc Bengaluru',programme:programme.name,programmeCode:null,year,category,sourceCategory,range,cutoff:range?.[0]??null,metric:'gate_score',stage:values.round??provenance?.stage??'Stage not stated',cutoffType:values.cutoffType??provenance?.cutoffType??'Operated GATE score range',sourceFilename:values.sourceFilename??provenance?.sourceFilename??null,sourcePage:values.sourcePage??rowProvenance?.sourcePage??null,sourceUrl:iiscUrls[year]??SOURCE_LINKS.iisc,eligibilityNote:programme.combinedOnly?'Combined-paper/source context; inspect the source before comparing.':gatePapers?'Source lists GATE papers: '+(gatePapers.join(', ')||'not confirmed'):'Accepted paper/qualifying degree needs source verification.',ecPaperAccepted:gatePapers?gatePapers.includes('EC'):null,degreeEligibility:rowProvenance?.ecEligibility??programme.gateECEligibility??'UNCLEAR',otherSourceCategories:Object.fromEntries(Object.entries(values).filter(([key])=>['WQ','PWBD','PWD','KM'].includes(key))),combinedOnly:!!programme.combinedOnly,note:rowProvenance?.notes??'',sourceClaim:'supplied_reference',independentReview:false});}
 }
 for(const [yearText,rows] of Object.entries(REFERENCE.IITM_PROGRAMS_RAW))rows.forEach((row,index)=>{
  const year=Number(yearText),registry=REFERENCE.IITM_SOURCE_REGISTRY[yearText],baseCode=row.code.replace(/[YN]$/,''),paperNote=row.note.match(/GATE papers?:\s*(.*)$/i)?.[1];
  let ecPaperAccepted=paperNote?paperNote.split(/[\s,]+/).includes('EC'):/EC paper accepted|EC\/|EC,/i.test(row.note)?true:/EE paper/i.test(row.note)?false:null;
  for(const [category] of CATEGORIES){const sourceCategory=categoryKey(category),value=row.cutoffs?.[sourceCategory],cutoff=finite(value)?value:null;records.push({id:'iitm:'+year+':'+row.code+':'+index+':'+category,institute:'iitm',instituteName:'IIT Madras',programme:REFERENCE.IITM_PROGRAM_CATALOG[baseCode]??row.code,programmeCode:row.code,year,category,sourceCategory,range:cutoff===null?null:[cutoff,cutoff],cutoff,metric:'gate_score',stage:row.track,cutoffType:'GATE cutoff score / 1000',sourceFilename:row.sourceFile??registry?.sourceFile??null,sourcePage:row.sourcePage??registry?.pages?.[row.code]??registry?.pages?.[row.code.slice(-1)]??null,sourceUrl:'https://mtechadm.iitm.ac.in/pdfs/M.Tech.'+year+'_Cutoff.pdf',eligibilityNote:row.note,ecPaperAccepted,degreeEligibility:row.eligibility??'UNCLEAR',combinedOnly:false,note:'Distinct qualifying-discipline rows are preserved, not merged by programme code.',sourceClaim:'supplied_reference',independentReview:false});}
 });
 return records;
}
export const PROGRAMME_RECORDS=Object.freeze(programmeRecords());
export function filterProgrammes({institute='all',year='all',category='GEN',query='',ecOnly=false,availableOnly=false}={}){
 if(category!=='all'&&!CATEGORIES.some(([key])=>key===category))throw new Error('Choose a supported category.');
 return PROGRAMME_RECORDS.filter(row=>(institute==='all'||row.institute===institute)&&(year==='all'||row.year===Number(year))&&(category==='all'||row.category===category)&&(!ecOnly||row.ecPaperAccepted===true)&&(!availableOnly||row.cutoff!==null)&&(!query||(row.programme+' '+row.programmeCode+' '+row.instituteName+' '+row.eligibilityNote).toLowerCase().includes(query.toLowerCase())));
}
export function compareProgramme(record,score){
 if(record.cutoff===null)return {status:'Missing cutoff',difference:null};
 if(score===null||score===undefined||score==='')return {status:'No candidate score entered',difference:null};
 const numeric=parseNumeric(score,'GATE score',{minimum:0,maximum:1000});
 if(record.ecPaperAccepted===false)return {status:'EC paper not supported by this source row',difference:null};
 const difference=numeric-record.cutoff;
 return {status:difference>=0?'At/above historical lower cutoff':'Below historical lower cutoff',difference};
}
export function psuRecords(){
 return REFERENCE.DATA.psu_cutoffs.verified_cutoffs.flatMap((row,index)=>PSU_CATEGORIES.flatMap(([category])=>{
  const key=category==='PWBD'?'PWBD':categoryKey(category),raw=row.cutoffs[key]??(category==='GEN'?row.cutoffs.UR:undefined);
  const metrics=row.metric==='marks_and_air'?[['marks',raw?.marks],['air',raw?.air]]:[[row.metric==='score_out_of_1000'?'gate_score':'marks',raw]];
  return metrics.map(([metric,value])=>({id:'psu:'+index+':'+category+':'+metric,psu:row.psu,name:row.full_name,role:row.role,year:row.year,category,metric,cutoff:finite(value)?value:null,sourceDescription:row.source,sourceUrl:null,sourceClaim:'donor_verified_label',independentReview:false}));
 }));
}
export const PSU_RECORDS=Object.freeze(psuRecords());
export const PSU_DIRECTORY=Object.freeze(REFERENCE.DATA.psu_cutoffs.top_20_psu_reference_list);
export function filterPsus({year='all',category='GEN',metric='all',query=''}={}){
 if(category!=='all'&&!PSU_CATEGORIES.some(([key])=>key===category))throw new Error('Choose a supported category.');
 if(!['all','marks','gate_score','air'].includes(metric))throw new Error('Choose a supported metric.');
 return PSU_RECORDS.filter(row=>(year==='all'||row.year===Number(year))&&(category==='all'||row.category===category)&&(metric==='all'||row.metric===metric)&&(!query||(row.psu+' '+row.name+' '+row.role).toLowerCase().includes(query.toLowerCase())));
}
export function comparePsu(record,value,metric){
 if(record.cutoff===null)return {status:'Missing category cutoff',difference:null};
 if(value===null||value===undefined||value==='')return {status:'No candidate value entered',difference:null};
 if(metric!==record.metric)return {status:'Different metric; comparison not made',difference:null};
 const maximum=metric==='marks'?100:metric==='gate_score'?1000:10000000;
 const input=parseNumeric(value,metric==='air'?'AIR':metric==='gate_score'?'GATE score':'Marks',{minimum:metric==='marks'?-20:metric==='air'?1:0,maximum,integer:metric==='air'});
 const difference=metric==='air'?record.cutoff-input:input-record.cutoff;
 return {status:difference>=0?'Meets historical reference':'Below historical reference',difference};
}
