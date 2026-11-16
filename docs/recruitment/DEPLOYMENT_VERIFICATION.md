# V4 release verification

16 November 2026, IST. These observations distinguish live operation from isolated fixture tests.

## Verified before publication

- The complete build and TypeScript checks passed with the application/domain/API/UI/protocol suite. Final packaging reruns every test and both research suites against the exact source commit. The initial published checkpoint had 224 passing tests; the hosted-database repair adds explicit D1 pattern-limit and long literal-search regressions.
- Both existing research regression suites passed, including 2,051 cohort comparisons in each suite, 520 inspector records and retained statistical calculations.
- The real SQLite composition of the production Worker persisted all eight historical notice seeds and enforced Sites identity/CSRF behavior in fixtures. Anonymous public browsing succeeds; anonymous private requests are denied.
- The four hosted runner phases persisted progress and observed run outcomes in an ephemeral SQL database, independent of any browser.
- The Web Push implementation passed the RFC 8291 Appendix A vector, actual receiver decryption/tamper rejection and ES256 VAPID signature tests.
- Browser QA inspected the populated public explorer, searched SSC, opened the exact three-post SSC notice and checked desktop/mobile layouts. Date-only evidence displays without an invented clock time. Captures: `notice-desktop.jpg`, `notice-mobile.jpg`.
- Native Sites runtime settings were prepared for persistent accounts, owner review and web push. Secret values are stored in Sites and excluded from the source artifact. No email, WhatsApp or SMS provider credentials were supplied; no real recipient was contacted.

## Production observations

- The existing public Site successfully deployed a real Worker, MCP endpoint and all nine SQL migrations. Native D1 schema inspection returned the candidate, recruitment, queue, review, callback and runner tables.
- Live `GET /api/recruitment/catalog` returned HTTP 200 with 97 organizations, 104 pathways, eight notices and database capability true. `GET /api/session` returned HTTP 200 with anonymous Sites mode and database true. Anonymous `GET /api/recruitment/preferences` returned HTTP 401. `GET /api/recruitment/push/config` returned HTTP 200 with configured web push and a public application key.
- Native D1 readback across the returned page cursor verified all eight persisted historical notice IDs. Every exact deadline flag remains false; no guessed reminder instants were inserted.
- The authenticated connected Site plugin successfully executed all four hosted phases: official-source check, fanout, reminder scheduling and delivery. Persisted readback returned next_phase=0, a successful runner timestamp and a completed delivery-stage ledger. Empty candidate queues produced zero submitted or delivered messages.
- The first checked official careers source returned HTTP 403. That restriction was durably recorded with retry backoff, with no bypass or successful-source-fetch claim. Source access must be assessed per adapter; enabled configuration does not guarantee access.
- The linked cloud schedule `Automation_746a7135d7fc8191b40675a309e7299d` is enabled hourly at minute 15 in Asia/Kolkata. Each run calls two complete bounded backend cycles and reads persisted health. Its first scheduled occurrence was set for 16 November 2026 at 13:15 IST. After the manual test ended, persisted runner activity advanced to seven checked sources, five successful source fetches and a successful runner timestamp of 14:23:33 IST. This is observed later backend progress, separate from the earlier manual cycle and the native schedule-creation result.
- `SCHEDULER_ACTIVE=true` was applied through Sites environment revision 3 after writer verification and schedule creation. The periodic work uses a linked cloud task and authenticated Worker operations, not a browser timer or a locally running desktop process.

## Hosted-runtime regressions covered

Live validation exposed D1's short LIKE/GLOB pattern limit during a checksum-event lookup. The repaired code uses exact notice/version/hash/event-key equality. Long literal forum searches use substring matching rather than a long wildcard pattern. A strict guarded test rejects the former query and successfully initializes all eight notices.

Cloudflare automatically compresses response bodies by default when a content-encoding header is present. Public assets are already compressed inside the Worker bundle, so responses explicitly use the documented manual encoding option. A regression simulates Cloudflare transmission and proves a browser receives readable HTML after one HTTP decode. Production browser review must follow this asset repair; source rendering alone cannot validate hosted response encoding.

After the encoding repair, live HTTP verification returned readable HTML and JavaScript, and browser review showed the populated explorer with the actual authenticated owner account. Raw source links without verified posts remain in the owner review intake and are excluded from the public notice catalogue/list/detail until approved; the public catalogue reports their pending-review count separately. Historical partial-evidence notices remain available. Initial loading uses a loading state rather than displaying a false feed failure.

## Remaining boundaries

Email, WhatsApp and SMS have integration code and consent/verification gates, but no verified provider accounts or approved senders/templates were supplied. No real external alert was sent. Web push still requires a person's browser permission, actual subscription and explicit consent. Authenticated candidate writes were tested against real isolated SQL fixtures; do not claim a real person's production profile was edited merely because the service and owner MCP identity work.

The official directory contains partial and unverified routes. No nationwide completeness certification, all-post eligibility certification, production-scale throughput guarantee or deferred comprehensive historical integrity audit is claimed.
