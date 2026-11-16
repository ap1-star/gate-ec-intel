import test from 'node:test';
import assert from 'node:assert/strict';
import {TECHNICAL_PATHWAYS,RECRUITMENT_SOURCES,ORGANIZATIONS,EXAMINATIONS,RECRUITMENT_POSTS,RECRUITMENT_NOTICES,ELIGIBILITY_LABELS,SOURCE_REVIEWED_AT,isExcludedRecruitment,isTechnicalRecruitmentTitle,isApprovedRecruitmentUrl,filterPathways,evaluateTechnicalEligibility,evaluatePostEligibility,opportunityStatus,validateEligibilityRule} from '../src/domains/recruitment/index.mjs';

const now='2026-11-16T00:00:00Z';
const post=id=>{const found=RECRUITMENT_POSTS.find(value=>value.id===id);assert(found,id);return found;};
const evaluate=(id,profile)=>evaluateTechnicalEligibility(profile,post(id),{now});
// Complete synthetic rules exercise the evaluator. They are deliberately not exported
// as published vacancies, and make no claim that an actual notice is fully transcribed.
const fixture=(criteria={})=>({id:'synthetic_post',technical:true,eligibility:{verified:true,complete:true,sourceUrl:'https://www.isro.gov.in/Careers.html',verifiedAt:SOURCE_REVIEWED_AT,acceptedDegrees:['B.Tech.'],acceptedBranches:['Electronics and Communication Engineering'],...criteria}});
const match=(profile={},criteria={})=>evaluateTechnicalEligibility({degree:'B.Tech.',branch:'ECE',...profile},fixture(criteria),{now});

test('critical 1–2: general SSC CHSL/CGL and RRB NTPC are excluded; NTPC engineering remains',()=>{
 for(const title of ['SSC CHSL','SSC CGL','RRB NTPC Graduate','RRB NTPC Undergraduate']){
  assert.equal(isExcludedRecruitment({title}),true,title);
  assert.equal(evaluateTechnicalEligibility({},fixture({}),{now}).status,'insufficient');
  assert.equal(evaluateTechnicalEligibility({},{...fixture(),title},{now}).status,'ineligible');
 }
 assert.equal(TECHNICAL_PATHWAYS.some(isExcludedRecruitment),false);
 assert.equal(filterPathways({organizationId:'ntpc'}).length,1);
 assert.equal(isExcludedRecruitment({title:'NTPC Limited technical recruitment'}),false);
 assert.equal(isTechnicalRecruitmentTitle('SSC CGL technical syllabus'),false);
 assert.equal(isTechnicalRecruitmentTitle('Engineering executive trainee Electronics'),true);
 assert.equal(isTechnicalRecruitmentTitle('Administrative Officer'),false);
});

test('critical 3: SSC JE is post-specific and 2026 Telecom is not blanket rejected as Civil-only',()=>{
 const profile={degree:'B.Tech.',branch:'ECE',dob:'2001-06-01',category:'GEN',gender:'male',broMedicalStandardsMet:true};
 assert.equal(evaluate('ssc_je_2026_bro_civil',profile).status,'ineligible');
 const telecom=evaluate('ssc_je_2026_dot_telecom',profile);
 assert.equal(telecom.status,'potential');
 assert(telecom.reasons.some(reason=>reason.code==='equivalence_unconfirmed'));
 assert.equal(evaluate('ssc_je_2026_dot_telecom',{...profile,branch:'Electronics Engineering'}).status,'potential');
 assert.equal(evaluateTechnicalEligibility(profile,{technical:true,examinationId:'ssc_je'},{now}).status,'insufficient');
});

