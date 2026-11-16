# Unified GATE EC platform architecture

Status: Part 1 architectural decision record and integration boundary. The existing public Research Terminal remains the working foundation. Portal features are reserved for Part 2. The checked-in typed interfaces and policy/configuration helpers are not a connected backend, authenticated session, database, scheduler, or set of successful API responses.

Related evidence: [portal inventory](PORTAL_FEATURE_INVENTORY.md), [integration contracts](../../src/integration/README.md), and the root `INTEGRATION_PART1_HANDOFF.md`. The source audits were made against the actual uploaded portal and the destination checkpoint, not inferred from a public URL. Portal `README.md` is missing from the archive; `handover/HANDOVER.md` and the three `docs/` files are present. Historical walkthrough claims are not current verification results or permission to recreate users/records.

## ADR-001 — Retain research engines and introduce an incremental application foundation

**Decision:** retain the current browser research datasets, selectors, mathematical definitions, hand-written SVG visualizations, and analytical modules. Establish a single framework-neutral UI and route catalogue around them. Do not rewrite the terminal into the portal's React application in Part 1.

The baseline is a static `dist/` application declared by `.openai/hosting.json`, with ordered classic JavaScript, shared legacy bindings, `window.V5Math`, and hash routing. Its research question/difficulty/quality data join by stable question ID. It has no active identity, SQL, API, scheduling, community or owner-metrics service. The portal is React 19/Vite/Wouter with TanStack Query/tRPC and a long-running Express/Drizzle/MySQL backend. Its `PortalLayout` is the actual shell; `DashboardLayout.tsx` is unused Page 1/Page 2 scaffold. Importing that project unchanged would produce a second router/shell, conflicting CSS and missing backend calls.

The Part 1 source/build contract is:

| Source | Responsibility | Static output |
|---|---|---|
| `src/app/routes.js` | One catalogue for current research routes, future capability status and export eligibility | Included in `dist/foundation.js` |
| `src/ui/components.js`, `components.d.ts` | Framework-neutral components and their public declarations | Included in `dist/foundation.js` |
| `src/ui/research-workspace.js` | Research view/shell adapters using retained analytics and selectors | `dist/interface.js` |
| `src/ui/workspace.css`, `tokens.css`, `part1.css` | Semantic tokens, shared components, responsive styles and chart presentation | `dist/interface.css` |
| `src/ui/visualization.js` | Theme-aware series palette, numeric conventions and SVG presentation | Included in `dist/foundation.js` |
| `src/app/preferences.js`, `bootstrap.js` | Validated saved views and honest startup/loading/error handling | Included in `dist/foundation.js` |
| `scripts/build.mjs` | Deterministic local source-to-static generation and asset checks | The same checked-in static deployment shape |
| `src/integration/` | Public/private DTOs, service interfaces, fail-closed policy and explicit-input server configuration validation | **Not copied to the public deployment as server configuration** |
| Existing data/math/analytics files in `dist/` | Preserved authoritative research runtime and assets | Retained without methodology/data replacement |

The final handoff records the actual build/test/package results. This architectural document defines ownership and the build contract; it does not substitute for running the build. Generated presentation files must be rebuilt from `src/`, not independently edited and allowed to drift.

## One shell and one rendering owner per route

Every current or future route uses the same navigation, command bar, page header, filters, component tokens, source conventions and responsive grid. Public research remains usable when all private services are disabled or failing.

The route catalogue groups existing analytical routes as follows:

| Navigation item | Working research hashes |
|---|---|
| Overview | `#monitor` |
| Research Explorer | `#explorer`, `#difficulty` |
| Subject Analytics | `#subjects`, `#compare` |
| Statistical Lab | `#lab`, `#distributions`, `#inference`, `#responses` |
| PYQ Intelligence | `#questions`, `#topics` |
| Scenario Lab | `#scenarios` |
| Data Integrity | `#audit`, `#evidence`, `#reports` |
| Settings | `#settings` — application preferences, not candidate profile/account management |

