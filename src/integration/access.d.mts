import type { AuthState } from "./private-contracts.js";
export type AccessRequirement = "public" | "authenticated" | "owner";
export interface AccessPolicy { readonly issuer: string; readonly audience: string; readonly ownerSubject?: string; }
export type AccessDecision = { readonly allowed: true } | { readonly allowed: false; readonly reason: "invalid_requirement" | "invalid_policy" | "authentication_unavailable" | "authentication_required" | "session_untrusted" | "session_expired" | "owner_required" | "ownership_mismatch" };
export function decideAccess(requirement: AccessRequirement, session: AuthState | null | undefined, policy?: Partial<AccessPolicy>, now?: number): AccessDecision;
export function decideOwnedAccess(ownerUserId: string, session: AuthState | null | undefined, policy: Partial<AccessPolicy>, now?: number): AccessDecision;
export function authenticateAndAuthorize(requirement: AccessRequirement, verifySession: (() => Promise<AuthState>) | null | undefined, policy: Partial<AccessPolicy>, now?: number): Promise<AccessDecision>;
