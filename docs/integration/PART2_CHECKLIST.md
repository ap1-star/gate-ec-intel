# Part 2 integration checklist

**Not started.** Execute this checklist only after the user supplies the Part 2 instruction. Part 1 prepares architecture, shared UI, route definitions and typed boundaries; it does not authorize independently starting feature migration, creating demonstration records, applying production migrations, or activating backend services.

Use [ARCHITECTURE.md](ARCHITECTURE.md), [PORTAL_FEATURE_INVENTORY.md](PORTAL_FEATURE_INVENTORY.md), `src/integration/README.md`, and root `INTEGRATION_PART1_HANDOFF.md` as the source-backed starting point. Record evidence and actual command results alongside each completed gate. A checked item requires observed evidence, not a planned implementation or an old portal walkthrough claim.

## Gate 0 — Scope and resumable source

- [ ] Receive the user's Part 2 instruction and reconcile its exact migration scope. Do not automatically implement Part 3.
- [ ] Read the completed Part 1 handoff, actual checkpoint commit, current hosting manifest/audience, all route definitions and current contract files. Verify the working tree before editing.
- [ ] Preserve the supplied portal source as reference. Record that portal README.md is absent; use available source/config/handover/docs rather than inventing missing setup instructions.
- [ ] Establish the baseline final Part 1 regression and asset-integrity results. Rebuild from `src/` and verify generated outputs match; do not treat old UI screenshots/test reports as new proof.
- [ ] Keep all private future capabilities unavailable until their own gates pass. Do not seed fake users, predictions, plans, mocks, reminders, posts or aggregate metrics to make the interface look complete.

## Gate 1 — Runtime, API, database and secrets

- [ ] Choose and document a supported server runtime/SQL transport. A static archive cannot execute Express/mysql2/Node scheduling unchanged. Follow ADR-002 for one same-origin `/api` boundary, not a second portal frontend.
- [ ] Configure the chosen hosting/server output and transport adapter in an isolated environment. If using Worker bindings or D1, explicitly adapt schema/config/driver semantics; current MySQL migrations and DATABASE_URL validation are not a D1 adapter.
- [ ] Preserve `.openai/hosting.json` project identity/audience. Verify real fetch/API routing, server error handling, request IDs, request-size limits, CORS/CSRF/cookie policy and Date/SuperJSON transport compatibility.
- [ ] Provision destination-specific secrets in the server secret manager only. Validate explicit services/capability configuration; confirm no secret or owner authorization setting enters VITE_/PUBLIC_/NEXT_PUBLIC_ variables, browser source, logs, errors, screenshots or `dist/`.
- [ ] Separate liveness from dependency readiness. Invalid/missing auth, database or scheduler must return explicit unavailable/dependency-failed states; a `{ok:true}` process response or valid config is not service readiness.
- [ ] Rehearse all ordered schema changes in a disposable database. Review SQL/dialect differences, indexes, foreign-key/application ownership rules, backfill and rollback. Never run the portal `db:push` command against production during preparation.
- [ ] Review and version the public seed datasets and official-paper links separately from user records. Replace seed-on-public-read side effects with an explicit controlled import/update pipeline.
- [ ] Import no live private records from historical documentation. If later private data migration is requested, obtain the actual authorized export and define backup, mapping, retention, deletion, reconciliation and rollback before import.

## Gate 2 — Identity, authorization and data ownership

- [ ] Select the real identity provider; verify that the source Manus OAuth protocol is not assumed portable. Configure issuer, audience/application, callback origin, session strategy and owner subject.
- [ ] Implement signature/issuer/audience/expiry verification plus state/nonce/CSRF and secure cookie lifecycle. Replace the source appId-nonempty check with exact configured application/audience validation.
- [ ] Remove the preview sessionStorage/Bearer fallback and full-user-info localStorage persistence unless a separately reviewed destination threat model explicitly requires an alternative. No browser-created Principal grants access.
- [ ] Test unavailable, anonymous, loading, expired, wrong-issuer, wrong-audience, malformed and verifier-failure cases. UI gates must never flash private content during loading or treat failed auth as empty data.
- [ ] Test each private repository with user A and user B. Reads/writes/links derive ownership only from the verified server session; changing a record ID cannot cross users. An owner role does not implicitly grant access to another candidate's private progress.
- [ ] Owner endpoints require both owner role and the exact configured provider subject, with no development bypass in production. Keep owner navigation hidden for guests/members; client hiding is not endpoint authorization.
- [ ] Test logout, session renewal, revoked/expired session, account defaults and private cache cleanup. Signing in must not automatically upload browser-local response CSV, research notes or saved scopes.

