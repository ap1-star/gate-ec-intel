# Technical Recruitment V4 — notification engine handoff

This document describes the implemented SQL/store/notification engine and its verified development behavior. It does not certify production scheduler execution, sender approval, recipient verification or real external delivery. See `BACKEND_DEPLOYMENT_REQUIREMENTS.md` and `TECHNICAL_RECRUITMENT_V4_HANDOFF.md` for the deployment result and provider configuration owned by the application composition.

## Implementation map

| Layer | Source | Behavior |
| --- | --- | --- |
| Additive domain schema | `migrations/0003_technical_recruitment.sql` | Official source registrations/check runs; notices and versioned change events; private profiles/preferences, saves, consent, verified contacts/tokens; in-app history; durable outbox and attempt log |
| Owner review audit | `migrations/0007_recruitment_review_audit.sql` | Immutable post/source review snapshots, actor, versions and content hashes; account deletion can anonymize the actor without altering review evidence |
| Durable event traversal | `migrations/0005_recruitment_fanout_cursor.sql` | Resumable per-event candidate cursor, preventing later candidates being starved by a bounded invocation |
| Reminder progress/observability | `migrations/0006_recruitment_scheduler_progress.sql` | Resumable global saved-opportunity cursor and recruitment-specific stage run ledger |
| Provider callback replay protection | `migrations/0004_recruitment_provider_events.sql` | Provider callback deduplication, composed by provider/contact handlers |
| SQL store | `server/recruitment-store.mjs` | Input validation, no automatic external enrollment, source allowlists, canonical hashes, notice versions, transactional notice/event updates and queued-job invalidation |
| Notification pipeline | `server/recruitment-queue.mjs` | Candidate matching, digest aggregation, verified-deadline scheduling, quiet hours, leases, retries, fencing, in-app insertion, provider dispatch contract and delivery observations |
| API subhandler | `server/recruitment-api.mjs` | Public directory/notice reads and authenticated, CSRF-protected private preferences/saves/notification history |
| Provider/verification composition | `server/recruitment-providers.mjs`, `recruitment-contact.mjs`, `recruitment-push.mjs` | Transactional email, explicit recipient verification, standards-based push and authorized-provider messaging boundaries |
| Official-source checks | `server/recruitment-monitor.mjs` | Allowlisted source retrieval and discovery; newly discovered records remain review-required until post context is verified |

Existing research calculations, source datasets and local response analytics are outside this pipeline. Existing personal revision/mock reminders retain their separate SQL runner. The new tables are not browser timers or localStorage persistence.

## Public/private boundary

Public records: registered source metadata/check health, official notice URLs, published dates, post criteria, recruitment status, verification state and versioned change events. Private records: optional candidate qualification/preferences, follows, saved notices, consent, verified contact targets, notification history, jobs and delivery logs. All candidate-owned rows use the server-authenticated user ID and cascading foreign keys. The API never accepts a client-selected owner for these resources.

All channels, including in-app, default **off**. Following an organization/examination or saving a notice does not enroll a candidate in delivery. In-app must be explicitly enabled. External delivery additionally needs a configured provider, verified contact/subscription and an explicit channel consent record. Verification by itself does not subscribe the candidate. A recipient change revokes the previous recipient's consent. Private contact values are never returned in the public catalogue or channel-capability DTO.

`DELETE /api/recruitment/preferences` removes preferences, follows/saves, contacts, verification tokens and consent and cancels pending jobs. Complete account deletion is composed at `DELETE /api/account`; the new recruitment tables cascade when the authenticated user's row is deleted. Existing community retention/anonymization decisions are the account handler's responsibility.

## API contract

Responses use the existing `{status:'ok',data}` envelope. API errors go through the existing fetch-native error handler. SQL uses the existing asynchronous `prepare().bind().first()/all()/run()` and atomic `batch()` boundary, compatible with the actual local SQLite adapter and the production D1 binding.

