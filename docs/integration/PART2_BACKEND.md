# Part 2 backend integration

## Implemented state

The backend is a real fetch-native API plus a real SQLite development runtime. It is not an activated production database or a claim of working hosted authentication. The public static Research Terminal remains independent. No Manus/Forge connection, source account, runtime row, production migration or fabricated candidate record was imported.

- `server/api.mjs`: same-origin JSON routes, validation, authorization, user ownership, capabilities, safe errors and rate limits.
- `server/sqlite.mjs`: Node 26 built-in `node:sqlite` adapter exposing D1-style `prepare().bind().first/all/run()` and atomic `batch()`.
- `server/local-auth.mjs`: development-only scrypt credentials and random signed HttpOnly session cookies with expiry, revocation and CSRF tokens. This file is not imported by the Worker API.
- `server/reminders.mjs`: durable SQL occurrence claims, unique notifications, recorded attempts/outcomes, failed retry and local-calendar daily/weekly recurrence. Repeated/concurrent ticks cannot duplicate one occurrence's notification.
- `server/worker.mjs`: optional Sites-compatible API composition using the same core and the platform's trusted identity headers. It does not create tables or provision infrastructure.
- `migrations/0001_candidate_workspace.sql`, `0002_delivery_attempts.sql`: schema-only SQLite/D1 migrations. Local migration tracking is created by the explicit development setup, not by request handlers. API readiness queries the actual `users` table, so it does not depend on Node's migration-tracking table.

## Run locally

From the project root, on Node 26:

```text
node scripts/dev-server.mjs --port 8802 --dev-auth
```

The listener binds only to `127.0.0.1`. It serves the existing `dist/` application and `/api` from one origin. Default SQLite and a generated local signing secret are stored under the ignored `.openai/cache/` directory. The secret is random, persistent across local restarts, never printed, and not a production credential. No account is seeded: a developer must register their own disposable development credentials. Passwords require at least 12 characters and are stored with independent random scrypt salts. The development identity is explicitly reported as `development: true`; it is never a production authenticated account.

Use `--owner <development-username>` only to exercise owner-only workflows locally. This is an explicit development configuration, not a first-user admin grant or a client role toggle. The development adapter ignores forged `oai-authenticated-user-*` headers.

A different non-production SQL path can be passed using `--db <path>`. Do not commit databases, signing secrets or candidate records. The default path is already ignored. Stop the server with Ctrl+C.

To run actual local reminder delivery:

```text
node scripts/dev-server.mjs --port 8802 --dev-auth --scheduler
```

The Node process runs the durable SQL worker every 30 seconds. It stops when the process stops; this is not cloud scheduling. A stopped/unconfigured runner is reported as not configured, and reminders remain saved records. Notifications require the user's explicit `in_app` preference. Email is not implemented and is rejected rather than silently accepted. A single tick is also available for an actual external process scheduler:

```text
node scripts/run-reminders.mjs --db <explicit-non-production-SQLite-path>
```

Daily/weekly recurrence retains the selected timezone's wall time. An invalid timezone is rejected. A DST gap moves to the first valid local minute; a repeated time uses the first resolvable occurrence. Late ticks deliver the outstanding occurrence once and advance to the next future recurrence rather than sending a storm of missed notifications.

## Hosted boundary and approval

The existing static hosting manifest remains unchanged. A production API requires an approved Worker deployment, a persistent DB binding, reviewed migration application, configured trusted Sites dispatch and a real scheduler if delivery is desired. Production database changes have **not** been performed. `createWorkerApi()` uses Sites' injected identity headers and must only be deployed behind Sites' trusted dispatch; it is not an authentication proxy for arbitrary direct HTTP origins. Native platform sign-in is `/signin-with-chatgpt?return_to=<safe-relative-path>`; do not copy Manus OAuth or implement those platform-owned routes.

The Worker API does not mint production sessions. Anonymous requests are denied for private data. `OWNER_SITE_USER_ID` must exactly match a platform-verified Site user ID before owner APIs are allowed; no inferred owner, development bypass or client role claim exists. The server projects only an intentional display name into public forum records; candidate profile, email, saved work and identities are not public research data.

`SCHEDULER_ACTIVE=true` is only appropriate when a real hosted runner has been configured and verified. The optional scheduled export is a composition boundary, not evidence that a cron trigger exists. Preserve honest capability states until external setup and hosted end-to-end tests pass.

## API contract

Every successful response is `{status:"ok",data:...}`. Failures are `{status:"error"|"unavailable",code,message,requestId}` with meaningful HTTP codes. Private/dependency errors are not converted to fake empty success. Session and API responses use `Cache-Control: no-store`. All authenticated mutations require a matching same-origin `Origin`, JSON content type and `X-CSRF-Token` from the session endpoint. A request is limited to 64 KiB. The server's current rate limiter is process/isolate-local, not distributed; global production controls are a Part 3 hardening dependency.