test('SSC BRO diploma route requires the published experience and does not impose it on degree route',()=>{
 const profile={degree:'Diploma',branch:'Civil Engineering',diplomaDurationYears:3,dob:'2001-06-01',category:'GEN',gender:'male',broMedicalStandardsMet:true};
 assert.equal(evaluate('ssc_je_2026_bro_civil',{...profile,experienceMonths:23}).status,'ineligible');
 assert.equal(evaluate('ssc_je_2026_bro_civil',profile).status,'insufficient');
 assert.equal(evaluate('ssc_je_2026_bro_civil',{...profile,experienceMonths:24}).status,'potential');
 assert.equal(evaluate('ssc_je_2026_bro_civil',{...profile,degree:'B.Tech.',experienceMonths:0}).status,'potential');
});

test('IMD 2026 addendum keeps degree routes and Class XII Physics/Mathematics conditions separate',()=>{
 const profile={degree:'B.Tech.',branch:'ECE',dob:'2001-06-01',category:'GEN'};
 assert.equal(evaluate('imd_sa_2026',profile).status,'insufficient');
 assert.equal(evaluate('imd_sa_2026',{...profile,class12Subjects:['Physics']}).status,'ineligible');
 assert.equal(evaluate('imd_sa_2026',{...profile,class12Subjects:['Physics','Mathematics']}).status,'potential');
 assert.equal(evaluate('imd_sa_2026',{...profile,degree:'B.Sc.',branch:'Physics',degreeSubjects:['Physics'],class12Subjects:[]}).status,'potential');
});

test('critical 4: exact post and branch matching; inaccessible RRB JE source stays unverified',()=>{
 assert.equal(evaluate('rrb_je_2025_telecommunication_review',{degree:'B.Tech.',branch:'ECE'}).status,'insufficient');
 const criteria={acceptedDegrees:['Diploma','B.Tech.','B.E.'],acceptedBranches:['Electronics and Communication Engineering']};
 assert.equal(match({degree:'B.Tech.',branch:'ECE'},criteria).status,'eligible');
 assert.equal(match({degree:'Diploma',branch:'ECE'},criteria).status,'eligible');
 assert.equal(match({degree:'B.Tech.',branch:'Civil Engineering'},criteria).status,'ineligible');
 assert.equal(match({degree:'B.Sc.',branch:'ECE'},criteria).status,'ineligible');
 assert.equal(match({degree:'B.Tech.',branch:'Electronics-related interdisciplinary engineering'},criteria).status,'ineligible');
 assert.equal(match({degree:'B.Tech.',branch:'Electronics-related interdisciplinary engineering'},{...criteria,equivalenceReview:true}).status,'potential');
});

test('critical 5–6: RAC graduate route and CEPTAM higher-qualification restrictions stay separate',()=>{
 const profile={degree:'B.Tech.',branch:'ECE',firstClass:true,gatePaper:'EC',gateYear:2025,gateValid:true,dob:'2001-06-01',category:'GEN'};
 assert.equal(evaluate('drdo_rac_156_electronics',profile).status,'potential');
 for(const id of ['drdo_ceptam11_sta_b_0108','drdo_ceptam11_tech_a_higher_qualification_rule']){
  const result=evaluate(id,{...profile,qualifications:[{degree:'Diploma',branch:'ECE'}],exactTechnicianTradeQualificationVerified:true});
  assert.equal(result.status,'ineligible');
  assert(result.reasons.some(reason=>reason.code==='excluded_higher_degree'));
 }
 assert.equal(evaluate('drdo_ceptam11_sta_b_0108',{...profile,degree:'Diploma',otherDegrees:['B.Tech.']}).status,'ineligible');
 assert.equal(evaluate('drdo_ceptam11_sta_b_0108',{degree:'Diploma',branch:'ECE',dob:'2001-06-01',category:'GEN'}).status,'potential');
});

test('RRB Technician Grade I does not inherit CEPTAM or Grade III degree exclusions',()=>{
 const result=evaluate('rrb_technician_signal_2025',{degree:'B.Tech.',branch:'Electronics Engineering'});
 assert.equal(result.status,'potential');
 assert.equal(result.reasons.some(reason=>reason.code==='excluded_higher_degree'),false);
 assert(post('rrb_technician_signal_2025').eligibility.acceptedDegrees.includes('B.Tech.'));
});

