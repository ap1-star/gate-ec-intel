# GATE EC Research Terminal — Part 2 handoff

Part 2 integrates public PYQ/career tools and real development database workflows into the existing terminal. Hosted personal services have not been activated. Part 3 has not started. Publication details and the exact checkpoint SHA are recorded in `outputs/PART2_DEPLOYMENT.json` beside the checkout after saving/deployment; within this repository use `git log -1`.

## Starting point and rollback

Verified Part 1 checkpoint: `9e95e7dcc5cb4864363c270a8cd66070fa61fc33`, published as version 11 of Site `appgprj_6af5a0ff7a00819196fd4bf62194e4dd`. Its public audience and static hosting manifest are preserved. Before edits, the 35 foundation tests, both research regression suites and baseline asset checks were independently rerun successfully.

Rollback is a redeployment of saved version 11 or a build of that Git checkpoint. No production database has been provisioned, migrated or populated, so this release requires no production data rollback. The original donor ZIP and its checksum remain under `vendor/`.

## Architecture and donor reuse

The original browser research engine remains in place. `src/ui/research-workspace.js` supplies a narrow bridge into the existing shell, renderers, cohort selectors, inspector, navigation and notifications. A single route catalogue and hash router own all views. New source under `src/features/` is bundled with esbuild into `dist/features.js`; feature CSS consumes the Part 1 semantic tokens and components.

Domains remain separate: research and derived canonical PYQ metadata; shared pure career calculations/reference data; server-owned candidate records; community content; owner aggregates. Private data never enters research exports. The preserved 520-record dataset and protected analytical assets are checked against the Part 1 SHA-256 manifest.

Reused donor material includes the byte-preserved public seed, rank mathematics, official paper references, programme/PSU evidence, planner/mock/reminder/community behavior and schema concepts. The negative-mark rank sensitivity endpoint defect is corrected while preserving the central calculations. Manus/Forge OAuth, heartbeat, Express/tRPC/MySQL startup and the donor shell are not runtime dependencies. The actual donor archive contained no private database rows.

The fetch-native API uses a D1-compatible SQL interface. Development uses an actual SQLite file through Node's SQLite API; tests use disposable migrated files. Services return genuine success, validation, authorization or dependency errors. No mock service reports successful persistence.

## Feature-status matrix

Statuses refer to executed domain/service/controller tests. They do not imply browser visual approval or independently certified source data.

| Feature | Part 2 status | Evidence and practical limit |
| --- | --- | --- |
| Historical research, statistics, sources, scenarios and exports | Fully functional and tested | Preserved corpus/assets; both original research regression suites pass. |
| Unified PYQ search, metadata filters, pagination, cards, source drawer and related-topic links | Fully functional and tested | Canonical mapping/filter tests and controller/service checks; rendered visual review pending. |
| Rank calculation and historical comparison | Fully functional and tested | Golden values plus all 1,763 supported integer year/mark cases; sensitivity is not confidence or accuracy calibration. |
| Admissions, institute and PSU historical exploration | Fully functional and tested | Filters, evidence/null handling and unit separation tested; inherited records are not a current eligibility guarantee. |
| Profile, dashboard, saved estimates, collections and bookmarks | Functional only in development | Actual SQL API and identity-isolated views; hosted database/authentication not active. |
| Daily/weekly planner and task completion | Functional only in development | Real persisted tasks, valid dates, topic relationships, duration budgets and ownership checks. |
| Mock entry, history, subject breakdown, accuracy and entered topic errors | Functional only in development | Actual candidate records; incomplete accuracy data remains unavailable. No invented weaknesses. |
| Reminder records, recurrence, mock deadlines and in-app notifications | Functional only in development | SQL runner and local process scheduling; delivery stops when the local process stops. |
| Community threads, replies, voting and owner moderation | Functional only in development | Real SQL records with validation, safe rendering and server authorization. |
| Owner aggregate metrics and reminder health | Functional only in development | Exact owner check, small-count suppression and actual delivery logs. No user/email/activity lists. |
| Sites identity adapter and Worker API composition | Implemented but requiring external configuration | Trusted-dispatch header adapter exists; hosted end-to-end sign-in is untested. A complete production Worker/static-asset composition and DB binding must be reviewed. |
| Versioned production SQL schema | Implemented but requiring external configuration | Schema supplied and tested locally; no production D1 binding or migration applied. |
| Durable hosted scheduling | Partially implemented | Portable SQL runner and Worker scheduled-handler composition exist; no hosted schedule configured or delivery tested. |
| Email/push reminder delivery | Not implemented | In-app notifications only. |
| Branch-level NIT/IIIT admission records absent from donor; live PSU vacancies | Not implemented | Source links/directories remain explicit. No missing cutoff or vacancy rows manufactured. |
| Rendered Part 2 desktop/tablet/mobile QA | Not implemented | Browser automation is unavailable in this session. Part 1 screenshots do not validate these new modules. |

