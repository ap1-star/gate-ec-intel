import type { AdmissionEvidence, AdmissionQuery, AnnualAllocation, DescriptiveSummary, InstituteRecord, PsuRecord, PyqSourceIndex, QuestionId, RankEstimate, RankRequest, ResearchQuestion, ResearchResult, ResearchScope, ScenarioAssumptions, ScenarioResult } from "./public-contracts.js";
import type { AuthState, CandidateProfile, MockAttempt, Notification, OwnerMetrics, PersonalDashboard, Principal, PublicDiscussion, PublicReply, PyqBookmark, Reminder, SavedPrediction, StudyPlanInput, StudyTask } from "./private-contracts.js";

export type ServiceName = "research" | "statistics" | "pyq" | "scenarios" | "rank" | "admissions" | "institutes" | "psu" | "identity" | "dashboard" | "planner" | "mocks" | "reminders" | "community" | "owner_metrics";
export type ServiceResult<T> =
  | { readonly status: "ok"; readonly data: T }
  | { readonly status: "unavailable"; readonly code: "not_configured" | "planned" | "unsupported_provider"; readonly message: string }
  | { readonly status: "error"; readonly code: "unauthorized" | "forbidden" | "invalid_input" | "not_found" | "dependency_failed"; readonly message: string; readonly requestId?: string };
export interface CapabilityStatus { readonly service: ServiceName; readonly status: "available" | "planned" | "not_configured"; readonly reason?: string; }
export interface ResearchService {
  questions(scope: ResearchScope): Promise<ServiceResult<ResearchResult<readonly ResearchQuestion[]>>>;
  question(id: QuestionId): Promise<ServiceResult<ResearchQuestion>>;
}
export interface StatisticsService {
  annualAllocations(scope: ResearchScope): Promise<ServiceResult<ResearchResult<readonly AnnualAllocation[]>>>;
  describe(scope: ResearchScope, subject: string): Promise<ServiceResult<ResearchResult<DescriptiveSummary>>>;
}
export interface PyqService { sources(scope: ResearchScope): Promise<ServiceResult<readonly PyqSourceIndex[]>>; }
export interface ScenarioService { simulate(input: ScenarioAssumptions): Promise<ServiceResult<ScenarioResult>>; }
export interface RankService { estimate(input: RankRequest): Promise<ServiceResult<RankEstimate>>; }
export interface AdmissionsService { lookup(input: AdmissionQuery): Promise<ServiceResult<readonly AdmissionEvidence[]>>; }
export interface InstitutesService { list(): Promise<ServiceResult<readonly InstituteRecord[]>>; }
export interface PsuService { list(year?: number): Promise<ServiceResult<readonly PsuRecord[]>>; }
export interface IdentityService {
  currentSession(): Promise<AuthState>;
  signOut(): Promise<ServiceResult<void>>;
}
/** All private service implementations derive ownership from this server-verified principal. Public HTTP input must not supply it. */
export interface PrivateContext { readonly principal: Principal; }
export interface DashboardService {
  overview(context: PrivateContext): Promise<ServiceResult<PersonalDashboard>>;
  profile(context: PrivateContext): Promise<ServiceResult<CandidateProfile>>;
  saveProfile(context: PrivateContext, input: Omit<CandidateProfile, "userId">): Promise<ServiceResult<CandidateProfile>>;
  savedPredictions(context: PrivateContext): Promise<ServiceResult<readonly SavedPrediction[]>>;
  savePrediction(context: PrivateContext, request: RankRequest): Promise<ServiceResult<SavedPrediction>>;
  bookmarks(context: PrivateContext): Promise<ServiceResult<readonly PyqBookmark[]>>;
  setBookmark(context: PrivateContext, questionId: QuestionId, saved: boolean): Promise<ServiceResult<void>>;
}
export interface PlannerService {
  tasks(context: PrivateContext): Promise<ServiceResult<readonly StudyTask[]>>;
  create(context: PrivateContext, input: StudyPlanInput): Promise<ServiceResult<readonly StudyTask[]>>;
  setComplete(context: PrivateContext, taskId: string, completed: boolean): Promise<ServiceResult<void>>;
}
export interface MockService {
  list(context: PrivateContext): Promise<ServiceResult<readonly MockAttempt[]>>;
  add(context: PrivateContext, input: Omit<MockAttempt, "id" | "userId" | "createdAt" | "provenance">): Promise<ServiceResult<MockAttempt>>;
}
export interface ReminderService {
  list(context: PrivateContext): Promise<ServiceResult<readonly Reminder[]>>;
  create(context: PrivateContext, input: Pick<Reminder, "title" | "dueAt" | "timezone" | "cadence">): Promise<ServiceResult<Reminder>>;
  setEnabled(context: PrivateContext, reminderId: string, enabled: boolean): Promise<ServiceResult<Reminder>>;
  notifications(context: PrivateContext): Promise<ServiceResult<readonly Notification[]>>;
}
export interface CommunityService {
  threads(): Promise<ServiceResult<readonly PublicDiscussion[]>>;
  replies(threadId: string): Promise<ServiceResult<readonly PublicReply[]>>;
  createThread(context: PrivateContext, input: Pick<PublicDiscussion, "title" | "body" | "subject" | "tags">): Promise<ServiceResult<PublicDiscussion>>;
  reply(context: PrivateContext, threadId: string, body: string): Promise<ServiceResult<PublicReply>>;
  vote(context: PrivateContext, entity: "thread" | "reply", id: string): Promise<ServiceResult<void>>;
}
export interface OwnerMetricsService { aggregate(context: PrivateContext, days: 7 | 28 | 90): Promise<ServiceResult<OwnerMetrics>>; }
export interface SchedulerDelivery {
  readonly eventId: string;
  readonly providerTaskId: string;
  readonly receivedAt: string;
}
export interface SchedulerAdapter {
  schedule(context: PrivateContext, reminder: Reminder): Promise<ServiceResult<{ readonly providerTaskId: string; readonly nextExecutionAt: string | null }>>;
  pause(context: PrivateContext, providerTaskId: string): Promise<ServiceResult<void>>;
  /** Provider signature/replay validation belongs in the future server transport, before this call. */
  deliver(event: SchedulerDelivery): Promise<ServiceResult<{ readonly outcome: "delivered" | "duplicate" | "skipped" }>>;
}