test('critical 7: BARC Electronics supports separate online-exam and GATE EC screening routes',()=>{
 const profile={degree:'B.Tech.',branch:'ETC',percentage:60,dob:'2001-06-01',category:'GEN',citizenship:'India',selectionRoute:'barc_exam'};
 const online=evaluate('barc_oces_2026_electronics',profile);
 assert.equal(online.status,'potential');
 assert.equal(online.missingFields.includes('gatePaper'),false);
 assert.equal(evaluate('barc_oces_2026_electronics',{...profile,selectionRoute:'gate'}).status,'insufficient');
 assert.equal(evaluate('barc_oces_2026_electronics',{...profile,selectionRoute:'gate',gatePaper:'EE',gateYear:2026,gateValid:true}).status,'ineligible');
 assert.equal(evaluate('barc_oces_2026_electronics',{...profile,selectionRoute:'gate',gatePaper:'EC',gateYear:2026,gateValid:true}).status,'potential');
 assert.equal(evaluate('barc_oces_2026_electronics',{...profile,percentage:59.99}).status,'ineligible');
});

test('critical 8: historical ISRO remains closed and every bundled notice avoids invented reminders',()=>{
 const isro=RECRUITMENT_NOTICES.find(notice=>notice.id==='isro_icrb_emc_2025');
 assert.equal(opportunityStatus(isro,{now}),'closed');
 assert.equal(isro.deadlineDate,'2025-06-16');
 for(const notice of RECRUITMENT_NOTICES){
  assert.notEqual(opportunityStatus(notice,{now}),'open',notice.id);
  assert.equal(notice.deadlineAt,null);assert.equal(notice.deadlineTimezone,null);assert.equal(notice.deadlineVerified,false);
 }
 for(const pathway of TECHNICAL_PATHWAYS)assert.equal(pathway.currentlyHiring,false);
 const upsc=RECRUITMENT_NOTICES.find(notice=>notice.id==='upsc_ese_2027');
 assert.equal(upsc.examDate,'2027-01-31');assert.equal(opportunityStatus(upsc,{now}),'closed');
});

test('percentage and CGPA retain source units, zero, and explicit conflicting-basis handling',()=>{
 const criteria={minimumPercentage:60,minimumCgpa:6,cgpaScale:10};
 assert.equal(match({percentage:60},criteria).status,'eligible');
 assert.equal(match({percentage:0},criteria).status,'ineligible');
 assert.equal(match({cgpa:6,cgpaScale:10},criteria).status,'eligible');
 assert.equal(match({cgpa:3,cgpaScale:4},criteria).status,'insufficient');
 assert.equal(match({percentage:55,cgpa:8,cgpaScale:10},criteria).status,'potential');
 assert.equal(match({percentage:55,cgpa:8,cgpaScale:10,gradeBasis:'percentage'},criteria).status,'ineligible');
 assert.equal(match({percentage:55,cgpa:8,cgpaScale:10,gradeBasis:'cgpa'},criteria).status,'eligible');
});

test('age uses published reference date, exact boundary and category relaxation, not current age',()=>{
 const criteria={age:{minimum:18,maximum:30,maximumExclusive:true,asOfDate:'2026-08-01',relaxations:{GEN:0,OBC_NCL:3,SC:5}}};
 assert.equal(match({dob:'1996-08-02',category:'GEN'},criteria).status,'eligible');
 assert.equal(match({dob:'1996-08-01',category:'GEN'},criteria).status,'ineligible');
 assert.equal(match({dob:'1996-08-01',category:'OBC-NCL'},criteria).status,'eligible');
 assert.equal(match({age:24,category:'GEN'},criteria).status,'insufficient');
 assert.equal(match({dob:'1996-08-01'},criteria).status,'insufficient');
 assert.equal(match({dob:'2008-08-02',category:'GEN'},criteria).status,'ineligible');
 assert.equal(match({dob:'2001-02-30',category:'GEN'},criteria).status,'insufficient');
});