## Public research and career integration

One question explorer retains all original identifiers and adds exact topic/subtopic/type/marks/evidence filters, collections when authenticated, table/card presentation and related-topic handoffs. Five donor full-paper references are reconciled to canonical papers without inserting duplicate questions. See [PYQ implementation](docs/integration/PART2_PYQ.md).

Rank Intelligence separates marks, approximate GATE score and AIR. Category affects the qualifying-mark comparison rather than AIR. The ±0.75-mark range is sensitivity, not a calibrated interval. The donor's reconstructed 2026 data and hypothetical 2027 scenario remain labeled. Rank links forward typed candidate inputs and mark model-derived scores explicitly. Saved estimates are recomputed on the server rather than trusting a client result.

Admissions retain 600 programme/category rows, including null cutoffs; PSU exploration retains 42 metric/category cells with marks, score and AIR kept separate. Exact source URLs are provided only where supported. The donor's labels are inherited claims. A known IITM 2026 ED1Y/EWS discrepancy remains null in the unchanged seed instead of being silently repaired. See [career implementation and source checks](docs/integration/PART2_CAREER.md).

## API and SQL

The same-origin `/api/` transport returns `{status:'ok',data}` or an explicit error/unavailable envelope with HTTP status and safe message. Mutations require a matching Origin and CSRF token. Ownership is derived from the authenticated session and applied in SQL; a client cannot select a private owner.

| Endpoint | Methods / purpose |
| --- | --- |
| `/api/capabilities`, `/api/session` | GET actual service/session availability |
| `/api/dev/register`, `/api/dev/login`, `/api/dev/logout` | POST loopback-only development credentials/session |
| `/api/profile`, `/api/dashboard` | GET; PATCH profile |
| `/api/collections`, `/api/bookmarks` | GET, POST; DELETE `/bookmarks/:id` optionally only one collection membership |
| `/api/estimates` | GET, POST; shared model recomputes submitted inputs |
| `/api/planner`, `/api/planner/:taskId` | GET, POST; PATCH completion |
| `/api/mocks` | GET, POST; optional reconciled subject scores, counts and explicit topic notes |
| `/api/reminders`, `/api/mock-deadlines` | GET, POST; PATCH `/:id` enabled/completed |
| `/api/notifications`, `/api/notifications/:id` | GET; PATCH read acknowledgement |
| `/api/forum`, `/api/forum/:id/replies` | GET public; POST authenticated |
| `/api/forum/vote`, `/api/forum/moderate` | POST; moderation requires configured owner |
| `/api/admin/metrics` | GET owner-only, 7/28/90-day aggregates |

`migrations/0001_candidate_workspace.sql` is schema-only. It includes users, local development credentials/sessions, profiles, collections/bookmarks/memberships, estimates, plans/tasks, mock attempts, reminders/deliveries/notifications, scheduler logs, forum threads/replies/votes, activity and moderation events. `0002_delivery_attempts.sql` adds observed retry-attempt counts without replacing existing rows. Foreign keys, owner-aware composite relationships, canonical allowlists, unique memberships and occurrence deduplication protect data integrity. Historical research/reference data remains outside these user tables.

