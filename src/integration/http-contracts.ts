/** Part 2 JSON transport DTOs for server/api.mjs. Distinct from Part 1 domain models.
 * IDs on owned resources identify the resource; userId is never a request/response
 * ownership field. The server derives ownership from its verified session.
 * These declarations describe JSON shapes; they do not validate network input.
 */
export type HttpCategory = "GEN" | "GEN_EWS" | "OBC_NCL" | "SC" | "ST";
export type HttpAuthMode = "development" | "sites" | "unavailable";
export type HttpCalendarDate = string;
export type HttpInstant = string;
export type HttpId = string;
export type HttpApiResult<T> =
  | { readonly status: "ok"; readonly data: T }
  | { readonly status: "error" | "unavailable"; readonly code: string; readonly message: string; readonly requestId?: string };
export interface HttpCapabilities {
  readonly database: boolean;
  readonly devAuth: boolean;
  readonly platformAuth: boolean;
  readonly owner: boolean;
  readonly scheduler: boolean;
}
export type HttpSchedulerMode = "local_process" | "configured_runner" | "not_configured";
export interface HttpCapabilitiesResult extends HttpCapabilities {
  readonly authMode: HttpAuthMode;
  readonly reminderDelivery: HttpSchedulerMode;
}
export interface HttpSessionUser {
  readonly id: HttpId;
  readonly displayName: string;
  readonly isOwner: boolean;
  readonly development: boolean;
}
interface HttpSessionBase { readonly authMode: HttpAuthMode; readonly capabilities: HttpCapabilities; }
export type HttpSession = HttpSessionBase & (
  | { readonly status: "authenticated"; readonly user: HttpSessionUser; readonly csrfToken: string }
  | { readonly status: "anonymous" | "unavailable"; readonly user: null; readonly csrfToken: null }
);
export interface HttpDevLoginInput { readonly username: string; readonly password: string; }
export interface HttpDevRegisterInput extends HttpDevLoginInput { readonly displayName?: string; }
/** Register/login does not return isOwner; refresh /api/session for the full session. */
export interface HttpDevAuthResult {
  readonly user: { readonly id: HttpId; readonly displayName: string; readonly development: true };
  readonly csrfToken: string;
}
export interface HttpPageQuery { readonly limit?: number; readonly offset?: number; }
export interface HttpPage<T> { readonly items: readonly T[]; readonly limit: number; readonly offset: number; }
export interface HttpCountedPage<T> extends HttpPage<T> { readonly total: number; }
export interface HttpItems<T> { readonly items: readonly T[]; }

export interface HttpProfile {
  readonly category: HttpCategory;
  readonly targetYear: number;
  readonly examDate: HttpCalendarDate | null;
  readonly dailyMinutes: number;
  readonly reminderPreference: "none" | "in_app";
  readonly displayName: string;
  readonly updatedAt: HttpInstant;
}
export type HttpProfilePatch = Partial<Omit<HttpProfile, "updatedAt">>;
export interface HttpCollection {
  readonly id: HttpId;
  readonly name: string;
  readonly description: string;
  readonly count: number;
  readonly createdAt: HttpInstant;
}
export interface HttpCollectionInput { readonly name: string; readonly description?: string; }
export interface HttpBookmark {
  readonly id: HttpId;
  readonly targetType: "question" | "paper";
  readonly targetId: string;
  readonly collectionIds: readonly HttpId[];
  /** First membership only; use collectionIds for all memberships. */
  readonly collectionId: HttpId | null;
  readonly createdAt: HttpInstant;
}
export interface HttpBookmarkInput {
  readonly targetType: "question" | "paper";
  readonly targetId: string;
  readonly collectionId?: HttpId;
}