test('graduation, experience, prior-exam and physical conditions are independent post rules',()=>{
 const criteria={graduationYear:{minimum:2024,maximum:2026},experienceMonths:24,requiredExams:['technical-prerequisite'],conditions:[{field:'medicalStandardMet',equals:true,label:'Published medical standard'}]};
 const profile={graduationYear:2025,experienceMonths:24,qualifiedExams:['technical-prerequisite'],medicalStandardMet:true};
 assert.equal(match(profile,criteria).status,'eligible');
 for(const override of [{graduationYear:2023},{experienceMonths:23},{qualifiedExams:[]},{medicalStandardMet:false}])assert.equal(match({...profile,...override},criteria).status,'ineligible');
 assert.equal(match({...profile,medicalStandardMet:undefined},criteria).status,'insufficient');
 const inherited=Object.create({medicalStandardMet:true});
 assert.equal(match({...profile,medicalStandardMet:undefined,conditions:inherited},criteria).status,'insufficient');
});

test('GATE raw marks, wrong paper/year, and model score are never silently treated as official score',()=>{
 const criteria={gate:{required:true,papers:['EC'],years:[2025,2026],minimumScore:600,validRequired:true}};
 const profile={gatePaper:'EC',gateYear:2025,gateScore:650,gateScoreBasis:'official',gateValid:true};
 assert.equal(match(profile,criteria).status,'eligible');
 assert.equal(match({...profile,gatePaper:'EE'},criteria).status,'ineligible');
 assert.equal(match({...profile,gateYear:2024},criteria).status,'ineligible');
 assert.equal(match({...profile,gateScore:55},criteria).status,'ineligible');
 assert.equal(match({...profile,gateScore:undefined,marks:55},criteria).status,'insufficient');
 assert.equal(match({...profile,gateScoreBasis:'model_approximation'},criteria).status,'potential');
 assert.equal(match({...profile,gateScoreBasis:'model_approximation'},{gate:{required:true,papers:['EC'],validRequired:true}}).status,'potential');
});

test('partial or unmapped criteria, absent profile and unknown authority equivalence cannot guarantee eligibility',()=>{
 assert.equal(match({}, {complete:false}).status,'potential');
 assert.equal(match({}, {unmappedConditions:['Unmapped published qualification condition']}).status,'potential');
 assert.equal(evaluateTechnicalEligibility({},fixture(),{now}).status,'insufficient');
 assert.equal(evaluateTechnicalEligibility({degree:'B.Tech.',branch:'ECE'},{technical:true,eligibility:{verified:false}},{now}).status,'insufficient');
 assert.equal(match({},{acceptedDegrees:[],acceptedBranches:[]}).status,'insufficient');
 assert.equal(evaluatePostEligibility(fixture(),{degree:'B.Tech.',branch:'ECE'},{now}).label,ELIGIBILITY_LABELS.eligible);
 assert.equal(evaluateTechnicalEligibility(null,null,{now}).status,'insufficient');
 assert.equal(evaluateTechnicalEligibility({degree:'B.Tech.',branch:'ECE'},fixture(),{now:'2025-01-01T00:00:00Z'}).status,'insufficient');
 assert.equal(match({},{qualificationAlternatives:[null]}).status,'insufficient');
 assert.equal(match({},{conditions:[null]}).status,'insufficient');
 assert.match(match().disclaimer,/not an admission, employment or selection guarantee/);
 for(const actual of RECRUITMENT_POSTS)assert.notEqual(actual.eligibility.complete,true);
});

