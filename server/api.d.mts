import type {HttpDevAuthResult,HttpDevLoginInput,HttpDevRegisterInput,HttpRankInput,HttpSessionUser} from '../src/integration/http-contracts.js';

/** Minimal structural database boundary used by api.mjs (D1 or local SQLite adapter). */
export type HttpSqlValue = string | number | null | ArrayBuffer | Uint8Array;
export interface HttpSqlStatement {
  bind(...values: readonly HttpSqlValue[]): HttpSqlStatement;
  first(column?: string): Promise<unknown>;
  all(): Promise<{ readonly results: readonly Readonly<Record<string, unknown>>[]; readonly success?: boolean }>;
  run(): Promise<{ readonly success?: boolean; readonly meta?: { readonly changes?: number; readonly last_row_id?: number } }>;
}
export interface HttpSqlDatabase {
  prepare(sql: string): HttpSqlStatement;
  batch(statements: readonly HttpSqlStatement[]): Promise<readonly unknown[]>;
}
export interface HttpLocalAuthAdapter {
  resolve(request: Request, now?: number): Promise<{ readonly user: HttpSessionUser; readonly csrfToken: string } | null>;
  register(input: HttpDevRegisterInput, now?: number, secure?: boolean): Promise<{ readonly data: HttpDevAuthResult; readonly cookie: string }>;
  login(input: HttpDevLoginInput, now?: number, secure?: boolean): Promise<{ readonly data: HttpDevAuthResult; readonly cookie: string }>;
  logout(request: Request): Promise<{ readonly data: { readonly signedOut: true }; readonly cookie: string }>;
}
export interface HttpApiOptions {
  readonly db?: HttpSqlDatabase;
  readonly localAuth?: HttpLocalAuthAdapter;
  readonly authMode?: "development" | "sites" | "unavailable";
  readonly questionIds?: Iterable<string>;
  readonly paperIds?: Iterable<string>;
  readonly subjects?: Iterable<string>;
  readonly topicsBySubject?: Readonly<Record<string, readonly string[]>>;
  /** Recomputed on save. A different injected adapter requires its own result DTO. */
  readonly predictRank?: (input: HttpRankInput) => object & { readonly datasetVersion?: string };
  readonly careerDataVersion?: string;
  readonly now?: () => number;
  readonly clientKey?: (request: Request) => string;
  readonly schedulerActive?: boolean;
  readonly privacyThreshold?: number;
  readonly log?: (event: { readonly level: "error"; readonly code: "api_dependency_failed"; readonly path: string; readonly requestId: string }) => void;
}
export interface HttpApiEnvironment {
  readonly DB?: HttpSqlDatabase;
  readonly AUTH_MODE?: "development" | "sites" | "unavailable";
  readonly OWNER_SITE_USER_ID?: string;
  readonly SCHEDULER_ACTIVE?: string;
}
/** Returns a Fetch-native handler; declarations do not type-check the JS body. */
export type HttpApiHandler = (request: Request, env?: HttpApiEnvironment) => Promise<Response>;
export function createApi(options?: HttpApiOptions): HttpApiHandler;