export interface HttpRankInput {
  readonly marks: number;
  readonly year: number;
  readonly category: HttpCategory;
  readonly toughness?: -2 | -1 | 0 | 1 | 2 | 3;
}
export type HttpSourceClaim = "verified" | "unverified" | "hypothetical";
/** Actual career adapter output. Sensitivity is not a confidence interval. */
export interface HttpRankEstimate {
  readonly marks: number;
  readonly year: number;
  readonly category: HttpCategory;
  readonly categoryLabel: string;
  readonly rank: number;
  readonly lowRank: number;
  readonly highRank: number;
  readonly score: number;
  readonly scoreConfidence: "unverified";
  readonly cutoffConfidence: "unverified";
  readonly confidence: "unverified" | "hypothetical";
  readonly confidenceNote: string;
  readonly sourceScoreClaim: "verified" | "unverified";
  readonly sourceCutoffClaim: HttpSourceClaim;
  readonly sourceClaim: HttpSourceClaim;
  readonly method: string;
  readonly categoryCutoff: number;
  readonly qualifies: boolean;
  readonly difficulty: string;
  readonly scenarioDisclosure?: string;
  readonly rangeKind: "marks_sensitivity";
  readonly sensitivityMarks: 0.75;
  readonly datasetVersion: string;
  readonly calibration: "not_validated";
  readonly evidenceLabel: string;
  readonly evidence: readonly { readonly url: string; readonly title: string; readonly sourceClaim: HttpSourceClaim; readonly review: "not_independently_reviewed" }[];
}
export interface HttpSavedEstimate {
  readonly id: HttpId;
  readonly input: HttpRankInput;
  readonly estimate: HttpRankEstimate;
  readonly datasetVersion: string;
  readonly createdAt: HttpInstant;
}

export interface HttpStudyTaskInput {
  readonly date: HttpCalendarDate;
  readonly subject: string;
  readonly topic: string;
  readonly minutes: number;
}
export interface HttpStudyTask extends HttpStudyTaskInput {
  readonly id: HttpId;
  readonly planId: HttpId;
  readonly completed: boolean;
  readonly createdAt: HttpInstant;
}
export interface HttpStudyPlan {
  readonly id: HttpId;
  readonly title: string;
  readonly mode: "daily" | "weekly";
  readonly startDate: HttpCalendarDate;
  readonly endDate: HttpCalendarDate;
  readonly dailyMinutes: number;
  readonly createdAt: HttpInstant;
}
export interface HttpStudyPlanInput extends Omit<HttpStudyPlan, "id" | "createdAt"> { readonly tasks: readonly HttpStudyTaskInput[]; }
export interface HttpPlannerResult {
  readonly plans: readonly HttpStudyPlan[];
  readonly tasks: readonly HttpStudyTask[];
  readonly limit: number;
  readonly offset: number;
}
export interface HttpCreatedPlan { readonly plan: HttpStudyPlan; readonly tasks: readonly HttpStudyTask[]; }
export interface HttpTopicError { readonly subject: string; readonly topic: string; readonly errors: number; }
export interface HttpMockInput {
  readonly title: string;
  readonly takenAt: HttpInstant;
  readonly score: number;
  readonly total: number;
  readonly durationMinutes: number;
  readonly subjectScores?: Readonly<Record<string, number>>;
  /** All three counts must be supplied together, or all omitted/null. */
  readonly correct?: number | null;
  readonly incorrect?: number | null;
  readonly unattempted?: number | null;
  readonly topicNotes?: readonly HttpTopicError[];
}
export interface HttpMockAttempt extends Omit<HttpMockInput, "subjectScores" | "correct" | "incorrect" | "unattempted" | "topicNotes"> {
  readonly id: HttpId;
  readonly subjectScores: Readonly<Record<string, number>>;
  readonly correct: number | null;
  readonly incorrect: number | null;
  readonly unattempted: number | null;
  readonly topicNotes: readonly HttpTopicError[];
  readonly provenance: "candidate_entered";
  readonly createdAt: HttpInstant;
}
export interface HttpReminderInput {
  readonly title: string;
  readonly dueAt: HttpInstant;
  readonly timezone: string;
  readonly cadence: "once" | "daily" | "weekly";
  readonly mockAttemptId?: HttpId;
}
export interface HttpMockDeadlineInput extends Omit<HttpReminderInput, "cadence"> {}
export interface HttpReminder extends Omit<HttpReminderInput, "mockAttemptId"> {
  readonly id: HttpId;
  readonly mockAttemptId: HttpId | null;
  readonly kind: "revision" | "mock_deadline";
  readonly enabled: boolean;
  readonly completed: boolean;
  readonly scheduling: "complete" | "paused" | "active" | "not_configured";
  readonly createdAt: HttpInstant;
}
export type HttpReminderPatch = { readonly enabled: boolean; readonly completed?: boolean } | { readonly enabled?: boolean; readonly completed: boolean };
export interface HttpRemindersResult extends HttpPage<HttpReminder> {
  readonly scheduler: { readonly active: boolean; readonly mode: HttpSchedulerMode };
}
export interface HttpNotification {
  readonly id: HttpId;
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly readAt: HttpInstant | null;
  readonly createdAt: HttpInstant;
}
export interface HttpDashboard {
  readonly profile: HttpProfile;
  readonly counts: { readonly tasks: number; readonly completedTasks: number; readonly mocks: number; readonly bookmarks: number; readonly estimates: number; readonly reminders: number; readonly unreadNotifications: number };
  /** Server returns at most eight pending tasks and eight rows per recent list. */
  readonly tasks: readonly HttpStudyTask[];
  readonly mocks: readonly HttpMockAttempt[];
  readonly estimates: readonly HttpSavedEstimate[];
  readonly notifications: readonly HttpNotification[];
}