test('source authority is exact-host HTTPS; source IDs preserve truthful verification and monitoring status',()=>{
 for(const invalid of ['http://ssc.gov.in/','https://ssc.gov.in.evil.example/','https://user@ssc.gov.in/','https://ssc.gov.in:8080/','https://127.0.0.1/','javascript:alert(1)'])assert.equal(isApprovedRecruitmentUrl(invalid),false,invalid);
 assert.equal(isApprovedRecruitmentUrl('https://ssc.gov.in/'),true);
 assert.equal(validateEligibilityRule({verified:true,sourceUrl:'https://evil.example/',verifiedAt:SOURCE_REVIEWED_AT}).valid,false);
 const sourceMap=new Map(RECRUITMENT_SOURCES.map(source=>[source.id,source]));
 assert.equal(sourceMap.size,RECRUITMENT_SOURCES.length);
 for(const notice of RECRUITMENT_NOTICES){
  const source=sourceMap.get(notice.sourceId);assert(source,notice.id);
  assert.equal(source.url,notice.sourceUrl);assert(source.organizationIds.includes(notice.organizationId));
  assert(source.allowedHosts.includes(new URL(notice.sourceUrl).hostname));
  if(notice.verificationStatus==='verified')assert.equal(source.official,true,notice.id);
 }
 for(const source of RECRUITMENT_SOURCES){
  if(source.enabled){assert.equal(source.official,true);assert.equal(source.adapter,'html_links');}
  else assert.equal(source.adapter,'manual_review');
  if(['unverified','official_search_reference'].includes(source.verification.status))assert.equal(source.official,false);
  assert.equal(source.verification.publishedAt,null);
 }
 assert.equal(new Set(ORGANIZATIONS.map(item=>item.id)).size,ORGANIZATIONS.length);
 assert.equal(new Set(EXAMINATIONS.map(item=>item.id)).size,EXAMINATIONS.length);
});

test('opportunity state requires verified dates and handles expired, withdrawn, cancelled and future opening',()=>{
 const notice={sourceUrl:'https://www.isro.gov.in/Careers.html',verifiedAt:SOURCE_REVIEWED_AT,verificationStatus:'verified',status:'open',deadlineVerified:true,deadlineAt:'2026-11-20T17:00:00+05:30',deadlineTimezone:'Asia/Kolkata',applicationOpensAt:'2026-11-01T09:00:00+05:30'};
 assert.equal(opportunityStatus(notice,{now}),'open');
 assert.equal(opportunityStatus({...notice,deadlineAt:'2026-11-01T17:00:00+05:30'},{now}),'closed');
 for(const status of ['closed','cancelled','withdrawn'])assert.equal(opportunityStatus({...notice,status},{now}),status);
 assert.equal(opportunityStatus({...notice,deadlineVerified:false},{now}),'dates_unverified');
 assert.equal(opportunityStatus({...notice,deadlineAt:'2026-11-20'},{now}),'dates_unverified');
 assert.equal(opportunityStatus({...notice,deadlineTimezone:'invalid-zone'},{now}),'dates_unverified');
 assert.equal(opportunityStatus({...notice,applicationOpensAt:'2026-11-19T09:00:00+05:30'},{now}),'announced');
 assert.equal(opportunityStatus({...notice,deadlineAt:'2027-02-30T17:00:00+05:30'},{now}),'dates_unverified');
});

test('directory filters combine technical scope, sector, state, route and provenance',()=>{
 const filtered=filterPathways({sector:'state',state:'Maharashtra',query:'Telecommunication'});
 assert.equal(filtered.length,1);assert.equal(filtered[0].id,'msetcl_telecom');
 assert(filterPathways({sector:'private'}).length>=15);
 assert(filterPathways({routeType:'gate'}).every(pathway=>pathway.routeType==='gate'));
 assert(filterPathways({verification:'unverified'}).every(pathway=>pathway.verification.status==='unverified'));
 assert(Object.isFrozen(TECHNICAL_PATHWAYS[0]));assert(Object.isFrozen(RECRUITMENT_SOURCES[0].allowedHosts));
});
