# Integration contracts — Parts 1 and 2

Part 1 domain contracts and Part 2 HTTP transports have different purposes. `contracts.ts` exports both sets without renaming or replacing the original domain interfaces. Use the `Http*` types for the implemented `server/api.mjs` JSON boundary. Do not cast HTTP payloads directly to Part 1 private models: their fields and authentication representations differ.

## Part 1 domain boundaries

- `public-contracts.ts` describes research, statistics, scenarios, canonical PYQ references, rank sensitivity/evidence, admissions, institute and PSU domain records.
- `private-contracts.ts` describes the original user-owned domain models and provider-verified `Principal`. Those models include internal ownership fields such as `userId`; they are not the current browser DTOs.
- `services.ts` retains domain service interfaces, the original service outcomes and scheduler-provider boundary. These are not a list of active HTTP endpoints or a claim that external providers have been configured.
- `access.mjs` and its declaration retain fail-closed policy decisions and an asynchronous verifier boundary. They do not mint sessions. `environment.mjs` and its declaration validate explicit server configuration; successful validation does not prove connectivity. These helpers are separate from the implemented Part 2 Fetch handler and its session checks.
- `env.example` contains empty server configuration names. Do not copy it to `dist/`, populate secrets in source control or import server environment settings in browser code.

## Implemented Part 2 transport

`http-contracts.ts` describes successful payloads, `ok`/`error`/`unavailable` envelopes, session/capability data, profile, collections/bookmarks, estimates, planner, mocks, reminders/deadlines, notifications, dashboard, public discussions and protected owner aggregates. `HttpEndpointMap` maps method plus route template to body, unwrapped success data, query and path parameter types. Colon parameters represent encoded path segments. Query numbers must be serialized into URL strings. The full JSON response is `HttpApiResult<T>`; the current feature client's `bridge.api()` unwraps `data` and throws for unsuccessful responses.

`server/api.d.mts` describes `createApi(options)` and its minimal D1-compatible SQL, local-auth and Fetch-handler boundaries. An injected predictor with a different output needs a corresponding result contract; `HttpRankEstimate` describes the career adapter actually configured here. The declaration does not turn the JavaScript implementation into checked TypeScript.

The implemented HTTP session is `{status, user, csrfToken, authMode, capabilities}`. An authenticated `user` contains `id`, `displayName`, `isOwner` and `development`; it is not the Part 1 `Principal`. Development register/login returns a smaller user object, so clients refresh `/api/session` afterward. Development credentials are available only through the explicitly enabled loopback local adapter. Sites mode requires trusted platform identity headers and a configured database. Client-owned identifiers or hidden navigation are never authorization.

Owned HTTP resources omit `userId`: ownership comes from the verified server session, and cross-user mutation attempts fail. Public forum DTOs expose deliberate display fields. Owner metrics expose aggregates, suppress small groups and report actual delivery-log availability. `reminderPreference` currently accepts `none` and `in_app`; email is not an implemented transport option. Reminder scheduling status reports configured runner availability and does not prove a background process is running.

The repository now contains implemented Fetch/SQL services, a migrated local SQLite adapter, local development auth and an optional Sites Worker composition. This does not activate providers on the published static site. The static artifact keeps public research/career available and reports unavailable account services when `/api/` has no configured backend. Production database binding, migrations, identity and scheduler activation remain separate deployment work requiring the reviewed environment.

## Data and verification boundaries

Preserve the 520 canonical question IDs and all research calculations. Donor full-paper PYQs remain paper references, rather than new individual questions. Browser response CSV analysis remains separate from private candidate-entered mock attempts. Rank ranges are mark sensitivity rather than confidence intervals; source `verified` labels remain inherited claims. The supplied negative-mark range defect is fixed in the career adapter, with supported-domain tests and provenance retained.

`npm run check` checks the TypeScript contracts and included declarations. `checkJs` is disabled: it does not establish type safety of `server/*.mjs` or feature JavaScript. The HTTP types are documentation and compile-time aids, not network decoders or validation middleware. Runtime checks live in the actual server validators and feature domains.

`tests/feature-service-flow.test.mjs` exercises actual API/local-auth/SQLite records through personal and PYQ module handlers, loads and generated markup. Its forms/events/selectors are simulated in Node; it does not verify native browser validation, keyboard/focus behavior, layout or visual quality. Its account and preparation fixtures exist only inside a disposable temporary database. Backend tests and the separate research regressions cover their own runtime boundaries. No test fixtures are imported into the public application or production database.