export interface HttpForumInput { readonly title: string; readonly body: string; readonly subject: string; readonly tags?: readonly string[]; }
export interface HttpForumThread extends Omit<HttpForumInput, "tags"> {
  readonly id: HttpId;
  readonly tags: readonly string[];
  readonly authorDisplayName: string;
  readonly votes: number;
  readonly replyCount: number;
  readonly createdAt: HttpInstant;
  readonly canModerate: boolean;
}
export interface HttpForumReply {
  readonly id: HttpId;
  readonly threadId: HttpId;
  readonly body: string;
  readonly authorDisplayName: string;
  readonly votes: number;
  readonly createdAt: HttpInstant;
  readonly canModerate: boolean;
}
export interface HttpForumQuery extends HttpPageQuery { readonly search?: string; readonly subject?: string; }
export interface HttpVoteInput { readonly entity: "thread" | "reply"; readonly id: HttpId; }
export interface HttpModerationInput extends HttpVoteInput { readonly hidden: boolean; }
export interface HttpOwnerMetrics {
  readonly days: 7 | 28 | 90;
  readonly generatedAt: HttpInstant;
  readonly registeredUsers: number | null;
  readonly activeUsers: number | null;
  readonly featureAdoption: readonly { readonly feature: string; readonly events: number | null; readonly distinctUsers: number | null; readonly suppressed: boolean }[];
  readonly usage: readonly { readonly date: HttpCalendarDate; readonly events: number | null; readonly suppressed: boolean }[];
  /** Counts refer to unique non-skipped delivery occurrences, not retry attempts.
   * deliveryRate is the delivered/attempted fraction (0..1), or null when suppressed/unobserved. */
  readonly reminderHealth: { readonly measurement: "observed_delivery_log" | "unavailable"; readonly attempted: number | null; readonly delivered: number | null; readonly failed: number | null; readonly deliveryRate: number | null; readonly lastHeartbeatAt: HttpInstant | null };
  readonly privacy: { readonly minimumDistinctUsers: number };
  readonly system: { readonly database: "connected"; readonly scheduler: "configured_runner" | "not_configured" };
}

/** Compile-time endpoint description; query numbers are encoded as URL strings.
 * Colon parameters name percent-encoded path segments, not literal URLs.
 * data is the successful unwrapped payload; the wire value is HttpApiResult<data>.
 */
