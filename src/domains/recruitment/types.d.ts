/** Recruitment data contract. Directory relevance is never notice/post eligibility. */
export type EligibilityStatus='eligible'|'potential'|'ineligible'|'insufficient';
export type SourceReview='official_page_checked'|'official_pdf_checked'|'official_search_reference'|'unverified';
export type RouteType='gate'|'independent_exam'|'direct'|'mixed';
export type Sector='national'|'scientific'|'defence'|'space'|'telecom'|'psu'|'state'|'private';
export interface SourceVerification {
 status:SourceReview; checkedAt:string; publishedAt:string|null; method:string; eligibilityVerified:boolean;
}
export interface RecruitmentSource {
 id:string; organizationId:string; organizationIds:readonly string[]; name:string; url:string;
 allowedHosts:readonly string[]; official:boolean; adapter:'html_links'|'manual_review';
 technicalOnly:true; enabled:boolean; checkIntervalHours:number; verification:SourceVerification; limitations:string;
}
export interface Organization {
 id:string; name:string; sector:Sector; states:readonly string[]; sourceUrl:string; sourceIds:readonly string[];
 verification:SourceVerification; currentlyHiring:false;
}
export interface RecruitingBody {id:string;organizationId:string;name:string}
export interface TechnicalPathway {
 id:string; organizationId:string; organization:string; recruitingBodyId:string; recruitingBody:string;
 examinationId:string; examination:string; pathwayTitle:string; sector:Sector; routeType:RouteType;
 states:readonly string[]; locations:readonly string[]; branches:readonly string[]; technical:true;
 status:'historical_watch'|'unverified_source'; sourceIds:readonly string[]; sourceUrl:string;
 verification:SourceVerification; currentlyHiring:false; eligibilityNote:string;
}
export interface Qualification {degree?:string;branch?:string}
export interface CandidateProfile extends Qualification {
 qualifications?:readonly Qualification[]; otherDegrees?:readonly string[];
 graduationYear?:number|string; percentage?:number|string; cgpa?:number|string; cgpaScale?:number|string;
 gradeBasis?:'percentage'|'cgpa'; dob?:string; birthDate?:string; ageOnCriteriaDate?:number|string;
 category?:string; experienceMonths?:number|string; selectionRoute?:string; gatePaper?:string;
 gateYear?:number|string; gateScore?:number|string; gateScoreBasis?:'official'|'model_approximation'|string;
 gateValid?:boolean; qualifiedExams?:readonly string[]; conditions?:Record<string,unknown>;
 class12Subjects?:readonly string[]; degreeSubjects?:readonly string[]; firstClass?:boolean;
 citizenship?:string; gender?:string; [field:string]:unknown;
}
export interface EligibilityCondition {
 field:string; label?:string; equals?:unknown; includes?:string; anyOf?:readonly string[];
 minimum?:number; maximum?:number;
}
export interface AcademicRule {
 acceptedDegrees?:readonly string[]; acceptedBranches?:readonly string[]; equivalenceReview?:boolean;
 conditions?:readonly EligibilityCondition[];
}
export interface EligibilityRule extends AcademicRule {
 verified:boolean; complete:boolean; sourceUrl:string; sourceSection?:string; verifiedAt:string|null;
 verificationMethod?:string; unmappedConditions?:readonly string[]; excludedDegrees?:readonly string[];
 qualificationAlternatives?:readonly (AcademicRule&{id?:string;label?:string})[];
 minimumPercentage?:number; minimumCgpa?:number; cgpaScale?:number;
 age?:{minimum?:number;maximum:number;maximumExclusive?:boolean;asOfDate:string;relaxations?:Record<string,number>};
 allowedCategories?:readonly string[]; graduationYear?:{minimum?:number;maximum?:number}; experienceMonths?:number;
 selectionRoutes?:readonly string[];
 gate?:{required?:boolean;appliesWhen?:{field:string;equals:unknown};papers?:readonly string[];years?:readonly number[];minimumScore?:number;validRequired?:boolean};
 requiredExams?:readonly string[];
}
export interface RecruitmentPost {
 id:string; organizationId:string; recruitingBodyId:string; examinationId:string; pathwayId:string; cycleId:string;
 noticeId:string; title:string; technical:true; noticeStatus:string; sourceId:string|null; sourceUrl:string;
 eligibility:EligibilityRule; degreeNote?:string; additionalSourceUrls?:readonly string[];
}
export interface RecruitmentNotice {
 id:string; organizationId:string; recruitingBodyId:string; examinationId:string; cycleId:string; title:string;
 technical:true; status:string; publishedAt:string|null; publicationPrecision:'date'|null; checkedAt:string;
 verifiedAt:string|null; verificationStatus:'verified'|'partial_official_reference'|'review_pending';
 sourceId:string; sourceUrl:string; applicationUrl:string; applicationOpensAt:string|null;
 deadlineAt:string|null; deadlineTimezone:string|null; deadlineVerified:boolean; deadlineDate:string|null;
 dateNote:string; examDate?:string; examAt?:string|null; posts:readonly RecruitmentPost[]; version:number;
}
export interface RecruitmentCycle {
 id:string; organizationId:string; recruitingBodyId:string; examinationId:string; title:string; status:string;
 noticeIds:readonly string[]; sourceId:string;
}
export interface EligibilityReason {
 level:'pass'|'fail'|'missing'|'potential'; field:string; code:string; message:string; sourceUrl:string|null;
}
export interface EligibilityResult {
 status:EligibilityStatus; label:string; reasons:readonly EligibilityReason[]; missingFields:readonly string[];
 evidence:readonly {sourceUrl:string;verifiedAt:string|null;noticeId:string|null;postId:string|null;complete:boolean}[];
 asOf:string; noticeStatus:string|null; disclaimer:string;
}
