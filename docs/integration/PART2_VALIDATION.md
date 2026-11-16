# Part 2 executed validation

Final full command: `npm run verify`, executed successfully on 2026-11-15 using Node 26.13.0 on Windows. This is an execution record, not a proposed test plan.

| Check | Result |
| --- | --- |
| Deterministic production static build and local entry asset validation | PASS |
| Strict TypeScript domain/HTTP/component contract and declaration checks (`skipLibCheck: false`) | PASS |
| Node domain, policy, SQL, HTTP, generated markup and controller suite | 90 passed; 0 failed, skipped or cancelled |
| Original research regression suite | PASS |
| Original research UI regression suite | PASS |
| Preserved corpus and protected analytical/source assets | PASS; 520 canonical records, baseline SHA-256 comparisons |
| Exact topic/cohort comparisons within each research suite | 2,051 checked successfully |
| Original question inspectors | 520 exercised within the research suites |
| Supported integer rank model cases | 1,763 finite/monotone cases with low ≤ center ≤ high |
| Real loopback HTTP listener | PASS; application/bundle serving, registration, cookie session, SQL writes, Origin/CSRF boundary, spoof rejection and logout revocation |
| Actual SQLite API → personal/PYQ controller flows | PASS; accounts/profile, planner/completion, mock reconciliation, canonical collections/bookmarks and identity isolation |
| Database reopen, reminder recurrence/idempotency/retry, community permissions and owner privacy | PASS |
| Full personal history/reply pagination and account changes while pages are pending | PASS; includes 101 attempts/replies, 366 tasks and explicit 10,000-record error bound |
| Native browser rendering, keyboard/native form behavior, desktop/tablet/mobile visual QA | NOT RUN; browser automation unavailable |
| Hosted authentication, database and durable scheduling | NOT ACTIVATED OR TESTED |

The suite's UI/controller tests use Node VM and deliberate DOM/FormData simulations, not a browser. Disposable SQL databases contain test fixtures only and are deleted. They are not production accounts or research data. The actual HTTP test uses a temporary loopback server and temporary database. An initial sandbox `EACCES` blocked loopback access; after turn-scoped network access was granted, the HTTP test and final full suite passed.

The final build does not activate SQL, authentication or schedules. It packages the public research/career tools and the truthful private-service gates. All reported hosted functionality must be assessed against `INTEGRATION_PART2_HANDOFF.md`, not inferred from passing local tests. Publication is recorded separately by the native Sites deployment result.