| Endpoint | Access / behavior |
| --- | --- |
| `GET /api/recruitment/catalog` | Public. Organizations, technical examinations/pathways, notice ledger, source health and capability status. A bundled public-registry fallback remains available without a database or login. |
| `GET /api/recruitment/notices` | Public paginated ledger; `limit`/`offset` bounded by the shared validator. |
| `GET /api/recruitment/notices/:id` | Public notice, exact source link, posts, status, date precision and verification metadata. |
| `GET /api/recruitment/preferences` | Authenticated `{profile,preferences,updatedAt,capabilities}`. |
| `PUT /api/recruitment/preferences` | Authenticated same-origin/CSRF-protected profile and preference replacement/update; reschedules saved reminders. External `channels:true` is refused without existing explicit consent. |
| `DELETE /api/recruitment/preferences` | Removes private recruitment preferences and cancels pending deliveries. |
| `PUT /api/recruitment/consent` | `{channel,enabled}`; enabling external channels requires configured provider + verified recipient. Disabling always works. Also updates the persisted channel preference. |
| `GET /api/recruitment/saved` | Private `{items:[{noticeId,reminderDays,savedAt,notice}],total}`. |
| `POST /api/recruitment/saved` | Private `{noticeId,reminderDays:[14,7,3,1,0]}`; stable unique saved membership, no guessed deadlines. |
| `DELETE /api/recruitment/saved/:noticeId` | Removes only this candidate's save and pending personal deadline jobs. |
| `GET /api/recruitment/notifications` | Private `{items,unread,total,limit,offset}`; each item has its correct official notice URL. |
| `PATCH /api/recruitment/notifications` | Private `{id,read:true}`; read acknowledgement is owner-scoped. |

Provider/contact routes are implemented separately: push public configuration/subscription management, email confirmation/unsubscribe, mobile verification and signed delivery webhooks. Their configuration and approval requirements are documented by the provider composition. This store exposes `saveVerifiedRecruitmentContact` only for trusted server verification flows; there is no public API allowing a caller to mark an arbitrary recipient verified.

## Notice ingestion and event semantics

1. `registerRecruitmentSources` writes reviewed source IDs/URLs/allowed hosts. Source registrations batch at most ten rows per SQL statement. Monitoring enablement and the adapter policy are separate from the evidence flag; a historical PDF can be reviewed but not suitable for automatic checks.
2. `ingestRecruitmentNotice` requires a registered source, HTTPS URL and exact allowlisted hostname. A notice cannot be reassigned to another source ID. Active verification requires an official source, explicit verification time that is not in the future and at least one technical post.
3. Unverified active claims become `unknown`/`review_required`, never advertised hiring. Closed/historical review-required references retain their historical status. Nontechnical posts are discarded from the active post payload.
4. Publication dates and last-checked instants remain separate. Date-only `publishedAt` stays `YYYY-MM-DD` with `publicationPrecision:'date'`; it is not converted to a fabricated midnight. `deadlineDate` and `dateNote` preserve a historical calendar date while `deadlineAt:null`/`deadlineVerified:false` prohibit reminders.
5. Canonical SHA-256 content hashes exclude the changing verification/check timestamp. Unchanged source checks do not create new notice versions or alerts. Optional exact-source `contentHash` participates in the canonical payload so changed bytes at the same PDF URL can trigger renewed review.
6. The notice update and a versioned, unique event are written atomically. Event types cover new verified opportunities, deadline/exam-date changes, admit cards, answer keys, results, other updates, cancellations/withdrawals/closure and verification changes. A legitimate content A → B → A reversal produces a new versioned event rather than disappearing behind lifetime content deduplication.
7. Pending jobs tied to a superseded notice version are invalidated. No source discovery alone grants eligibility or sends a vacancy alert; the monitor leaves discovered notices review-required pending exact technical post validation.

The real checked-in domain catalogue bootstrap was tested: all eight historical notice records persisted, including date-only publication/deadline metadata, without creating any open opportunity or deadline reminder. Indexed/unverified reference evidence remains review-required. No live candidate rows or fake current vacancies were seeded by migrations. Catalogue bootstrap only inserts notice IDs absent from SQL; starting a new isolate cannot overwrite an operator-approved revision, an updated deadline or a source-hash downgrade with older bundled data.

## Owner review and verified-notice promotion

The source monitor never silently promotes a discovered document to a verified opportunity. A configured owner can use:

- `GET /api/recruitment/review?limit=25&offset=0` for a bounded queue of `review_required` records.
- `PUT /api/recruitment/review/:id` with `{expectedVersion,notice,attestation}` to approve an individual current source revision. The route remains behind authenticated owner authorization and the same-origin CSRF checks; no admin navigation or public review endpoint is exposed.

