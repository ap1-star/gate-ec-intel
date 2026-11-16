import {isApprovedRecruitmentUrl,isExcludedRecruitment} from './registry.mjs';

export const ELIGIBILITY_LABELS=Object.freeze({
 eligible:'Eligible under verified published criteria',
 potential:'Potentially eligible; further verification needed',
 ineligible:'Not eligible under a documented rule',
 insufficient:'Insufficient information'
});
const missing=value=>value===undefined||value===null||typeof value==='string'&&value.trim()==='';
const numeric=value=>!missing(value)&&['string','number'].includes(typeof value)&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim())&&Number.isFinite(Number(value))?Number(value):null;
const token=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'');
const branchAliases=Object.freeze({ece:'electronicsandcommunicationengineering',ec:'electronicsandcommunicationengineering',etc:'electronicsandtelecommunicationengineering',entc:'electronicsandtelecommunicationengineering',ee:'electricalengineering',eee:'electricalandelectronicsengineering',cse:'computerscienceandengineering',it:'informationtechnology',me:'mechanicalengineering',ce:'civilengineering'});
const branch=value=>branchAliases[token(value)]??token(value).replace(/engg$/,'engineering');
const degreeAliases=Object.freeze({btech:'btech',bacheloroftechnology:'btech',be:'be',bachelorofengineering:'be',bscengineering:'bscengineering',bachelorofscienceengineering:'bscengineering',diploma:'diploma',engineeringdiploma:'diploma',bsc:'bsc',bachelorofscience:'bsc',msc:'msc',masterofscience:'msc',mtech:'mtech',masteroftechnology:'mtech',phd:'phd',doctorofphilosophy:'phd',iti:'iti',itincvt:'iti',itiscvt:'iti'});
const degree=value=>degreeAliases[token(value)]??token(value);
const category=value=>({ur:'GEN',general:'GEN',gen:'GEN',ews:'EWS',genews:'EWS',obc:'OBC_NCL',obcncl:'OBC_NCL',sc:'SC',st:'ST',pwbd:'PWBD'}[token(value)]??String(value??''));
function day(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const parsed=new Date(value+'T00:00:00Z');return Number.isFinite(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value?parsed:null;
}
function completedAge(dob,asOf){
 const birth=day(dob),cutoff=day(asOf);if(!birth||!cutoff||birth>cutoff)return null;
 return cutoff.getUTCFullYear()-birth.getUTCFullYear()-((cutoff.getUTCMonth()<birth.getUTCMonth()||cutoff.getUTCMonth()===birth.getUTCMonth()&&cutoff.getUTCDate()<birth.getUTCDate())?1:0);
}
function conditionValue(profile,field){return Object.hasOwn(profile,field)?profile[field]:profile.conditions&&Object.hasOwn(profile.conditions,field)?profile.conditions[field]:undefined;}
function checkCondition(condition,profile,add){
 const value=conditionValue(profile,condition.field),label=condition.label??condition.field;
 if(missing(value)){add('missing',condition.field,'missing_condition',label+' has not been provided.');return;}
 if(Object.hasOwn(condition,'equals')){
  if(value!==condition.equals)add('fail',condition.field,'condition_mismatch',label+' does not meet the published condition.');
  else add('pass',condition.field,'condition_met',label+' matches the recorded condition.');
 }else if(Object.hasOwn(condition,'includes')){
  if(!Array.isArray(value)){add('missing',condition.field,'invalid_condition',label+' must be provided as an explicit list.');return;}
  if(value.some(item=>token(item)===token(condition.includes)))add('pass',condition.field,'condition_met',label+' includes '+condition.includes+'.');
  else add('fail',condition.field,'condition_mismatch',label+' does not include '+condition.includes+'.');
 }else if(condition.minimum!==undefined||condition.maximum!==undefined){
  const number=numeric(value);
  if(number===null)add('missing',condition.field,'invalid_condition',label+' requires a numeric value in the specified unit.');
  else if(number<(condition.minimum??-Infinity)||number>(condition.maximum??Infinity))add('fail',condition.field,'condition_mismatch',label+' is outside the published range.');
  else add('pass',condition.field,'condition_met',label+' meets the published range.');
 }else if(Array.isArray(condition.anyOf)){
  if(condition.anyOf.some(item=>token(item)===token(value)))add('pass',condition.field,'condition_met',label+' matches a listed value.');
  else add('fail',condition.field,'condition_mismatch',label+' is outside the recorded accepted values.');
 }else add('potential',condition.field,'manual_condition',label+' requires manual review of the official notice.');
}
function academicChecks(rule,profile,add){
 const qualifications=[{degree:profile.degree,branch:profile.branch},...(Array.isArray(profile.qualifications)?profile.qualifications:[])];
 if(rule.acceptedDegrees?.length){
  const supplied=qualifications.filter(item=>!missing(item.degree));
  if(!supplied.length)add('missing','degree','missing_degree','Provide the exact qualifying degree; a higher degree is not automatically equivalent.');
  else if(!supplied.some(item=>rule.acceptedDegrees.some(value=>degree(value)===degree(item.degree))))add('fail','degree','degree_mismatch','The supplied degree is not among the published qualifying degrees.');
  else add('pass','degree','degree_match','A supplied qualification matches a published degree type.');
 }
 if(rule.acceptedBranches?.length){
  const candidates=qualifications.filter(item=>!rule.acceptedDegrees?.length||rule.acceptedDegrees.some(value=>degree(value)===degree(item.degree)));
  const supplied=candidates.filter(item=>!missing(item.branch));
  if(!supplied.length)add('missing','branch','missing_branch','Provide the branch belonging to the qualifying degree.');
  else if(supplied.some(item=>rule.acceptedBranches.some(value=>branch(value)===branch(item.branch))))add('pass','branch','branch_match','The exact branch or an explicitly listed abbreviation matches.');
  else if(rule.equivalenceReview)add('potential','branch','equivalence_unconfirmed','The exact degree title is not listed verbatim; the recruiting authority must confirm equivalence.');
  else add('fail','branch','branch_mismatch','The qualifying branch is not listed for this individual post.');
 }
 for(const condition of rule.conditions??[])checkCondition(condition,profile,add);
}
export function validateEligibilityRule(rule){
 const errors=[];
 if(!rule||typeof rule!=='object'||Array.isArray(rule))return {valid:false,errors:['An individual-post eligibility rule is required.']};
 for(const field of ['acceptedDegrees','acceptedBranches','excludedDegrees','conditions','requiredExams','qualificationAlternatives'])if(rule[field]!==undefined&&!Array.isArray(rule[field]))errors.push(field+' must be a list.');
 for(const alternative of Array.isArray(rule.qualificationAlternatives)?rule.qualificationAlternatives:[]){
  if(!alternative||typeof alternative!=='object'||Array.isArray(alternative)){errors.push('Every qualification alternative requires an explicit rule.');continue;}
  for(const field of ['acceptedDegrees','acceptedBranches','conditions'])if(alternative[field]!==undefined&&!Array.isArray(alternative[field]))errors.push('Alternative '+field+' must be a list.');
 }
 const allConditions=[...(Array.isArray(rule.conditions)?rule.conditions:[]),...(Array.isArray(rule.qualificationAlternatives)?rule.qualificationAlternatives.flatMap(value=>Array.isArray(value?.conditions)?value.conditions:[]):[])];
 if(allConditions.some(value=>!value||typeof value!=='object'||typeof value.field!=='string'||!value.field.trim()))errors.push('Each condition requires an explicit field.');
 if(rule.verified===true&&(!isApprovedRecruitmentUrl(rule.sourceUrl)||!Number.isFinite(Date.parse(rule.verifiedAt??''))))errors.push('Verified rules require an allowlisted official source and a verification timestamp.');
 if(rule.minimumPercentage!==undefined&&(numeric(rule.minimumPercentage)===null||Number(rule.minimumPercentage)<0||Number(rule.minimumPercentage)>100))errors.push('Minimum percentage must be from 0 to 100.');
 if(rule.minimumCgpa!==undefined&&(numeric(rule.minimumCgpa)===null||numeric(rule.cgpaScale)===null||Number(rule.minimumCgpa)<0||Number(rule.minimumCgpa)>Number(rule.cgpaScale)))errors.push('CGPA requires a valid threshold and scale.');
 if(rule.age&&!day(rule.age.asOfDate??rule.asOfDate))errors.push('Age limits require the published reference date.');
 if(rule.age&&(numeric(rule.age.maximum)===null||Number(rule.age.maximum)<0||rule.age.minimum!==undefined&&(numeric(rule.age.minimum)===null||Number(rule.age.minimum)<0||Number(rule.age.minimum)>Number(rule.age.maximum))))errors.push('Age limits require a valid minimum and maximum.');
 if(rule.experienceMonths!==undefined&&(numeric(rule.experienceMonths)===null||Number(rule.experienceMonths)<0))errors.push('Experience must be a nonnegative number of months.');
 return {valid:errors.length===0,errors};
}
export function evaluateTechnicalEligibility(profile={},post={},options={}){
 profile=profile&&typeof profile==='object'&&!Array.isArray(profile)?profile:{};
 post=post&&typeof post==='object'&&!Array.isArray(post)?post:{};
 const now=options.now??new Date().toISOString(),asOf=now instanceof Date?now.toISOString():String(now);
 const entries=[],rule=post.eligibility??{},sourceUrl=rule.sourceUrl??post.sourceUrl??null;
 const add=(level,field,code,message)=>entries.push({level,field,code,message,sourceUrl});
 const finish=status=>({status,label:ELIGIBILITY_LABELS[status],reasons:entries,missingFields:[...new Set(entries.filter(item=>item.level==='missing').map(item=>item.field))],evidence:sourceUrl?[{sourceUrl,verifiedAt:rule.verifiedAt??null,noticeId:post.noticeId??null,postId:post.id??null,complete:rule.complete===true}]:[],asOf,
  noticeStatus:post.noticeStatus??null,disclaimer:'This compares supplied profile facts with recorded criteria. It is not an admission, employment or selection guarantee.'});
 if(isExcludedRecruitment(post)||post.technical===false){add('fail','technical','excluded_nontechnical','This is outside the technical-only recruitment scope.');return finish('ineligible');}
 if(post.technical!==true){add('missing','technical','technical_post_unverified','No verified technical post classification is available.');return finish('insufficient');}
 const validation=validateEligibilityRule(rule);
 if(!validation.valid||rule.verified!==true){
  add('missing','eligibility','criteria_unverified','Verified individual-post criteria are unavailable. Do not infer eligibility from the organization or examination.');
  for(const message of validation.errors)add('missing','eligibility','invalid_criteria',message);
  return finish('insufficient');
 }
 if(Date.parse(rule.verifiedAt)>Date.parse(asOf)){add('missing','eligibility','verification_in_future','Criteria verification is dated after this comparison; verify the source as of the requested date.');return finish('insufficient');}
 const allDegrees=[profile.degree,...(Array.isArray(profile.otherDegrees)?profile.otherDegrees:[]),...(Array.isArray(profile.qualifications)?profile.qualifications.map(item=>item.degree):[])].filter(value=>!missing(value));
 if(rule.excludedDegrees?.some(excluded=>allDegrees.some(value=>degree(value)===degree(excluded))))add('fail','degree','excluded_higher_degree','A qualification held by the candidate is explicitly excluded for this post; it does not substitute for the prescribed diploma/trade qualification.');
 if(rule.qualificationAlternatives?.length){
  const alternatives=rule.qualificationAlternatives.map(alternative=>{
   const checks=[];academicChecks(alternative,profile,(level,field,code,message)=>checks.push({level,field,code,message,sourceUrl}));return {alternative,checks};
  });
  const matched=alternatives.find(item=>item.checks.length&&!item.checks.some(check=>['fail','missing','potential'].includes(check.level)));
  if(matched){entries.push(...matched.checks);add('pass','qualificationRoute','route_match','Matched the published qualification route: '+(matched.alternative.label??matched.alternative.id??'recorded alternative')+'.');}
  else{
   const possible=alternatives.filter(item=>!item.checks.some(check=>check.level==='fail')).sort((a,b)=>a.checks.filter(check=>check.level==='missing').length-b.checks.filter(check=>check.level==='missing').length)[0];
   if(possible)entries.push(...possible.checks);
   else{add('fail','qualificationRoute','no_qualification_route','No recorded qualifying-degree/subject route matches the supplied facts.');const relevant=alternatives.find(item=>item.checks.some(check=>check.level==='pass'))??alternatives[0];if(relevant)entries.push(...relevant.checks.filter(check=>check.level==='fail'));}
  }
 }else academicChecks(rule,profile,add);
 if(rule.graduationYear){
  const value=numeric(profile.graduationYear);
  if(value===null||!Number.isInteger(value))add('missing','graduationYear','missing_graduation_year','Provide the actual or expected graduation year.');
  else if(value<(rule.graduationYear.minimum??0)||value>(rule.graduationYear.maximum??9999))add('fail','graduationYear','graduation_year_mismatch','Graduation year is outside the published window.');
  else add('pass','graduationYear','graduation_year_match','Graduation year is inside the recorded window.');
 }
 if(rule.minimumPercentage!==undefined||rule.minimumCgpa!==undefined){
  const percentage=numeric(profile.percentage),cgpa=numeric(profile.cgpa),scale=numeric(profile.cgpaScale),basis=profile.gradeBasis;
  const percentKnown=percentage!==null&&percentage>=0&&percentage<=100,gpaKnown=cgpa!==null&&scale!==null&&cgpa>=0&&cgpa<=scale;
  const percentPass=rule.minimumPercentage!==undefined&&percentKnown?percentage>=rule.minimumPercentage:null;
  const gpaPass=rule.minimumCgpa!==undefined&&gpaKnown&&scale===Number(rule.cgpaScale)?cgpa>=rule.minimumCgpa:null;
  if(basis==='percentage'&&percentPass!==null)add(percentPass?'pass':'fail','percentage',percentPass?'grade_match':'grade_below_minimum','Percentage '+(percentPass?'meets':'is below')+' the published minimum.');
  else if(basis==='cgpa'&&gpaPass!==null)add(gpaPass?'pass':'fail','cgpa',gpaPass?'grade_match':'grade_below_minimum','CGPA on the specified scale '+(gpaPass?'meets':'is below')+' the published minimum.');
  else if(percentPass!==null&&gpaPass!==null&&percentPass!==gpaPass)add('potential','gradeBasis','conflicting_grade_basis','The entered percentage and CGPA give different outcomes. Select the official grading basis; no conversion is inferred.');
  else if(percentPass!==null||gpaPass!==null){const passes=percentPass??gpaPass;add(passes?'pass':'fail',percentPass!==null?'percentage':'cgpa',passes?'grade_match':'grade_below_minimum','The supplied academic grade '+(passes?'meets':'is below')+' the published threshold in its own unit.');}
  else add('missing','academicGrade','missing_grade','Provide percentage or the exact CGPA scale accepted by this notice. No percentage/CGPA conversion is assumed.');
 }
 if(rule.age){
  const ageDate=rule.age.asOfDate??rule.asOfDate;
  const fromDob=completedAge(profile.dob??profile.birthDate,ageDate),explicit=numeric(profile.ageOnCriteriaDate);
  const age=fromDob??(explicit!==null&&Number.isInteger(explicit)&&explicit>=0?explicit:null);
  const group=category(profile.category),base=Number(rule.age.maximum),relaxations=rule.age.relaxations??{};
  if(age===null)add('missing','dob','missing_age_reference','Provide date of birth, or completed age explicitly measured on '+ageDate+'. Current age is not substituted.');
  else{
   const relaxation=Object.hasOwn(relaxations,group)?Number(relaxations[group]):0,upper=base+relaxation,tooOld=rule.age.maximumExclusive?age>=upper:age>upper;
   if(age<Number(rule.age.minimum??0))add('fail','dob','below_minimum_age','Age on '+ageDate+' is below the published minimum.');
   else if(tooOld&&!Object.hasOwn(relaxations,group)&&age>=base)add('missing','category','age_relaxation_unknown','Category or applicable relaxation must be verified before an upper-age conclusion.');
   else if(tooOld)add('fail','dob','above_maximum_age','Age on '+ageDate+' exceeds the recorded limit for '+group+'.');
   else add('pass','dob','age_match','Age on the published reference date meets the recorded limit.');
  }
 }
 if(rule.allowedCategories?.length){
  if(missing(profile.category))add('missing','category','missing_category','Provide the category required for this reserved post.');
  else if(!rule.allowedCategories.map(category).includes(category(profile.category)))add('fail','category','category_mismatch','This post is restricted to the category/categories stated in the notice.');
 }
 if(rule.experienceMonths!==undefined){
  const experience=numeric(profile.experienceMonths);
  if(experience===null||experience<0)add('missing','experienceMonths','missing_experience','Provide completed relevant experience in months, counted as the notice requires.');
  else if(experience<rule.experienceMonths)add('fail','experienceMonths','insufficient_experience','Relevant experience is below the recorded minimum.');
  else add('pass','experienceMonths','experience_match','The supplied relevant experience meets the recorded minimum; supporting documents remain subject to verification.');
 }
 if(rule.selectionRoutes?.length&&!rule.selectionRoutes.includes(profile.selectionRoute))add('missing','selectionRoute','missing_selection_route','Choose one of the notice-supported screening routes: '+rule.selectionRoutes.join(', ')+'.');
 const gate=rule.gate,gateRequired=gate&&(gate.required===true||gate.appliesWhen&&conditionValue(profile,gate.appliesWhen.field)===gate.appliesWhen.equals);
 if(gateRequired){
  if(missing(profile.gatePaper))add('missing','gatePaper','missing_gate_paper','Provide the actual GATE paper code.');
  else if(gate.papers?.length&&!gate.papers.map(token).includes(token(profile.gatePaper)))add('fail','gatePaper','gate_paper_mismatch','The candidate GATE paper is not accepted for this post/route.');
  else add('pass','gatePaper','gate_paper_match','The GATE paper matches the recorded post/route.');
  if(gate.years?.length){const year=numeric(profile.gateYear);if(year===null)add('missing','gateYear','missing_gate_year','Provide the GATE examination year.');else if(!gate.years.includes(year))add('fail','gateYear','gate_year_mismatch','This GATE year is not among those accepted by the notice.');}
  if(profile.gateScoreBasis==='model_approximation')add('potential','gateScore','unofficial_gate_score','A model-derived approximate score is not an official GATE score.');
  if(gate.minimumScore!==undefined){const score=numeric(profile.gateScore);if(score===null||score<0||score>1000)add('missing','gateScore','missing_gate_score','Provide the actual GATE score /1000; raw marks and estimated AIR are not a GATE score.');else if(profile.gateScoreBasis!=='model_approximation'&&score<gate.minimumScore)add('fail','gateScore','gate_score_below_minimum','GATE score is below the documented threshold.');}
  if(gate.validRequired)checkCondition({field:'gateValid',equals:true,label:'Validity of the supplied GATE score'},profile,add);
 }
 for(const exam of rule.requiredExams??[]){
  if(!Array.isArray(profile.qualifiedExams))add('missing','qualifiedExams','missing_required_exam','Provide the explicitly required prior examination qualification.');
  else if(!profile.qualifiedExams.some(value=>token(value)===token(exam)))add('fail','qualifiedExams','required_exam_missing','The published prerequisite examination '+exam+' is not recorded as qualified.');
 }
 if(rule.qualificationAlternatives?.length)for(const condition of rule.conditions??[])checkCondition(condition,profile,add);
 if(!entries.some(item=>['pass','fail','missing','potential'].includes(item.level)))add('missing','eligibility','criteria_not_mapped','Individual-post criteria have not been mapped.');
 if(entries.some(item=>item.level==='fail'))return finish('ineligible');
 if(entries.some(item=>item.level==='missing'))return finish('insufficient');
 if(rule.complete!==true||rule.unmappedConditions?.length){add('potential','eligibility','partial_criteria','Only the cited criteria have been transcribed. Other notice conditions and corrigenda require verification.');return finish('potential');}
 if(entries.some(item=>item.level==='potential'))return finish('potential');
 return finish('eligible');
}
export const evaluatePostEligibility=(post,profile,options)=>evaluateTechnicalEligibility(profile,post,options);

const instant=value=>typeof value==='string'&&day(value.slice(0,10))&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
export function opportunityStatus(notice={},options={}){
 const nowValue=options.now??new Date().toISOString(),now=nowValue instanceof Date?nowValue.valueOf():Date.parse(String(nowValue));
 if(['cancelled','withdrawn','closed'].includes(notice.status))return notice.status;
 if(notice.status==='historical')return 'historical';
 if(!Number.isFinite(now)||notice.verificationStatus!=='verified'||!isApprovedRecruitmentUrl(notice.sourceUrl)||!Number.isFinite(Date.parse(notice.verifiedAt))||Date.parse(notice.verifiedAt)>now)return 'unverified';
 const deadline=instant(notice.deadlineAt),opens=instant(notice.applicationOpensAt);
 let validZone=false;try{if(notice.deadlineTimezone){new Intl.DateTimeFormat('en',{timeZone:notice.deadlineTimezone});validZone=true;}}catch{}
 if(notice.deadlineVerified&&deadline!==null&&validZone){if(deadline<now)return 'closed';if(opens!==null&&opens>now)return 'announced';if(opens!==null&&opens<=now||notice.status==='open')return 'open';}
 if(notice.status==='official_future_notice'||notice.status==='announced')return 'announced';
 return 'dates_unverified';
}
