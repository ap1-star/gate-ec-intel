# GATE EC Research Terminal — Part 1 handoff

Status: Part 1 architecture/UI foundation implemented. Part 2 and Part 3 feature migrations have not started. All existing research data, methods and source references remain authoritative. This document is saved with the code; use `git log -1` / `git rev-parse HEAD` to identify the exact checkpoint. Publication is confirmed separately by the native Sites deployment record, not inferred from this file.

## 1. Existing architecture findings

The actual destination source is available in this repository. Its baseline is `7f93d6c733737a03a4b9c3dc5522482b74bf7728`. It is a browser-side static research application with ordered classic scripts, hash routing, exact shared cohort selectors, hand-written SVG, and the pure `V5Math` engine. `.openai/hosting.json` retains project `appgprj_6af5a0ff7a00819196fd4bf62194e4dd` and `static.directory: dist`. Audience was public and must be preserved. It has no active identity/database/API/scheduler service.

Read [destination audit](docs/integration/DESTINATION_AUDIT.md) for source locations and the full preserved feature inventory. Older walkthrough/QA files describe earlier checkpoints; do not relabel them as current verification.

## 2. Uploaded portal findings

Audited the actual `App.tsx`, `Portal.tsx`, `MetricsPage.tsx`, `DashboardLayout.tsx`, client CSS, routers, DB, predictor, scheduled callbacks, schema, all checked-in migrations, tests/config and handover documentation. The portal uses React 19/Vite/Wouter, tRPC/TanStack Query, Express/Drizzle/MySQL and Manus/Forge-specific dependencies. The actual shell is PortalLayout; DashboardLayout is unused scaffold. README.md is absent despite being referenced in HANDOVER.md. Public reference seed documents and paper links exist; live/private DB rows and secret values are excluded.

The supplied ZIP is retained, unchanged, at [vendor/portal-handover.zip](vendor/portal-handover.zip); its SHA-256 is in [portal-manifest.json](vendor/portal-manifest.json). Extract it into a temporary audit directory for Part 2. It is not a second running application and is not published in dist.

Read [frontend audit](docs/integration/FRONTEND_AUDIT.md), [backend audit](docs/integration/BACKEND_AUDIT.md) and [feature integration matrix](docs/integration/PORTAL_FEATURE_INVENTORY.md). Source handover setup prose was treated as context, not permission to run migrations or activate providers.

## 3. Unified architecture decisions

Retain the research engine and incrementally introduce a shared UI/catalogue rather than rewrite into the portal. `src/ui/` and `src/app/` are the presentation source of truth; `scripts/build.mjs` deterministically generates dist/foundation.js, interface.js and interface.css. Existing datasets/math/analytical engines in dist remain unchanged. Future modules must use one shell and shared tokens/components, with one rendering owner per route. Do not mount React into a subtree while legacy render/listeners still mutate it.

[ARCHITECTURE.md](docs/integration/ARCHITECTURE.md) contains the runtime/API ADR, dependency conflicts and ownership matrix for research datasets/statistics/PYQ/scenarios/rank/admissions/PSU/accounts/dashboard/planner/mocks/reminders/community/owner metrics. A future same-origin fetch-native API boundary is recommended; it is not configured or activated. No second app, HTTP API, database or fake service response was deployed in Part 1.

## 4. Design system and shared components

- `src/ui/tokens.css`: semantic dark/light colors, spacing/type scales, elevations and radii.
- `src/ui/workspace.css` + `part1.css`: common component, chart and responsive conventions.
- `src/ui/components.js` + `components.d.ts`: AppShell, AppSidebar, WorkspaceHeader, PageHeader, StatCard, ChartPanel, FilterToolbar, DataTable, SearchCommand, SegmentedControl, SourceBadge, ConfidenceBadge, DetailDrawer, EmptyState, LoadingSkeleton, ErrorState and ProtectedRoute.
- `src/ui/visualization.js`: theme-aware ten-series palette, SVG presentation, tooltip association, units and missing-value number conventions. It performs no statistical calculation.
- `src/ui/research-workspace.js`: actual research adapters and interactions. Existing numerical engines/selectors remain authoritative.
- `src/app/routes.js`: current/future route catalogue and export capability policy.
- `src/app/preferences.js`: shape-validated local saved views, explicit storage failure results and no mutation before a successful load.
- `src/app/bootstrap.js`: actual loading skeleton and recoverable startup failure feedback.