The attestation requires `reviewedByHuman`, `officialSourceConfirmed` and `technicalPostsVerified` to be explicitly true, the exact current `sourceUrl`, a nonfuture `reviewedAt` no earlier than the latest check, and at least 20 characters of review notes. If source bytes have a stored hash, `sourceContentHash` must match it. Each technical post needs its own stable ID/title, cited reviewed document, exact source section and explicit degree/alternative-qualification rules. Complete eligibility criteria need a separate `completeCriteriaReviewed` attestation; exact verified closing instants need `exactDeadlineVerified`. Partial post rules remain partial even after identity/source review.

The server records the owner's declaration; this is an accountable human-review workflow, not machine proof that a PDF was read. A previously indexed but registered official-host document can be explicitly attested for that individual notice without globally marking all new source discoveries verified.

The notice change, versioned event and `recruitment_review_audits` record commit atomically. Compare-and-swap on `expectedVersion` plus the source content hash prevents an intervening source revision being overwritten or receiving a false audit. Audit evidence includes prior/approved payload hashes and versions, exact source URL/hash, human attestation and the approved post snapshot. Database triggers prohibit update/delete of this evidence; only nulling the actor through account deletion is permitted. Already verified records cannot be repeatedly reapproved through this pending-review endpoint.

## Matching and scheduling

`processRecruitmentEvents` considers candidates who explicitly follow the organization/examination or saved the notice. State and route-type preferences apply to unsaved announcements. Technical posts are checked with the injected post-specific eligibility engine where available; documented ineligibility excludes an unsaved announcement. Incomplete criteria never become a positive eligibility assertion. Alerts instruct candidates to read the official post criteria. A deliberately saved notice remains a personal watch/reminder target.

`processRecruitmentEvents({limit,maxCandidates})` stores a candidate cursor after each completed candidate and completes an event only after its bounded candidate scan finishes. Replays are safe through unique job/event keys. New candidates following after an event's traversal has passed them are not retroactively promised the old alert.

`scheduleRecruitmentReminders` only uses verified exact official deadlines with a valid IANA timezone. Configurable offsets are 14, 7, 3, 1 and 0 days. The reminder's default send time is 09:00 in the official deadline timezone; on deadline day, if closing is earlier, the send instant is one hour before closing. This is a notification-time convention, not a guessed closing time. Calendar-only historical dates never schedule a job. Pending reminders are recomputed after a deadline/version change. Existing overdue queued jobs survive a delayed scheduler tick while the verified deadline is still in the future; new saves do not retroactively manufacture past reminders. Closed/cancelled/withdrawn/expired opportunities suppress deadline delivery.

Quiet hours are applied during both scheduling and dispatch. Timezone conversion resolves spring DST gaps to a valid following minute and repeated local times after the current instant. Daily/weekly digests group multiple event memberships into one user/channel/period outbox job. Saved-opportunity deadline jobs remain individually timed. Current supported message language is English; unsupported language values are rejected.

Global reminder traversal uses a SQL cursor and a bounded saved-row limit. Reminder UPSERT statements use at most 91 bindings (seven jobs per statement), below the 100-parameter D1 ceiling. Candidate-specific API rescheduling is capped at 100 saved records per call; the global runner continues the remaining corpus.

## Outbox, retries and delivery evidence

`runNotificationJobs` selects due jobs, atomically claims a lease and checks current preference, current notice version/status, consent and recipient verification again. Lease tokens and `status='leased'` fence all completion writes. A concurrently cancelled in-app job cannot insert a stale notification or claim successful delivery.

States: `queued`, `leased`, `retry`, `blocked`, `submitted`, `delivered`, `cancelled`, `superseded`, `dead_letter`. Each job has a unique idempotency key and at most five attempts by default. Backoff is exponential from one minute, capped at six hours; bounded provider Retry-After can extend it. Every actual attempt records its start/end/outcome and redacted error code. Missing provider configuration or recipient verification blocks without manufacturing a successful delivery.

