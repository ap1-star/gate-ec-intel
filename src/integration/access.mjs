/** Server-side policy helpers only. A browser-created Principal is not authentication.
 * The verifier must validate provider signature, issuer, audience and expiry before returning AuthState.
 * No session is minted, no HTTP endpoint is registered, and no private service is enabled here.
 */
const deny = reason => Object.freeze({ allowed: false, reason });
const present = value => typeof value === 'string' && value.trim().length > 0;
export function decideAccess(requirement, session, policy = {}, now = Date.now()) {
  if (requirement === 'public') return Object.freeze({ allowed: true });
  if (!['authenticated', 'owner'].includes(requirement)) return deny('invalid_requirement');
  if (!present(policy.issuer) || !present(policy.audience) || !Number.isFinite(now)) return deny('invalid_policy');
  if (!session || session.status === 'unavailable') return deny('authentication_unavailable');
  if (session.status !== 'authenticated') return deny('authentication_required');
  const principal = session.principal;
  if (!principal || !present(principal.userId) || !present(principal.providerSubject) || principal.issuer !== policy.issuer || principal.audience !== policy.audience || !Array.isArray(principal.roles)) return deny('session_untrusted');
  const expires = typeof principal.expiresAt === 'string' ? Date.parse(principal.expiresAt) : NaN;
  if (!Number.isFinite(expires) || expires <= now) return deny('session_expired');
  if (requirement === 'owner' && (!present(policy.ownerSubject) || principal.providerSubject !== policy.ownerSubject || !principal.roles.includes('owner'))) return deny('owner_required');
  return Object.freeze({ allowed: true });
}
export function decideOwnedAccess(ownerUserId, session, policy, now = Date.now()) {
  const access = decideAccess('authenticated', session, policy, now);
  if (!access.allowed) return access;
  if (!present(ownerUserId) || session.principal.userId !== ownerUserId) return deny('ownership_mismatch');
  return Object.freeze({ allowed: true });
}
export async function authenticateAndAuthorize(requirement, verifySession, policy, now = Date.now()) {
  if (requirement === 'public') return decideAccess('public', null, policy, now);
  if (typeof verifySession !== 'function') return deny('authentication_unavailable');
  try { return decideAccess(requirement, await verifySession(), policy, now); }
  catch { return deny('authentication_unavailable'); }
}
