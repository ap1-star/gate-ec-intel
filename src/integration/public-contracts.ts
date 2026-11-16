/** Public, versioned research records. These types must never contain candidate identity or progress. */
export type QuestionId = string;
export type DatasetVersion = string;
export type IsoDateTime = string;
export type SourceConfidence = "verified" | "unverified" | "hypothetical";
export interface SourceEvidence {
  readonly url: string | null;
  readonly title: string;
  readonly datasetVersion: DatasetVersion;
  readonly sourceClaim: SourceConfidence;
  readonly review: "not_reviewed" | "source_reviewed" | "independently_reviewed";
  readonly limitations: readonly string[];
}
export interface ResearchScope {
  readonly fromYear: number;
  readonly toYear: number;
  readonly subjects: readonly string[];
  readonly review: "all" | "exclude_ambiguous" | "changed_subject";
}
export interface StructuralDifficulty {
  readonly score: number;
  readonly scale: 100;
  readonly basis: "structural_content_review";
  readonly band: "Easy" | "Moderate" | "Tough";
  readonly confidence: string;
  readonly empiricalAccuracy: number | null;
  readonly calibratedIrtDifficulty: number | null;
}
export interface ResearchQuestion {
  readonly id: QuestionId;
  readonly year: number;
  readonly section: "EC" | "GA";
  readonly subject: string;
  readonly topic: string;
  readonly topicFamily: string;
  readonly microtopic: string;
  readonly marks: number;
  readonly format: "MCQ" | "MSQ" | "NAT";
  readonly scoringStatus: string;
  readonly difficulty: StructuralDifficulty;
  readonly source: SourceEvidence;
  readonly openIssueCount: number;
}
export interface AnnualAllocation {
  readonly year: number;
  readonly subject: string;
  readonly questionCount: number;
  readonly marks: number;
  readonly paperTotal: number;
}
export interface DescriptiveSummary {
  readonly samplingUnit: "annual_paper" | "question";
  readonly n: number;
  readonly mean: number | null;
  readonly median: number | null;
  readonly sampleSd: number | null;
  readonly iqr: number | null;
  readonly coefficientOfVariation: number | null;
}
export interface ResearchResult<T> {
  readonly datasetVersion: DatasetVersion;
  readonly scope: ResearchScope;
  readonly generatedAt: IsoDateTime;
  readonly value: T;
  readonly methods: readonly string[];
  readonly limitations: readonly string[];
}
export interface ScenarioAssumptions {
  readonly basis: "hypothetical_allocation";
  readonly weighting: "equal" | "recent";
  readonly multipliers: Readonly<Record<string, number>>;
  readonly scope: ResearchScope;
}
export interface ScenarioResult {
  readonly basis: "hypothetical_allocation";
  readonly allocations: readonly { readonly subject: string; readonly marks: number }[];
  readonly total: number;
  readonly limitations: readonly string[];
}
export interface PyqSourceIndex {
  readonly canonicalQuestionId: QuestionId | null;
  readonly legacyPortalItemId: string | null;
  readonly granularity: "question" | "full_paper";
  readonly year: number;
  readonly source: SourceEvidence;
  readonly answerKeyUrl: string | null;
}
export type CandidateCategory = "GEN" | "GEN_EWS" | "OBC_NCL" | "SC" | "ST";
export interface RankRequest {
  readonly marks: number;
  readonly year: number;
  readonly category: CandidateCategory;
  readonly hypotheticalToughness?: number;
}
export interface RankEstimate {
  readonly request: RankRequest;
  readonly rank: number;
  readonly score: number | null;
  readonly method: string;
  readonly evidence: readonly SourceEvidence[];
  /** Existing portal ±0.75 mark ranges are sensitivity bounds, never confidence intervals. */
  readonly range: { readonly kind: "marks_sensitivity"; readonly marksOffset: number; readonly lowRank: number; readonly highRank: number } | null;
  readonly calibration: { readonly status: "not_validated"; readonly limitations: readonly string[] } | { readonly status: "held_out_validated"; readonly reportUrl: string; readonly validationDatasetVersion: DatasetVersion };
  readonly hypothetical: boolean;
}
export interface AdmissionQuery {
  readonly year: number;
  readonly category: CandidateCategory;
  readonly rank?: number;
  readonly gateScore?: number;
  readonly programmeId?: string;
  readonly round?: string;
}
export interface AdmissionEvidence {
  readonly instituteId: string;
  readonly programmeId: string | null;
  readonly basis: "historical_programme_cutoff" | "tier_benchmark" | "data_needed";
  readonly year: number | null;
  readonly category: CandidateCategory | null;
  readonly round: string | null;
  readonly cutoffUnit: "gate_score" | "air" | null;
  readonly cutoff: number | null;
  readonly status: string;
  readonly evidence: readonly SourceEvidence[];
}
export interface InstituteRecord {
  readonly id: string;
  readonly name: string;
  readonly programmeIds: readonly string[];
  readonly evidence: readonly SourceEvidence[];
}
export interface PsuRecord {
  readonly id: string;
  readonly name: string;
  readonly recruitmentYear: number | null;
  readonly disciplines: readonly string[];
  readonly eligibilityNote: string;
  readonly referenceOnly: boolean;
  readonly evidence: readonly SourceEvidence[];
}
