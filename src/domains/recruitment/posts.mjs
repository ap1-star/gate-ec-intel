import {SOURCE_REVIEWED_AT,RECRUITMENT_SOURCES,recruitingBodyIdFor} from './registry.mjs';
const links=Object.freeze({
 ssc2026:'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_je_2026.pdf',
 imdAddendum:'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Addendum_JE_10092026.pdf',
 barc2026:'https://www.barc.gov.in/careers/barc_ts_OCES_DGFS_brochure.pdf',
 ceptam11:'https://drdo.gov.in/drdo/sites/default/files/vacancy/CEPTAM-11_AdvtEnglish.pdf',
 rac156:'https://rac.gov.in/download/advt_156_v3.pdf',
 rrbJe2025:'https://www.rrbcdg.gov.in/uploads/2025/05-JE/052025JE-CEN.pdf',
 rrbTech2025:'https://www.rrbcdg.gov.in/uploads/2025/02-TECH/022025-CEN_updated.pdf',
 rrbTechIndexed:'https://www.rrbcdg.gov.in/uploads/2025/02-TECH/022025-CEN-%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80.pdf',
 isro2025:'https://www.isro.gov.in/media_isro/pdf/recruitmentNotice/2025_May/ICRBAdvt_BILINGUAL.pdf',
 isroFaq2025:'https://www.isro.gov.in/media_isro/pdf/recruitmentNotice/2025_May/FREQUENTLYASKEDQUESTIONSANDANSWERS_EMC_2025.pdf'
});
const partial=(sourceUrl,sourceSection,fields={},method='official_document_read')=>({verified:true,complete:false,sourceUrl,sourceSection,verifiedAt:SOURCE_REVIEWED_AT,verificationMethod:method,unmappedConditions:['Current corrigenda, qualification recognition, documentary verification and remaining notice conditions require review.'],...fields});
const sourceIdFor=url=>RECRUITMENT_SOURCES.find(source=>source.url===url)?.id??null;
const bodyFor=recruitingBodyIdFor;
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
const base=(id,organizationId,examinationId,noticeId,title,eligibility,extra={})=>({id,organizationId,recruitingBodyId:bodyFor(organizationId,examinationId),examinationId,pathwayId:examinationId,cycleId:noticeId,noticeId,title,name:title,technical:true,noticeStatus:'closed',sourceId:sourceIdFor(eligibility.sourceUrl),sourceUrl:eligibility.sourceUrl,eligibility,...extra});
const btech=['B.Tech.','B.E.'];
const barcBranches=['Electronics Engineering','Electrical Engineering','Electronics and Communication Engineering','Electronics and Telecommunication Engineering','Electronics and Controls Engineering','Electrical and Electronics Engineering','Electronic System Engineering'];
const ceptamExcluded=['B.Tech.','B.E.','M.Sc.','Ph.D.'];
const sscAge={minimum:18,maximum:30,maximumExclusive:true,asOfDate:'2026-08-01',relaxations:{GEN:0,EWS:0,OBC_NCL:3,SC:5,ST:5}};
export const RECRUITMENT_POSTS=freeze([
 base('ssc_je_2026_dot_telecom','ssc','ssc_je','ssc_je_2026','DoT Junior Engineer (Telecom) — SSC JE 2026',partial(links.ssc2026,'Para 2, item 12; PDF page 3; age Para 7',{
  acceptedDegrees:btech,acceptedBranches:['Electrical Engineering','Electronics Engineering','Electrical Communications','Computer Science','Telecommunications','Information Technology','Instrumentation'],equivalenceReview:true,age:sscAge
 }),{degreeNote:'The notice names Electronics and Electrical Communications, among other disciplines. Unlisted combined degree titles require recruiting-authority equivalence confirmation; no ECE-wide rejection or acceptance is inferred.'}),
 base('ssc_je_2026_bro_civil','ssc','ssc_je','ssc_je_2026','BRO Junior Engineer (Civil) — SSC JE 2026',partial(links.ssc2026,'Para 2, item 1; PDF page 2',{
  qualificationAlternatives:[{id:'degree',label:'Civil engineering degree',acceptedDegrees:btech,acceptedBranches:['Civil Engineering']},{id:'diploma_experience',label:'Three-year Civil diploma plus prescribed experience',acceptedDegrees:['Diploma'],acceptedBranches:['Civil Engineering'],conditions:[{field:'diplomaDurationYears',equals:3,label:'Diploma duration'},{field:'experienceMonths',minimum:24,label:'Prescribed relevant Civil engineering experience in months'}]}],
  age:sscAge,conditions:[{field:'gender',equals:'male',label:'BRO male-candidate condition'},{field:'broMedicalStandardsMet',equals:true,label:'BRO physical and medical standards'}]
 }),{degreeNote:'Civil qualification is post-specific. This record must never make all SSC JE 2026 posts ECE-ineligible.'}),
 base('imd_sa_2026','imd','imd_sa','ssc_je_2026','Scientific Assistant, IMD — amended SSC JE 2026 criteria',partial(links.imdAddendum,'Addendum dated 10 September 2026, pages 1–2; source notice age Para 7',{
  qualificationAlternatives:[
   {id:'science_physics',label:'Science degree with Physics as a subject',acceptedDegrees:['B.Sc.'],conditions:[{field:'degreeSubjects',includes:'Physics',label:'Degree subjects'}]},
   {id:'listed_computing_engineering',label:'Listed computing/electronics qualification plus Class XII subjects',acceptedDegrees:[...btech,'Bachelor Degree','B.Sc.','BCA'],acceptedBranches:['Computer Science','Computer Applications','Electronics','Electronics Engineering','Electronics and Communication Engineering','Electronics Telecommunication Engineering','Electronics and Telecommunication Engineering','Instrumentation','Instrumentation Engineering','Information Technology','Telecommunication Engineering','Communication Engineering'],conditions:[{field:'class12Subjects',includes:'Physics',label:'Class XII subjects'},{field:'class12Subjects',includes:'Mathematics',label:'Class XII subjects'}]}
  ],age:sscAge
 }),{additionalSourceUrls:[links.ssc2026],degreeNote:'The 10 September addendum requires Class XII Physics and Mathematics for qualification route (2). The Science-with-Physics route is separate.'}),
 base('barc_oces_2026_electronics','barc','barc_oces','barc_oces_2026','BARC OCES 2026 — Electronics screening discipline EC (25)',partial(links.barc2026,'Sections 4.1, 4.3–4.4 and Table 1a, PDF pages 12, 17 and 28',{
  acceptedDegrees:[...btech,'B.Sc. (Engineering)','5-year Integrated M.Tech.'],acceptedBranches:barcBranches,minimumPercentage:60,minimumCgpa:6,cgpaScale:10,
  age:{minimum:18,maximum:26,asOfDate:'2026-08-01',relaxations:{GEN:0,EWS:0,OBC_NCL:3,SC:5,ST:5}},
  selectionRoutes:['gate','barc_exam'],gate:{required:false,appliesWhen:{field:'selectionRoute',equals:'gate'},papers:['EC'],years:[2024,2025,2026],validRequired:true},
  conditions:[{field:'citizenship',equals:'India',label:'Indian citizenship'}]
 }),{degreeNote:'GATE EC is one alternative screening channel. Selecting the BARC online-exam route must not make GATE mandatory.'}),
 base('drdo_rac_156_electronics','drdo','drdo_rac','drdo_rac_156_2025','DRDO RAC Scientist B — Electronics and Communication, advertisement 156',partial(links.rac156,'Item 1; official search-index extract; full direct PDF fetch did not complete',{
  acceptedDegrees:btech,acceptedBranches:['Electronics and Communication Engineering','Electronics Engineering','Electronics and Computer Engineering','Electronics and Control Engineering','Electronics and Instrumentation Engineering','Electronics and Telecommunication Engineering','Industrial Electronics Engineering','Telecommunication Engineering','Electrical Engineering','Electrical and Electronics Engineering'],equivalenceReview:true,
  gate:{required:true,papers:['EC'],years:[2023,2024,2025],validRequired:true},conditions:[{field:'firstClass',equals:true,label:'First-class qualifying engineering degree'}]
 },'official_search_index_excerpt'),{degreeNote:'A separate RAC route. Its graduate-engineering criteria must never be reused for CEPTAM diploma/trade posts.'}),
 base('drdo_ceptam11_sta_b_0108','drdo','drdo_ceptam','drdo_ceptam_11','DRDO CEPTAM-11 STA-B, post 0108 — Electronics',partial(links.ceptam11,'Section 1.1.2, post code 0108; PDF pages 1–2',{
  acceptedDegrees:['Diploma'],acceptedBranches:['Electronics','Electronics Engineering','Electronics and Communication Engineering','Electronics and Telecommunication Engineering'],excludedDegrees:ceptamExcluded,
  age:{minimum:18,maximum:28,asOfDate:'2026-01-01',relaxations:{GEN:0,EWS:0,OBC_NCL:3,SC:5,ST:5}}
 }),{degreeNote:'The notice excludes specified higher qualifications as of the crucial date, even when the candidate also holds the required diploma.'}),
 base('drdo_ceptam11_tech_a_higher_qualification_rule','drdo','drdo_ceptam','drdo_ceptam_11','DRDO CEPTAM-11 Technician-A — higher-qualification restriction',partial(links.ceptam11,'Section 1.2.2; PDF page 3',{
  excludedDegrees:ceptamExcluded,conditions:[{field:'exactTechnicianTradeQualificationVerified',equals:true,label:'Exact post-code trade/ITI qualification'}]
 }),{degreeNote:'Only the general published higher-qualification exclusion is transcribed. A trade-specific Technician-A qualification must be verified before any positive result.'}),
 base('rrb_je_2025_telecommunication_review','rrb','rrb_je','rrb_je_2025','RRB JE/S&T Telecommunication — CEN 05/2025 source review pending',{
  verified:false,complete:false,sourceUrl:links.rrbJe2025,sourceSection:'Annexure-A and degree-in-lieu note require full official PDF review.',verifiedAt:null,verificationMethod:'direct_fetch_failed',acceptedDegrees:[],acceptedBranches:[]
 },{noticeStatus:'historical',degreeNote:'The supplied prior research says same-discipline BE/B.Tech may be accepted in lieu of diploma. Direct official PDF fetch failed; this is not marked verified and no blanket diploma-only exclusion is inferred.'}),
 base('rrb_technician_signal_2025','rrb','rrb_technician_signal','rrb_technician_2025','RRB Technician Grade I Signal — CEN 02/2025',partial(links.rrbTechIndexed,'Annexure-A, category 1; official indexed PDF extract',{
  acceptedDegrees:[...btech,'Diploma','B.Sc.'],acceptedBranches:['Physics','Electronics','Electronics Engineering','Computer Science','Information Technology','Instrumentation'],equivalenceReview:true
 },'official_search_index_excerpt'),{additionalSourceUrls:[links.rrbTech2025],degreeNote:'The indexed official category-1 table includes engineering degrees in the specified basic streams. Do not apply CEPTAM higher-degree exclusions or Grade III ITI rules to Grade I Signal.'}),
 base('isro_icrb_2025_be001','isro','isro_icrb','isro_icrb_emc_2025','ISRO ICRB Scientist/Engineer SC Electronics — BE001, 2025',partial(links.isro2025,'Advertisement dated 27 May 2025, BE001; PDF page 1',{
  acceptedDegrees:btech,acceptedBranches:['Electronics and Communication Engineering'],equivalenceReview:true,minimumPercentage:65,minimumCgpa:6.84,cgpaScale:10
 }),{additionalSourceUrls:[links.isroFaq2025],degreeNote:'Historical closed application cycle. Its 2025 recruitment criteria are not current hiring or future eligibility.'})
]);
const notice=(id,organizationId,examinationId,title,sourceUrl,publishedAt,deadlineDate,status='closed',extra={})=>freeze({
 id,organizationId,recruitingBodyId:bodyFor(organizationId,examinationId),examinationId,cycleId:id,title,technical:true,status,publishedAt,publicationPrecision:publishedAt?'date':null,checkedAt:SOURCE_REVIEWED_AT,verifiedAt:SOURCE_REVIEWED_AT,verificationStatus:'verified',sourceId:sourceIdFor(sourceUrl),sourceUrl,applicationUrl:sourceUrl,
 applicationOpensAt:null,deadlineAt:null,deadlineTimezone:null,deadlineVerified:false,deadlineDate,
 dateNote:'Historical source date retained without inventing an exact timestamp or timezone. No reminder is scheduled from this date-only field.',
 posts:RECRUITMENT_POSTS.filter(post=>post.noticeId===id),version:1,...extra
});
export const RECRUITMENT_NOTICES=Object.freeze([
 notice('ssc_je_2026','ssc','ssc_je','SSC JE 2026 — post-specific technical recruitment and IMD addendum',links.ssc2026,'2026-09-02','2026-09-22','closed',{additionalSourceUrls:[links.imdAddendum]}),
 notice('barc_oces_2026','barc','barc_oces','BARC OCES/DGFS 2026 — Electronics reference cycle',links.barc2026,null,'2026-01-21','historical',{dateNote:'The consulted brochure contains an inconsistent application-opening year. Preserve it as historical evidence; verify portal corrigenda before using any application timestamp.'}),
 notice('drdo_rac_156_2025','drdo','drdo_rac','DRDO RAC advertisement 156 — historical Scientist B recruitment',links.rac156,null,'2025-07-04','closed',{verificationStatus:'partial_official_reference',verifiedAt:null,dateNote:'Official indexed version 3 states 4 July 2025, 16:00 IST; a later corrigendum/addendum check and full direct PDF review remain pending. No active vacancy or reminder is inferred.'}),
 notice('drdo_ceptam_11','drdo','drdo_ceptam','DRDO CEPTAM-11 — historical STA-B and Technician-A cycle',links.ceptam11,null,'2026-01-01'),
 notice('rrb_je_2025','rrb','rrb_je','RRB CEN 05/2025 — exact post review pending',links.rrbJe2025,null,null,'historical',{verificationStatus:'review_pending',verifiedAt:null}),
 notice('rrb_technician_2025','rrb','rrb_technician_signal','RRB CEN 02/2025 — historical Technician Grade I Signal reference',links.rrbTechIndexed,null,null,'historical',{verificationStatus:'partial_official_reference',verifiedAt:null}),
 notice('isro_icrb_emc_2025','isro','isro_icrb','ISRO ICRB EMC 2025 — Electronics application cycle closed',links.isro2025,'2025-05-27','2025-06-16','closed',{additionalSourceUrls:[links.isroFaq2025]}),
 notice('upsc_ese_2027','upsc','upsc_ese','Engineering Services 2027 — applications closed; future examination officially announced','https://www.upsc.gov.in/examinations/Engineering%20Services%20(Preliminary)%20Examination,%202027','2026-09-16','2026-10-06','closed',{examDate:'2027-01-31',examAt:null,dateNote:'Official UPSC page gives application close 6 October 2026 at 18:00 and examination date 31 January 2027. Exact timezone-qualified scheduling metadata is not transcribed; no guessed reminders.'})
]);
export const RECRUITMENT_EVIDENCE_LINKS=links;
export const RECRUITMENT_CYCLES=freeze(RECRUITMENT_NOTICES.map(notice=>({id:notice.cycleId,organizationId:notice.organizationId,recruitingBodyId:notice.recruitingBodyId,examinationId:notice.examinationId,title:notice.title,status:notice.status,noticeIds:[notice.id],sourceId:notice.sourceId})));