Future definitions are `rank`, `admissions`, `institutes`, `psu`, `dashboard`, `planner`, `mocks`, `reminders`, and `forum`. These are planned/unavailable capability definitions, not imported feature implementations. Planned routes do not register fake predictor/profile/list responses or appear as working command results. Unknown routes must show an explicit not-found state rather than silently resolve to overview. Admin metrics is not in public navigation; no authenticated owner is currently established.

A Part 2 route migration must select **one rendering owner**:

1. Keep a legacy research route under its current adapter while its numerical/selector invariants are tested.
2. For a migrated portal feature, mount a bounded view adapter owned by that route and the unified shell. A React binding may consume the shared token/component contract, but it must not introduce the portal header/footer or nested application router.
3. Do not mount React into legacy `#content` while legacy renderers/delegated listeners still own that DOM. Before transferring a route, define its lifecycle, event ownership and cleanup; isolate legacy handlers from the new subtree, then switch routing atomically.
4. Preserve compatibility aliases through the single route resolver. Portal aliases `/rank-predictor` and `/pyq-bank` need explicit destination mapping; full-path routes additionally need a verified host fallback strategy.

## UI and visualization contracts

`src/ui/components.d.ts` describes AppShell, AppSidebar, WorkspaceHeader, PageHeader, StatCard, ChartPanel, FilterToolbar, DataTable, SearchCommand, SegmentedControl, SourceBadge, ConfidenceBadge, DetailDrawer, EmptyState, LoadingSkeleton, ErrorState, and ProtectedRoute. These primitives do not call backend endpoints. Endpoint/query orchestration belongs in route/domain adapters.

Text properties are escaped. Properties ending in `Html` are explicitly trusted internal renderer output; the `InternalHtml` alias is documentation, not a sanitizer. Never interpolate forum posts, API errors, candidate names or other external text into raw slots. Future React bindings should use text children or the same validated component API rather than unchecked `dangerouslySetInnerHTML`.

The SVG foundation remains the chart engine. Shared conventions cover palette, axis typography, minimal gridlines, number formatting, tooltips/accessible labels, selection states, chart actions, empty states, attribution and responsive containers. Future mock/rank/admissions/PSU charts must use these conventions. Keeping Recharts within a later bounded migrated view is a separate technical decision, not a reason to add it to every research route now. Chart export only appears for real plots; route export only appears where meaningful data is available.

Source evidence (`verified`/`unverified`/`hypothetical` as a source claim), review status (`source_reviewed`/`independently_reviewed`) and annotation confidence (`high`/`medium`/`low`) remain different concepts. Candidate-entered mocks are not official verified results. The public corpus's structural difficulty is not observed item accuracy or fitted IRT. Loading, unavailable, not-found, unauthorized, forbidden, error and legitimate empty states must be visually and semantically distinct.

## Domain, capability, access and data ownership boundaries