## Gate 3 — Domain contracts and reference reconciliation

- [ ] Implement real adapters for `ServiceResult`/capability outcomes; no stubs returning successful fabricated data. Preserve unavailable vs forbidden vs errors vs a genuinely empty list.
- [ ] Validate all external payloads at runtime. TypeScript interfaces and `InternalHtml` aliases alone do not validate data or sanitize text.
- [ ] Preserve corpus IDs and all 520 questions, source flags and audit/provenance fields. Reconcile portal integer IDs explicitly: five full-paper PYQ items are not five individual tagged questions.
- [ ] Review the `PyqSourceIndex` and bookmark contracts before migrating paper bookmarks; support a deliberate paper/question target mapping so existing paper-level functionality is not silently discarded.
- [ ] Extend/validate detailed programme, cutoff-range and PSU recruitment DTOs before activation. Current foundation types are boundaries, not exhaustive imported schema: retain lower/upper cutoff ranges, category, year, round, eligibility conditions, metric/units and source, with nulls for unknown fields.
- [ ] Keep source claim, source review, independent certification, annotation confidence, hypothetical scenario and candidate-entered provenance separate in types and UI.
- [ ] Verify source URLs/record hashes, field confidence and data rights for the reviewed public reference import. Do not reinterpret an inherited `verified` flag as fresh independent certification.

## Gate 4 — One shell and one rendering owner

- [ ] Migrate one route at a time into the shared AppShell, AppSidebar, WorkspaceHeader, PageHeader, forms/tables/ChartPanel and tokens. Do not mount the portal marketing header/footer or nested workspace shell.
- [ ] Decide route rendering ownership and lifecycle before attaching React. Do not let React and legacy `render()`/delegated listeners mutate the same `#content` subtree. Verify mount/unmount cleanup, focus, history and rapid navigation.
- [ ] Preserve current research deep links and test canonical future routes plus explicit portal aliases. Test direct entry, unknown route, Back/Forward and host fallback for any full-path URL scheme.
- [ ] Expose only implemented/available/authorized actions in navigation, command search and exports. Planned route labels must remain honest until a real service/view passes acceptance.
- [ ] Repair source dashboard actions: `onTab={routeFor}` only returns a string; Open planner/Open alerts/Create a plan need actual unified-router navigation.
- [ ] Repair predictor-to-admissions handoff: source sends `?rank=…`, while Admissions initializes 1200 and ignores it. Parse and validate the shared input, retaining explicit manual override.
- [ ] Remove the hardcoded AIR 1,3xx / 52.0-mark LIVE MODEL SURFACE hero. Any illustrative example must be clearly separated; the terminal overview uses actual corpus values.
- [ ] Reuse a single visual system instead of loading portal index.css beside terminal CSS. Test dark/light contrast, fonts, focus, touch, responsive tables, no horizontal page overflow, no chart clipping and reduced motion.
- [ ] Escape all candidate/forum/API strings or render them as text nodes/React children. Test script-like posts, HTML entities, malicious source titles and error messages; raw `Html` slots accept trusted internal renderers only.

## Gate 5 — Rank/admissions/institutes/PSU services

- [ ] Add regression coverage and fix the predictor negative-mark sensitivity-bound defect: for 2023–2025 the center accepts negative marks while one bound clamps to zero. Assert lowRank ≤ center ≤ highRank across the complete supported mark/year domain, including negative inputs.
- [ ] Reproduce existing finite/monotonic behavior, exact support limits (including the reconstructed 2026 curve), hypothetical 2027 controls, categories and missing-data safeguards. Record any deliberate algorithm changes and their evidence.
- [ ] Label ±0.75-mark bands as sensitivity bounds, not confidence/prediction intervals. Keep inherited model confidence/source claims and hypothetical scenarios transparent; do not derive rank accuracy from structural question difficulty.
- [ ] Recompute saved predictions server-side from validated inputs plus a versioned method/dataset, rather than trusting client-supplied rank/range/confidence values.
- [ ] Report held-out validation/error only if actual appropriate data and test design support it. Otherwise keep calibration not validated; never fabricate fitting/validation results.
- [ ] Admissions stays historical benchmark comparison until programme/category/year/round evidence supports more. Keep IIIT/data-needed and missing NIT/CCMT details explicit; no guessed admission probabilities or interpolated missing cutoffs.
- [ ] Validate all institute/year/range/category filters and units. Test PSU score/1000, marks/100 and any marks/AIR record types separately; invalid/blank input must not silently become a meaningful zero comparison. Historical cutoff match is not current-drive eligibility.