| Path | Methods | Behavior |
|---|---|---|
| `/api/capabilities` | GET | Actual database/readiness and identity/runner capability state |
| `/api/session` | GET | Anonymous/authenticated/unavailable, deliberate display user, CSRF and capabilities |
| `/api/dev/register`, `/api/dev/login`, `/api/dev/logout` | POST | Loopback-only development credentials; unavailable in hosted Sites mode |
| `/api/profile` | GET, PATCH | Own category/year/date/minutes/in-app preference/display name; defaults are actual preference defaults, never performance |
| `/api/dashboard` | GET | Own counts and recent task/mock/estimate/notification records |
| `/api/collections` | GET, POST | Own named collections |
| `/api/bookmarks` | GET, POST | Canonical question/paper targets; idempotent bookmark; optional owned collection membership |
| `/api/bookmarks/:id` | DELETE | Own bookmark; `?collectionId=` removes only that membership |
| `/api/estimates` | GET, POST | Own saved estimates; recomputes the rank from validated input using the shared career domain |
| `/api/planner` | GET, POST | Own explicit plans/tasks; transactional creation and daily/date validation |
| `/api/planner/:taskId` | PATCH | Own completion state |
| `/api/mocks` | GET, POST | Actual candidate-entered scores, optional reconciled subject breakdown and question/error counts |
| `/api/mock-deadlines`, `/api/mock-deadlines/:id` | GET, POST, PATCH | Own one-shot deadline, optionally linked only to an own mock attempt |
| `/api/reminders`, `/api/reminders/:id` | GET, POST, PATCH | Own due records, recurrence and pause/completion status |
| `/api/notifications`, `/api/notifications/:id` | GET, PATCH | Own in-app records and read acknowledgement |
| `/api/forum` | GET, POST | Public paginated/searchable threads; authenticated validated creation |
| `/api/forum/:threadId/replies` | GET, POST | Public non-hidden replies; authenticated creation |
| `/api/forum/vote` | POST | Authenticated atomic unique toggle; no duplicate votes |
| `/api/forum/moderate` | POST | Configured owner only, with server-side audit record |
| `/api/admin/metrics` | GET | Exact configured owner only; access audited, aggregate-only output and small-segment suppression |

Bookmarks use `{targetType:"question"|"paper",targetId,collectionId?}`. Canonical IDs come from the preserved research catalogue; full-paper references never masquerade as individual questions. Multiple memberships are backed by a separate join table. A supplied user ID cannot override server ownership.

Planner input includes explicit `tasks:[{date,subject,topic,minutes}]`; dates must be real calendar dates within the plan interval and per-day minutes must fit the budget. It is a user-created schedule, not a fabricated recommendation. Mock subject scores, when supplied, must reconcile to the total score; leave them empty if incomplete. Optional accuracy fields require all three counts. Topic errors cannot exceed entered incorrect counts. Negative mock scores are accepted within `-total..total`. Candidate-entered provenance remains explicit.

## SQL model and migration status

The schema separates users/development sessions/preferences, collections/bookmark memberships, saved estimates, plans/tasks, mocks/deadlines/reminders/delivery logs/notifications, forum/replies/votes and private operational events. Foreign keys, composite ownership references, unique targets/voters/occurrences and indexes support isolation. Vote changes use one atomic SQL UPSERT. Reminder claim/retry status precedes its delivery transaction; a failed attempt remains observable and can retry safely. Unique notification source keys prevent duplicates.

Local setup applies only unapplied, ordered SQL files in transactions. No API request creates or alters tables. No production MySQL or D1 migration was applied. Existing local/hosted applied migrations must remain immutable; use an appended version for future schema changes. Before a production transition, rehearse the reviewed SQL against a disposable target DB, establish rollback, and obtain the required production approval.

## Executed verification

`node --test tests/backend*.test.mjs` passed 12/12 in the final executed run, including focused failure/retry/expiry and 528-target bookmark pagination regressions. These are real SQL and HTTP tests, not snapshots. Tests create disposable local fixture credentials/data and remove the temporary databases; they do not create production accounts or copy excluded live rows.

Coverage: registration/login/signed cookies, forged-header denial, CSRF/cross-origin/logout/expiry; two-user ownership; canonical multi-collection bookmark operations; transactional planner/date/budget validation; candidate-entered mock consistency and deadline links; server-recomputed rank saving; reminder preferences/timezones/concurrent idempotency/recorded retry outcomes; public forum/private mutation/vote/moderation permissions; owner denial and aggregate privacy; file-backed SQLite reopen; and the real loopback HTTP listener serving one app and persisting writes.

The complete hosted Sites sign-in/DB/scheduler flow is not configured or represented as tested. Browser automation is separate from these SQL/API checks. Production rate limiting, distributed scheduler provisioning/leases, backup/retention, monitoring, abuse controls, provider integration and launch hardening remain Part 3/deployment work.