| Domain | Current capability | Access / ownership | Contract and migration boundary |
|---|---|---|---|
| Research datasets | Working public static corpus and provenance | Public; no candidate identity in research exports | `ResearchQuestion`, `ResearchScope`, `ResearchResult`, `ResearchService`; preserve every original ID, source flag and audit record through read-only adapters |
| Research statistics | Working existing math and cohort logic | Public results; state scope/sampling unit explicitly | `AnnualAllocation`, `DescriptiveSummary`, `StatisticsService`; adapters delegate, never quietly re-derive methodology |
| Question/PYQ intelligence | Working 520-question metadata/evidence/difficulty; official source links | Public corpus; later private bookmarks separate | `PyqSourceIndex`, `PyqService`; distinguish question from full-paper granularity, retain explicit portal legacy mapping |
| Scenario simulations | Working hypothetical subject-allocation experiments | Public, clearly hypothetical; no rank forecast | `ScenarioAssumptions`, `ScenarioResult`, `ScenarioService`; preserve normalized totals and baseline backtest meaning |
| Rank prediction | Planned; portal algorithm/source seed audited | Future public estimates; saves private | `RankRequest`, `RankEstimate`, `RankService`; sensitivity range is not calibrated confidence; server recomputes saved results and records method/data version |
| Admissions | Planned | Future public historical evidence, not admission guarantees | `AdmissionQuery`, `AdmissionEvidence`, `AdmissionsService`; preserve programme/category/year/round/units, explicit data-needed result |
| Institutes | Planned | Future public reviewed directory | `InstituteRecord`, `InstitutesService`; one programme/reference repository shared with admissions |
| PSU intelligence | Planned | Future public recruitment-specific evidence | `PsuRecord`, `PsuService`; no live vacancy/eligibility claim from a generic historical reference list |
| User accounts | Unavailable, no destination provider/session | Verified server identity only | `Principal`, `AuthState`, `IdentityService`; no browser-minted successful principal, owner toggle or fake sign-in |
| Personal dashboard/profile | Planned | Own-user saved predictions/profile/bookmarks | `PersonalDashboard`, `CandidateProfile`, `SavedPrediction`, `PyqBookmark`, `DashboardService`; authenticated context, never public corpus fields |
| Study planning | Planned | Own-user plans/tasks | `StudyPlanInput`, `StudyTask`, `PlannerService`; transactionality, dates, minutes, completion and user isolation |
| Mock analytics | Planned | Own-user candidate-entered attempts | `MockAttempt`, `MockService`; preserve manual provenance and units; local item-response CSV stays independent and is not automatically uploaded |
| Reminders/notifications | Unavailable provider; planned features | Own-user preferences, jobs and notices | `Reminder`, `Notification`, `ReminderService`, `SchedulerAdapter`; separate persisted/pending/active/paused/failed/complete from actual delivery |
| Community | Planned | Deliberate public discussion DTOs; authenticated contributions | `PublicDiscussion`, `PublicReply`, `CommunityService`; expose only chosen display fields, moderate and rate-limit writes, keep private profile/email/provider subjects out |
| Owner/admin analytics | Unavailable and hidden | Server-verified owner role **and** exact configured provider subject; aggregate only | `OwnerMetrics`, `OwnerMetricsService`; no identities/contact/progress/audit-row export, documented suppression and genuine delivery logs |
| Application preferences | Working browser-local Settings | Device-local theme/context/scope/columns/note state | No profile backend. A future explicit account-sync action is a separate permission/data flow, not automatic migration on login |

`src/integration/contracts.ts` exports the public, private and service type modules. `ServiceResult<T>` separates `ok`, `unavailable` (`not_configured`, `planned`, `unsupported_provider`) and errors (`unauthorized`, `forbidden`, `invalid_input`, `not_found`, `dependency_failed`). Interfaces are not implementations. No always-successful fake repositories or endpoints are provided.

## ADR-002 — Future backend behind one application origin

**Part 1 decision:** remain static. No server endpoints, migrations, jobs, private imports, OAuth redirections or production secrets are activated.

**Part 2 recommendation, gated by runtime selection:** expose one same-origin `/api` boundary using supported fetch-native handlers/adapters. Keep domain code independent of transport and database. If supported Workers and bindings meet the selected database/identity needs, use a Worker-safe API transport. If managed MySQL requires a separate approved API runtime/transport, route it behind the same application-origin backend boundary; do not ship a second portal frontend or expose database credentials to the browser.

The portal's Express/http/net listener, `mysql2` connections, Node process startup and Manus Forge heartbeat cannot run unchanged inside the current static Sites artifact. Options that require a new server output/hosting manifest must be deliberately configured and verified in Part 2. No API exists merely because `GATE_API_ORIGIN` validates.

Database selection is a real decision. The portal schema/migrations are MySQL with 16 tables and five ordered migrations. A D1/SQLite path requires explicit translation of enums, auto-increment, timestamps/onUpdate, JSON, queries, indexes and drivers; the checked-in MySQL SQL must not be run unchanged. The current environment validator accepts selected MySQL/PostgreSQL connection URLs; a binding-based D1 choice would require its own validator/adapter and must not be represented by a fabricated DATABASE_URL.

Public reference imports must be reviewed/versioned separately from identity and candidate data. The ZIP includes `server/seed/prototype-data.json` and five full-paper link seeds, but excludes live user/profile/planner/mock/forum/audit rows and secrets. Reference access in the source can upsert data and send notifications: do not run that seed-on-read behavior against production during Part 1. Any later private-record migration requires a separately authorized export/import plan, backup, identity mapping, retention and rollback. Do not run the source `db:push` against production.