Local migration tracking is handled by `server/sqlite.mjs`; applying the schema is an explicit startup/development operation, never request-time DDL. The API readiness check queries an actual application table, so a hosted D1 setup does not depend on the local migration tracker. Local databases and signing secrets are excluded by `.openai/cache/` in `.gitignore`. No credentials or candidate rows are part of `dist/` or the source checkpoint. The actual 35 method/route templates and HTTP DTOs are typed in `src/integration/http-contracts.ts` and `server/api.d.mts`; original Part 1 domain interfaces are retained separately.

## Authentication, availability and development

Production adapter: Sites trusted authenticated identity headers, configured exact owner ID, same-origin/CSRF mutation checks. It must run behind Sites trusted dispatch. It is not safe to expose a server accepting arbitrary identity headers directly to the internet. The Node development server ignores those headers and binds only to `127.0.0.1`.

Development adapter: salted scrypt passwords, signed HttpOnly SameSite session cookie, persisted token hashes, expiry, logout revocation and explicit loopback restriction. This is a tested development flow, not a claim of hosted OAuth. Rate limits cover login/registration and authenticated writes in the current process; distributed limits and final production hardening belong to Part 3.

Use Node 26 (the tested runtime), install the locked dependencies, then:

```text
npm run build
npm run dev
```

This starts the terminal and actual SQL API at `http://127.0.0.1:8802`. Register a development username via Profile. To run the real local reminder loop, instead use:

```text
node scripts/dev-server.mjs --dev-auth --scheduler
```

Optional `--owner <development-username>` grants only that local account owner access. `--db <path>` selects a different development database. Keep runtime files under `.openai/cache/`. Set Profile reminder preference to in-app for notification delivery. The standalone `scripts/run-reminders.mjs` is available for an external supervised runner; a recurring worker needs infrastructure, not an open browser tab.

The hosted artifact remains static. Public research/career tools work independently of accounts. Private routes explicitly state backend unavailability; they do not create fake users, fake saved records or successful local-only account operations.

## Design and validation

All 26 ordinary routes, plus the restricted owner route, use one sidebar/header/theme/component system. Dense career tables, compact inputs, account-aware save controls, personal progress views, mock charts and minimal discussion lists consume the same design tokens. Source/methodology labels stay visible. Responsive breakpoints and horizontal table scrolling are implemented; their rendered appearance has not been inspected this Part 2.

Personal histories and discussion replies collect all API pages before computing summaries. A 10,000-record guard produces an explicit error instead of silently showing partial statistics. The dashboard intentionally shows recent previews and the thread list has visible pagination. Delivery-rate displays convert fractions to percentages and define the denominator as unique non-skipped occurrences; retry attempts are tracked separately and do not inflate that denominator.

Final `npm run verify` on 2026-11-15 passed the build, strict TypeScript contract/declaration check, **90 tests (0 failures/skips)** and both original research suites. Each research suite exercised 2,051 exact topic/cohort comparisons and the 520 question inspectors. The rank tests also cover 1,763 supported integer year/mark cases. See [executed validation](docs/integration/PART2_VALIDATION.md) for scope and evidence.

Browser automation was unavailable, so there is no claim of native click/focus/form validation or visual approval at desktop/tablet/mobile widths. Node form/event simulations are explicitly labeled as such in their tests. No hosted account/database/scheduler tests were represented as passing.

## Pending infrastructure and Part 3 priorities

Before hosted private services can be activated: review a Worker entry/static asset composition, provision/bind D1, explicitly approve applying the schema, configure the exact owner identity, verify Sites sign-in/sign-out and CSRF end-to-end, configure and observe a durable runner, and repeat the ownership/privacy tests against the hosted runtime. The active hosting manifest has not been changed to request those resources.

Part 3 may perform the requested final deployment hardening, distributed rate limiting, operational scheduling/retention decisions, accessibility/performance checks, rendered responsive QA and further source-data certification. Those tasks have not been started by this instruction. Existing Part 1 planned contracts remain architectural boundaries; actual Part 2 HTTP DTOs are separately documented under `src/integration/`.