## Gate 6 — Private dashboard, planner and mock analytics

- [ ] Bind dashboard/profile/bookmarks to real authenticated records; test first login, loading, network error, empty and populated states with disposable fixtures only.
- [ ] Validate planner calendar dates/timezone, date ordering, per-day/total minutes, task counts and taxonomy. Preserve the local-calendar date regression. Make plan/task creation transactional and optimistic completion rollback reliable.
- [ ] Validate mock score/duration/subject units and consistency. Preserve candidate-entered provenance; do not call manually entered values official verified results.
- [ ] Add explicit typed mock-deadline operations before migrating that existing portal feature; the initial MockService focuses on attempts and must not silently drop deadlines. Cross-user linked attempt IDs must be rejected.
- [ ] Test chronological/latest attempt selection, empty subject breakdown, zero/constant values, deadline links and shared chart tooltips/labels. Keep the browser-only candidate-response CSV analytical tool working independently.

## Gate 7 — Reminders, delivery and operational metrics

- [ ] Choose/configure a durable scheduler adapter and authenticated callback verifier. Verify provider task identity, signature/audience, replay handling and generic public errors without server stack traces.
- [ ] Implement pending/outbox/provider-confirmed active/paused/failed/complete transitions. Test row-write success plus provider registration failure, retry and reconciliation; saved does not mean scheduled.
- [ ] Reconcile pause/cancel/resume with actual provider jobs. Test one-shot year/timezone, daylight-saving behavior, daily/weekly recurrence and completion cleanup; do not leave permanent daily mock-deadline jobs after delivery.
- [ ] Add unique transactional delivery keys, e.g. owner+reminder+scheduled occurrence. Concurrent duplicate callbacks must produce at most one notification and an auditable duplicate result.
- [ ] Verify preference opt-in, inactive/disabled/orphan/not-due callbacks, delivery retry and notification read/retention behavior. Email remains unavailable unless an actual supported consented pipeline is configured and tested.
- [ ] Replace source reminder-health estimates (attempted=delivered, failed=0, manufactured 100%) with actual attempt/outcome/latency/heartbeat records. Display unavailable when measurement is absent.
- [ ] Keep owner metrics aggregate-only. Document small-count suppression consistently across adoption/day/status totals, audit access server-side, and test that names, emails, IPs, user IDs, candidate progress, raw audit rows and recipient data are absent. No unrestricted export/drilldown.

## Gate 8 — Community

- [ ] Implement/validate public read and authenticated create/reply/vote contracts without importing historical demonstration posts. Define deliberate public author display names separately from private profile/identity fields.
- [ ] Add moderation/report/rate-limit/abuse handling and safe text rendering before public activation. Validate entity existence and ownership where relevant.
- [ ] Make votes transactional/uniqueness-safe and test duplicate/concurrent toggles. Distinguish network error from a genuinely empty forum and add meaningful accessible vote/reply actions.

## Final acceptance and rollout gate

- [ ] Run the actual repository build, TypeScript checks and boundary/component/route tests; run portal-origin pure tests after adaptation and any DB-dependent suite only against a disposable database. Do not execute scripts that create/delete fixed-ID records against production.
- [ ] Rerun the terminal's math/cohort/export/520-inspector and response-import regressions. Verify unchanged original corpus/math asset hashes and the intentional sampling/scoping differences across research routes.
- [ ] Render and inspect real desktop/tablet/mobile pages, dark/light themes, keyboard/command search, errors/empty/loading/unavailable states, filters, source drawers, exports and migrated controls. Save new screenshots and test evidence.
- [ ] Test all private dependencies unavailable: public research must still load and work. Test per-module disable/rollback without taking down the foundation.
- [ ] Inspect the exact deployment artifact for secrets/private rows/debug collectors/vendor runtime residue. Package from the pushed tested source; keep migration rollback and release/capability notes.
- [ ] Deploy only the completed authorized scope, preserve audience, and claim publication only after a terminal successful deployment result. Record SHA/version/URL and all verification limits.
- [ ] Update the handoff/checklist with implemented features, unresolved gates and precise next steps. Stop before Part 3 until the user's next instruction.