## Identity, configuration and scheduling gates

Actual foundation files reviewed: `src/integration/public-contracts.ts`, `private-contracts.ts`, `services.ts`, `contracts.ts`, `access.mjs`/`access.d.mts`, `environment.mjs`/`environment.d.mts`, `env.example`, `README.md`. There is no active transport or provider implementation in these files.

`access.mjs` consumes an authoritative verifier result and fails closed on unavailable, anonymous, expired, wrong issuer/audience or missing identity. Owner authorization additionally requires the configured exact subject and owner role; no development bypass or owner override of other users' private records is defined. These helpers do not cryptographically verify tokens themselves; the future server verifier must validate signature, issuer, audience/application, expiry, nonce/state/CSRF and cookie policy before returning a principal. Component `ProtectedRoute` is presentation only.

`environment.mjs` validates explicit inputs without reading/exporting secrets or testing connectivity. Static mode is the default. To request private capabilities, services mode plus capability flags and their dependencies must be explicit:

| Capability | Required destination conditions before activation |
|---|---|
| Any service | Approved server runtime and HTTPS public/API origins, deployed transport and readiness checks |
| Identity | Selected provider; AUTH_ISSUER_URL, AUTH_AUDIENCE, explicit provider verification or HMAC session strategy; HMAC additionally requires destination SESSION_SECRET of at least 32 characters; real provider connectivity/callback tests |
| Database | Selected supported SQL adapter, migrations rehearsed in a disposable database, server-only DATABASE_URL or deliberate binding design, connection/readiness/rollback tests |
| Scheduler | Identity + database, configured durable provider, server-only SCHEDULER_SIGNING_SECRET of at least 32 characters, authenticated callback identity/signature/replay checks, outbox and unique delivery keys |
| Owner metrics | Identity + database, server-only AUTH_OWNER_SUBJECT, exact subject/role enforcement, genuine aggregate/attempt/outcome logs and privacy policy |

No values from Manus/Forge are assumed portable. `env.example` contains names and blank values only. Server secrets and authorization settings must never use VITE_/NEXT_PUBLIC_/PUBLIC_ names or enter `dist/`. The config validator rejects populated public credential-like variable names and redacts values from diagnostics, but a valid config is not successful connectivity or authentication.

Reminder activation must use a durable lifecycle/outbox: write pending work, register/reconcile provider task, record actual provider confirmation, and retry safely. Pause/cancel must reconcile provider state, not merely hide it. Callbacks need uniqueness-backed dedupe and proper one-shot cleanup; source select-then-insert checks and daily deadline jobs are insufficient. Health metrics must come from actual attempt/outcome/latency logs. Do not carry over manufactured 100% delivery rates or zero failures from incomplete source telemetry.

## Preserved analytical invariants and rollout proof

- 520 stable question records, 65 per year and 100 marks per year across 2019–2026; original source/publication policy and all open flags retained.
- Default difficulty cohort: 509 non-MTA questions; structural component weights 25/25/20/20/10 and default 35/65 band labels unchanged.
- Sample variance uses n−1; selected-year subject descriptions include zero allocations; one-year SD/CV remain unavailable; null/constant/tied-rank behavior remains explicit.
- Exact trend studio intentionally uses all eight annual papers. Bootstrap is seeded. Scenario composition requires complete annual allocations and normalizes to 100; it is not a rank predictor.
- The local response CSV tool remains local, preserves duplicate/input validation, non-MTA handling and complete-candidate caveats, and is not an account mock database.
- Charts, linked question tables and exports share the exact current cohort selectors including scope/topic/confidence/MTA/query/brush/issue filters.

Part 2 rollout is incremental and capability-gated: validate source/DTOs, configure a disposable environment, verify services and ownership, implement a single view adapter, test all states, enable one route, then rerun the entire public-research regression/visual suite. Rollback must be able to disable each new capability while keeping the current research site available. Tests, screenshots, pushed source SHA and terminal deployment result belong in the actual handoff; this document makes no independent deployment claim.