- In-app insertion and job completion share an atomic SQL batch; notification uniqueness is `(user_id,source_key)`.
- External provider `accepted` is **submitted**, not delivered. Only an observed delivery callback can establish final delivery.
- The injected sender receives `{userId,jobId,channel,recipient,payload,idempotencyKey}`. Payload includes title/body and a validated `officialUrl`; digest payloads contain exact notice items.
- Ambiguous failures are not blindly retried for providers lacking idempotency support; such jobs are dead-lettered for operator review. Expired external leases with unknown prior delivery are also dead-lettered unless provider idempotency is supported.
- A provider-declared idempotency retention window is enforced against the first actual attempt. Once it expires, an uncertain old attempt is not resent under a key the provider may have forgotten.
- Unsubscribe/consent revocation cancels pending optional messages. Already submitted network requests cannot be recalled; delivery logs preserve that distinction.
- A gone web-push subscription removes the contact, revokes consent, disables its preference and cancels further pending push jobs.
- Signed provider callback validation and replay protection are in the provider/contact layer. `recordRecruitmentDeliveryStatus` updates submitted jobs using provider message ID plus channel.

This module performs no network request itself. Production email/WhatsApp/SMS/push calls only occur through configured, explicitly injected provider adapters for verified opted-in recipients. Instagram is not activated by this queue.

## Scheduler composition and operational limits

`runRecruitmentNotificationPhase(db,{stage,now,providers,evaluateTechnicalEligibility,limit:1,maxCandidates:1})` runs one of `fanout`, `reminders`, or `delivery` and records a real run in `recruitment_scheduler_runs`. Failures record a generic error code; private recipient data and exception stacks are not persisted in the run ledger. Cursors and outbox records survive a browser being closed or a server process restart.

On restrictive D1 query budgets, rotate bounded phases across scheduled invocations and run source retrieval in a separately budgeted phase. Do not blindly run 30 external deliveries plus source ingestion plus all-candidate fanout in one low-limit invocation. Start with one source/fanout candidate/saved record/delivery per applicable phase; measure the actual account's query and CPU limits before increasing. Defaults in the lower-level functions are configurable and are not a hosting-capacity guarantee. Keep the configured scheduler period shorter than the required operational alert latency, and monitor pending/blocked/dead-letter counts and cursor progress.

Production still requires an applied persistent SQL schema, authenticated APIs, an actual backend cron/scheduled trigger, configured provider credentials/sender approvals, verification and consent. The presence of SQL/code alone is not evidence that a deployed timer or sender has executed. No external alert was sent while writing or testing this engine.

## Validation completed in development

`node --test tests/recruitment-backend.test.mjs`: **29/29 passed** at this checkpoint. It covers the user's critical cases 9–17 plus unverified/nontechnical suppression, no guessed deadline, daily digest grouping, overdue scheduler ticks, DST quiet hours, legitimate content reversals, same-URL source hash changes, cancellation fencing, account-row cascade, bounded fanout/reminder traversal, real eight-notice catalogue bootstrap, idempotency-window expiry, push subscription revocation, bootstrap restart preservation, owner/CSRF/evidence requirements, immutable review audit, actor anonymization and source-revision races.

A combined targeted run of the 28 new tests (before the final source-check precision regression was added), 11 existing SQL backend tests, 15 boundary tests and the local HTTP test produced **54 passed, one infrastructure failure**: the HTTP test could not connect to the loopback test server due to sandbox `EACCES 127.0.0.1`. It reached no failing application assertion. Rerun `tests/backend.http.test.mjs` with the local network permission used for browser QA. The root task's later full-suite results supersede this intermediate checkpoint.

Tests use ephemeral real SQLite databases, actual signed local development sessions and injected in-memory provider doubles. They never contact an external provider or send to a real recipient. No development success is represented as verified production operation.


## Final integration security review

`tests/recruitment-integration-audit.test.mjs` adds seven independent integration checks: signed STOP callback rollback/replay and recipient isolation; verified delivery callbacks arriving before provider acceptance is committed; account deletion retaining another member's community data; trusted Sites owner email policy, configured-ID precedence and CSRF; distinguishing NTPC PSU engineering from RRB NTPC; honoring disabled autonomous scheduling and owner-gating MCP mutation; and preserving hosted rate limits across requests.

`0009_recruitment_callback_reconciliation.sql` adds durable provider-message/channel correlation to signed callback events. A callback may commit while the outbox job is still leased, before the provider's HTTP acceptance ID is written. The accepted-job completion now atomically reconciles the recorded terminal event, so it cannot remain falsely stuck in submitted state or lose a verified failure through replay suppression.

Bootstrap also preserves the supplied source `checkedAt` evidence time rather than claiming a fresh HTTP check at startup. Date-only examination dates remain calendar fields (`examDate`), separate from unknown `examAt`; no notification time is invented from them. The root task's final full-suite/deployment evidence remains authoritative for release status.
