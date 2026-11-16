/** Explicit-input, server-only environment validation. Never returns values of secrets.
 * A valid schema is not evidence of connectivity; adapters remain unimplemented in Part 1.
 */
export const SERVER_ONLY_VARIABLES = Object.freeze([
  'DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET', 'AUTH_OWNER_SUBJECT', 'OWNER_OPEN_ID',
  'BUILT_IN_FORGE_API_KEY', 'SCHEDULER_SIGNING_SECRET'
]);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function findClientSecretVariables(environment = {}) {
  return Object.keys(environment).filter(name => nonempty(environment[name]) && /^(?:VITE_|NEXT_PUBLIC_|PUBLIC_)/.test(name) && /(?:SECRET|DATABASE|PASSWORD|PRIVATE_KEY|SESSION_TOKEN|JWT|API_KEY|OWNER_SUBJECT|OWNER_OPEN_ID)/.test(name)).sort();
}
export function validateIntegrationEnvironment(environment = {}, options = {}) {
  const issues = [];
  const issue = (variable, code, message) => issues.push(Object.freeze({ variable, code, message }));
  const enabled = {
    identity: options.identity === true,
    database: options.database === true,
    scheduler: options.scheduler === true,
    ownerMetrics: options.ownerMetrics === true
  };
  const mode = environment.GATE_INTEGRATION_MODE || 'static';
  if (!['static', 'services'].includes(mode)) issue('GATE_INTEGRATION_MODE', 'invalid_mode', 'Choose static or services explicitly.');
  if (mode !== 'services' && Object.values(enabled).some(Boolean)) issue('GATE_INTEGRATION_MODE', 'services_disabled', 'Private services cannot be enabled in a static deployment.');
  for (const name of findClientSecretVariables(environment)) issue(name, 'client_secret', 'A server-only credential or authorization setting must not enter a public build.');
  const requireValue = name => {
    if (!nonempty(environment[name])) { issue(name, 'missing', 'Required for the requested service capability.'); return false; }
    return true;
  };
  const checkOrigin = (name, required) => {
    if (!nonempty(environment[name])) { if (required) requireValue(name); return; }
    try {
      const url = new URL(environment[name]);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      const allowHttp = options.allowLocalhost === true && environment.NODE_ENV !== 'production' && local;
      if ((url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('origin');
    } catch { issue(name, 'invalid_origin', 'Use an HTTPS origin without credentials, path, query or fragment.'); }
  };
  const anyService = Object.values(enabled).some(Boolean);
  checkOrigin('GATE_PUBLIC_ORIGIN', anyService);
  checkOrigin('GATE_API_ORIGIN', anyService);
  if (enabled.ownerMetrics && (!enabled.identity || !enabled.database)) issue('ownerMetrics', 'missing_capability', 'Owner metrics require identity and database adapters.');
  if (enabled.scheduler && (!enabled.identity || !enabled.database)) issue('scheduler', 'missing_capability', 'Scheduling requires identity and database adapters.');
  if (enabled.identity) {
    checkOrigin('AUTH_ISSUER_URL', true);
    requireValue('AUTH_AUDIENCE');
    if (environment.AUTH_SESSION_STRATEGY === 'hmac') {
      if (requireValue('SESSION_SECRET') && environment.SESSION_SECRET.length < 32) issue('SESSION_SECRET', 'weak_secret', 'Use a destination-specific secret of at least 32 characters.');
    } else if (environment.AUTH_SESSION_STRATEGY !== 'provider') issue('AUTH_SESSION_STRATEGY', 'invalid_strategy', 'Choose provider verification or hmac explicitly.');
  }
  if (enabled.ownerMetrics) requireValue('AUTH_OWNER_SUBJECT');
  if (enabled.database && requireValue('DATABASE_URL')) {
    try {
      const url = new URL(environment.DATABASE_URL);
      if (!['mysql:', 'postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error('database');
    } catch { issue('DATABASE_URL', 'invalid_database_url', 'Use a server-side connection URL supported by the selected database adapter.'); }
  }
  if (enabled.scheduler && requireValue('SCHEDULER_SIGNING_SECRET') && environment.SCHEDULER_SIGNING_SECRET.length < 32) issue('SCHEDULER_SIGNING_SECRET', 'weak_secret', 'Use a destination-specific callback verification secret of at least 32 characters.');
  return Object.freeze({ valid: issues.length === 0, mode, capabilities: Object.freeze(enabled), issues: Object.freeze(issues) });
}