export interface HttpEndpoint<Body, Data, Query = never, Params = never> {
  readonly body: Body;
  readonly data: Data;
  readonly query: Query;
  readonly params: Params;
}
export interface HttpEndpointMap {
  readonly "GET /api/capabilities": HttpEndpoint<void, HttpCapabilitiesResult>;
  readonly "GET /api/session": HttpEndpoint<void, HttpSession>;
  readonly "POST /api/dev/register": HttpEndpoint<HttpDevRegisterInput, HttpDevAuthResult>;
  readonly "POST /api/dev/login": HttpEndpoint<HttpDevLoginInput, HttpDevAuthResult>;
  readonly "POST /api/dev/logout": HttpEndpoint<void | Readonly<Record<string, never>>, { readonly signedOut: true }>;
  readonly "GET /api/profile": HttpEndpoint<void, HttpProfile>;
  readonly "PATCH /api/profile": HttpEndpoint<HttpProfilePatch, HttpProfile>;
  readonly "GET /api/collections": HttpEndpoint<void, HttpItems<HttpCollection>>;
  readonly "POST /api/collections": HttpEndpoint<HttpCollectionInput, HttpCollection>;
  readonly "GET /api/bookmarks": HttpEndpoint<void, HttpCountedPage<HttpBookmark>, HttpPageQuery>;
  readonly "POST /api/bookmarks": HttpEndpoint<HttpBookmarkInput, HttpBookmark>;
  readonly "DELETE /api/bookmarks/:id": HttpEndpoint<void, { readonly removed: true }, { readonly collectionId?: HttpId }, { readonly id: HttpId }>;
  readonly "GET /api/estimates": HttpEndpoint<void, HttpPage<HttpSavedEstimate>, HttpPageQuery>;
  readonly "POST /api/estimates": HttpEndpoint<HttpRankInput, HttpSavedEstimate>;
  readonly "GET /api/planner": HttpEndpoint<void, HttpPlannerResult, HttpPageQuery>;
  readonly "POST /api/planner": HttpEndpoint<HttpStudyPlanInput, HttpCreatedPlan>;
  readonly "PATCH /api/planner/:id": HttpEndpoint<{ readonly completed: boolean }, HttpStudyTask, never, { readonly id: HttpId }>;
  readonly "GET /api/mocks": HttpEndpoint<void, HttpPage<HttpMockAttempt>, HttpPageQuery>;
  readonly "POST /api/mocks": HttpEndpoint<HttpMockInput, HttpMockAttempt>;
  readonly "GET /api/reminders": HttpEndpoint<void, HttpRemindersResult, HttpPageQuery>;
  readonly "POST /api/reminders": HttpEndpoint<HttpReminderInput, HttpReminder>;
  readonly "PATCH /api/reminders/:id": HttpEndpoint<HttpReminderPatch, HttpReminder, never, { readonly id: HttpId }>;
  readonly "GET /api/mock-deadlines": HttpEndpoint<void, HttpRemindersResult, HttpPageQuery>;
  readonly "POST /api/mock-deadlines": HttpEndpoint<HttpMockDeadlineInput, HttpReminder>;
  readonly "PATCH /api/mock-deadlines/:id": HttpEndpoint<HttpReminderPatch, HttpReminder, never, { readonly id: HttpId }>;
  readonly "GET /api/notifications": HttpEndpoint<void, HttpPage<HttpNotification>, HttpPageQuery>;
  readonly "PATCH /api/notifications/:id": HttpEndpoint<{ readonly read: true }, { readonly id: HttpId; readonly readAt: HttpInstant }, never, { readonly id: HttpId }>;
  readonly "GET /api/dashboard": HttpEndpoint<void, HttpDashboard>;
  readonly "GET /api/forum": HttpEndpoint<void, HttpCountedPage<HttpForumThread>, HttpForumQuery>;
  readonly "POST /api/forum": HttpEndpoint<HttpForumInput, HttpForumThread>;
  readonly "GET /api/forum/:id/replies": HttpEndpoint<void, HttpPage<HttpForumReply>, HttpPageQuery, { readonly id: HttpId }>;
  readonly "POST /api/forum/:id/replies": HttpEndpoint<{ readonly body: string }, HttpForumReply, never, { readonly id: HttpId }>;
  readonly "POST /api/forum/vote": HttpEndpoint<HttpVoteInput, { readonly votes: number; readonly voted: boolean }>;
  readonly "POST /api/forum/moderate": HttpEndpoint<HttpModerationInput, { readonly id: HttpId; readonly hidden: boolean }>;
  readonly "GET /api/admin/metrics": HttpEndpoint<void, HttpOwnerMetrics, { readonly days?: 7 | 28 | 90 }>;
}
export type HttpEndpointKey = keyof HttpEndpointMap;
export type HttpRequestBody<K extends HttpEndpointKey> = HttpEndpointMap[K]["body"];
export type HttpResponseData<K extends HttpEndpointKey> = HttpEndpointMap[K]["data"];
export type HttpResponse<K extends HttpEndpointKey> = HttpApiResult<HttpResponseData<K>>;