Text props are escaped. `*Html` props accept trusted internal markup only; they are not a sanitizer for community/API/user strings. ProtectedRoute is a presentation primitive, never server authorization. Actual Lucide SVG assets/license are retained.

Design decisions apply restrained elevations/text/border states from [Geist](https://vercel.com/geist/colors), grouped/collapsible navigation from [Linear](https://linear.app/changelog/2024-12-18-personalized-sidebar), and chart-centered workspace conventions informed by [TradingView](https://www.tradingview.com/support/solutions/43000746975-tradingview-layouts-a-quick-guide/). These are pattern references, not copied branding or a claim of equivalence.

## 5. Completed UI changes

Grouped collapsible sidebar with Research/System working tools and clearly planned Career/Personal/Community groups; compact command bar with actual dataset version, search, direct theme switch and capability-aware export; functional local Settings; larger legible hierarchy; coherent chart/table styling; theme-aware plots/exports; the flagship overview with real metrics, subject trends/stability/heatmap/notes and searchable records.

The shell preserves unchanged DOM containers; filters and tab controls restore focus; route changes focus the new heading. Mobile navigation has explicit expanded state, close/Escape behavior and keyboard focus containment. Empty results, missing/unknown routes, unavailable future modules, startup failures and storage errors have honest feedback. No private account/control is presented as connected. Source drawer copy now refers to its actual official PDF links.

## 6. Working routes

All 15 original research routes remain: `#monitor`, `#explorer`, `#subjects`, `#topics`, `#questions`, `#lab`, `#distributions`, `#inference`, `#responses`, `#compare`, `#difficulty`, `#scenarios`, `#audit`, `#reports`, `#evidence`. New `#settings` controls local preferences. Global command search indexes working routes and real question records only.

Research sidebar groups: Overview; Research Explorer (score/difficulty); Subject Analytics (allocation/comparison); Statistical Lab (five lab modes/distributions/exact trends/local responses); PYQ Intelligence (question database/topic hierarchy); Scenario Lab. System: Data Integrity (audit/methods/exports) and Settings.

## 7. Prepared future routes

`#rank`, `#admissions`, `#institutes`, `#psu`, `#dashboard`, `#planner`, `#mocks`, `#reminders`, `#forum` are explicit planned definitions with no service or feature renderer. Their sidebar rows are unavailable text, not misleading links. Direct entry receives a generic planned-state explanation. Unknown hashes receive a not-found state. There is no public admin navigation or claimed authenticated session.

## 8. Feature integration matrix

[PORTAL_FEATURE_INVENTORY.md](docs/integration/PORTAL_FEATURE_INVENTORY.md) records feature, source, actual status, dependencies, destination equivalent, duplicates, A–E classification, approach, migration work, risks and validation. Backend and destination audits supplement it. A = preserve; B = shared UI refactor; C = consolidate; D = migrate only in Part 2; E = reassess unsupported dependencies/evidence.

In particular, consolidate full-paper portal PYQ links with the existing question-level corpus through explicit identity mapping. Keep local response CSV analytics separate from private mock attempts. Do not substitute portal benchmark/prototype datasets for the audited research corpus.

## 9. Existing features preserved

520 stable question IDs, 8 annual papers, 65 questions/100 marks per year and 800 marks total; source and answer-key links; open quality flags and repair history; classification hierarchies; structural difficulty/component scoring and cutoffs; subject/year/topic comparisons; exact trend/BH results; null empirical calibration; seeded bootstrap; scenario normalization/backtests; all five lab modes; linked cohorts, brushes/search/sort/table columns; local response validation/statistics; exports and methodology.

Intentional semantics remain: exact inference uses the fixed eight-paper cohort; scenario allocation uses complete papers and ignores the single-subject filter; local response observations are independent of global corpus filters. Default difficulty cohort is 509 non-MTA questions. Public source policy still uses official links; retained full transcriptions were not republished. [research-baseline.json](docs/integration/research-baseline.json) records unchanged hashes for 41 existing assets, with CRLF/LF normalization.

## 10. Backend dependencies and contracts

`src/integration/public-contracts.ts`, `private-contracts.ts`, `services.ts`, `access.mjs`/declarations and `environment.mjs`/declarations define separate public/private DTOs, explicit ok/unavailable/error outcomes, owner/record policies and server-only configuration checks. There are no fake successful implementations. The static client does not import server config. `env.example` contains blank destination-specific names only.

Express/mysql2/Node startup, Wouter full paths, Tailwind/global portal CSS, Manus OAuth/Forge heartbeat/storage/media and Recharts are not drop-in dependencies for the current static deployment. Keep the existing SVG engine for research. Provider/database connectivity and callback scheduling remain unverified and unconfigured.

## 11. Database and authentication considerations

No SQL migrations, provider login, source-user import or scheduling job was run. The ZIP has schema/migrations, not live private rows. Select a supported backend/database before adapting MySQL migration semantics. Rehearse SQL and rollback in a disposable database. Never run source db:push against production for preparation.

Future server verification must validate signature, issuer/audience/application, expiry and state/cookie/CSRF policy. Owner metrics require exact configured owner subject plus owner role, with no development bypass. Private record ownership comes only from a server-verified session, never client IDs. Aggregate metrics must omit raw identities/progress/audit rows and use a consistent small-count policy. Configuration validation is not provider readiness.

## 12. Tests and verification

Commands from repository root: `npm ci`; `npm run build`; `npm run check`; `npm test`; `npm run test:research`. Current results are recorded in [PART1_QA.md](docs/integration/PART1_QA.md), with actual screenshots and route checks. Node tests include authorization/configuration/preference failures, component escaping, route/capability denial and asset preservation. Both research suites include 2,051 exact cohort comparisons, 520 inspectors, descriptive/null/tied cases, reproducible bootstrap, scenario reconciliation and response CSV validation. VM tests alone do not certify browser layout/events; real browser checks were performed separately.

## 13. Unresolved issues and limits

Portal README missing; no destination identity/SQL/scheduler provisioning; no verified private data or candidate session. Portal frontend tests were inspected, not represented as a newly executed full backend suite. The pure predictor source check found 60 invalid negative-mark sensitivity ranges in 1,763 integer year/mark cases (2023–2025); fix only with Part 2 migration tests. Rank ranges are mark sensitivity, not calibrated intervals; reconstructed/hypothetical years retain qualifications. Admission/PSU evidence is incomplete and is not a calibrated predictor.

Remove the portal hardcoded AIR/LIVE MODEL SURFACE, fix dashboard navigation/admissions parameter handoff, replace fabricated reminder-health rates with actual logs, and implement durable scheduler/outbox/idempotency behavior before activation. Review/extend mock-deadline, paper bookmark and detailed cutoff/recruitment DTOs when those features migrate. Existing research content flags and absence of independent calibration remain explicit. See audits for every source defect and dependency.

## 14. Exact next steps for Part 2

Stop here until the user supplies Part 2. Then read this handoff, [PART2_CHECKLIST.md](docs/integration/PART2_CHECKLIST.md), current route/component/contracts source, baseline checksums and vendor manifest. Choose/verify runtime, identity, SQL and durable scheduler; approve a non-production schema plan; review reference provenance and identity mappings; adapt one feature/service/view at a time into the existing shell; test unavailable/error/empty/auth/owner states and all public research regressions; enable only validated routes. No phase is complete merely because a page or placeholder exists. Do not begin Part 3 independently.
