# Part 1 verification record

Verified 2026-11-15 (Asia/Calcutta) against the actual local static build. This report is distinct from the earlier redesign QA files.

## Automated checks — passed

- npm run build: deterministic shared UI/catalogue generation, local entry assets and existing static hosting manifest verified.
- npm run check: TypeScript noEmit check passed for component/integration contracts.
- npm test: 35/35 Node tests passed. Coverage includes unavailable/anonymous/expired/wrong issuer/audience identity, owner and cross-user denial, verifier failures, environment/public-secret configuration failures, malformed/blocked/quota local storage, prototype/shape validation, escaping, protected presentation, planned routes/export eligibility, visualization conventions and preservation checks.
- npm run test:research: both retained-engine and final-UI-adapter suites passed. Each validates 2,051 exact cohort comparisons and 520 inspectors, with totals/source metadata, filtered exports, null empirical calibration, exact/BH results, descriptive/null/tied cases, seeded bootstrap, normalized scenarios/backtests, response CSV/duplicate validation and all laboratory modes.
- node --check passed for generated foundation.js and interface.js.
- All 41 protected original assets match baseline hashes after CRLF/LF normalization; no datasets, math, scoring files, source exports or analytical engines were replaced.

VM regression tests use DOM stubs and do not prove layout/events. The following checks were performed separately in the rendered browser.

## Rendered browser checks — passed

- Desktop 1440 × 1000: all 16 working routes rendered, application ready, no page-level horizontal overflow.
- Mobile 390 × 844: all 16 working routes rendered, application ready, no page-level horizontal overflow.
- Tablet 834 × 1112: overview inspected with 76px icon navigation, aligned metrics/charts and no page overflow. This was a representative tablet visual check, not a claim that every tablet control combination was tested.
- Dark and light overview inspected. Fixed weak light-chart colors and dark stability tracks. Mobile overview axis labels enlarged.
- Sidebar collapse/expand and focus return; planned-group disclosure; explicit planned/unknown route feedback; export absent on unavailable routes and empty local response data.
- Real Settings appearance controls; global theme switch; research context open/close; scope change/reset and saved view restoration; live research search/empty results; command palette workspace/question search and Enter navigation; source-linked question drawer and close.
- Chart expansion/close, keyboard subject/year drilldown, difficulty presentation tabs, all five lab modes, scenario numeric keyboard input and assumption reset.
- Mobile navigation expanded state, close and route exit; Shift+Tab from the first navigation link wraps within the sidebar; heading focus follows route navigation.
- SVG serialization and PNG generation paths completed with explicit feedback. The automation download-event bridge was unavailable in prior verification; OS-level saved file transfer is not independently certified here. ZIP integrity is checked separately during packaging.
- No browser console errors were observed in the route sweep.

## Screenshots and evidence

- [Desktop](screenshots/desktop.jpg), [full overview](screenshots/desktop-full.jpg)
- [Tablet](screenshots/tablet.jpg), [mobile](screenshots/mobile.jpg)
- [Light theme](screenshots/light.jpg), [Settings](screenshots/settings.jpg)
- [Route checks](route-checks.json)
- [Original-asset baseline](research-baseline.json)

## Integration verification limits

The portal's source and tests were audited. Its entire React/Express/MySQL/provider test suite was not installed or run as an active destination application. No database, authentication, scheduler, community or owner-metrics service was activated or claimed working. The backend auditor executed only the actual pure predictor with Node TS stripping: 1,763 finite/monotonic center-rank checks, with 60 invalid negative-mark sensitivity ranges found and reserved for Part 2. Reference provenance/calibration was not independently certified.

Startup loading/error components and storage/auth failures have focused tests/source guards. Asset-transfer failure and OS storage-policy changes were not simulated in the live browser. Existing research content flags and absent independent response calibration remain unchanged.
