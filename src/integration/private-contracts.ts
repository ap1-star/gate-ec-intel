import type { CandidateCategory, DatasetVersion, IsoDateTime, QuestionId, RankEstimate } from "./public-contracts.js";

/** Private identifiers are server-derived. Never include these records in public research exports. */
export type UserId = string;
export interface Principal {
  readonly userId: UserId;
  readonly providerSubject: string;
  readonly issuer: string;
  readonly audience: string;
  readonly roles: readonly ("member" | "owner")[];
  readonly expiresAt: IsoDateTime;
}
export type AuthState =
  | { readonly status: "unavailable"; readonly reason: string }
  | { readonly status: "anonymous" }
  | { readonly status: "authenticated"; readonly principal: Principal };
export interface UserOwnedRecord {
  readonly id: string;
  readonly userId: UserId;
  readonly createdAt: IsoDateTime;
}
export interface CandidateProfile {
  readonly userId: UserId;
  readonly category: CandidateCategory;
  readonly targetYear: number;
  readonly examDate: string | null;
  readonly dailyMinutes: number;
  readonly reminderPreference: "none" | "in_app" | "email";
}
export interface SavedPrediction extends UserOwnedRecord {
  readonly datasetVersion: DatasetVersion;
  readonly estimate: RankEstimate;
}
export interface StudyTask extends UserOwnedRecord {
  readonly planId: string;
  readonly date: string;
  readonly subject: string;
  readonly topic: string;
  readonly minutes: number;
  readonly completed: boolean;
}
export interface StudyPlanInput {
  readonly title: string;
  readonly mode: "daily" | "weekly";
  readonly startDate: string;
  readonly endDate: string;
  readonly dailyMinutes: number;
  readonly tasks: readonly Omit<StudyTask, "id" | "userId" | "createdAt" | "planId" | "completed">[];
}
export interface MockAttempt extends UserOwnedRecord {
  readonly title: string;
  readonly takenAt: IsoDateTime;
  readonly score: number;
  readonly total: number;
  readonly durationMinutes: number;
  readonly subjectScores: Readonly<Record<string, number>>;
  readonly provenance: "candidate_entered";
}
export interface Reminder extends UserOwnedRecord {
  readonly title: string;
  readonly dueAt: IsoDateTime;
  readonly timezone: string;
  readonly cadence: "once" | "daily" | "weekly";
  readonly enabled: boolean;
  readonly scheduling: "not_configured" | "pending" | "active" | "paused" | "failed" | "complete";
}
export interface Notification extends UserOwnedRecord {
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly readAt: IsoDateTime | null;
}
export interface PyqBookmark extends UserOwnedRecord { readonly questionId: QuestionId; }
export interface PersonalDashboard {
  readonly userId: UserId;
  readonly upcomingTasks: readonly StudyTask[];
  readonly recentMocks: readonly MockAttempt[];
  readonly reminders: readonly Reminder[];
  readonly savedPredictions: readonly SavedPrediction[];
}
/** Public discussion output deliberately excludes email, identity-provider subjects and private profile data. */
export interface PublicDiscussion {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly subject: string;
  readonly tags: readonly string[];
  readonly authorDisplayName: string | null;
  readonly votes: number;
  readonly createdAt: IsoDateTime;
}
export interface PublicReply {
  readonly id: string;
  readonly threadId: string;
  readonly body: string;
  readonly authorDisplayName: string | null;
  readonly votes: number;
  readonly createdAt: IsoDateTime;
}
/** Owner-only aggregate DTO. No raw users, contact fields, progress rows, IPs or audit rows. */
export interface OwnerMetrics {
  readonly days: 7 | 28 | 90;
  readonly generatedAt: IsoDateTime;
  readonly registeredUsers: number | null;
  readonly activeUsers: number | null;
  readonly featureAdoption: readonly { readonly feature: string; readonly events: number | null; readonly distinctUsers: number | null; readonly suppressed: boolean }[];
  readonly reminderHealth: {
    readonly measurement: "unavailable" | "observed_delivery_log";
    readonly attempted: number | null;
    readonly delivered: number | null;
    readonly failed: number | null;
    readonly deliveryRate: number | null;
    readonly lastHeartbeatAt: IsoDateTime | null;
  };
}
