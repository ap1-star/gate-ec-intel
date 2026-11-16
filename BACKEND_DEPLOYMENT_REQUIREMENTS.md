# Technical Career Intelligence V4 — deployment

16 November 2026, IST. This release preserves the existing Fetch-native API and Aurora application; it does not claim an Express/tRPC rewrite.

## Runtime and persistent storage

`.openai/hosting.json` declares logical D1 binding `DB` and the Site MCP capability. Sites provisions persistent Cloudflare D1 and applies the schema-only Drizzle migrations staged by the build. SQL is never created from an HTTP request. `migrations/` is canonical; `drizzle/` contains identical schema statements with migration breakpoints and a journal. Existing applied migrations must remain immutable.

`npm run build` bundles `dist/server/index.js`. Compressed public research assets are embedded in that Worker, avoiding an implicit static asset binding. Pre-compressed responses use Cloudflare's documented `encodeBody: 'manual'` option to prevent a second compression pass. Public research and recruitment browsing require no account. Candidate records live in SQL, not localStorage. The existing public Site audience must be preserved.

Sites dispatch supplies verified `oai-authenticated-user-id` and optional verified email/name headers. These headers are trusted only behind Sites dispatch. A direct deployment must provide its own trusted authentication gateway and strip caller-supplied identity headers. Production does not enable development passwords. Platform sign-in/sign-out routes remain owned by Sites.

Private writes require a signed-in identity, same-origin request, session CSRF cookie/header and a write rate limit. `OWNER_SITE_USER_ID` can bind the exact Site-scoped owner identity. Alternatively `OWNER_EMAIL` matches the verified dispatch email, provisioned from the existing Site owner access policy. It is never supplied by a profile form.

## Runtime variables

| Variable | Purpose | Secret |
|---|---|---|
| `PUBLIC_ORIGIN` | Exact published HTTPS Site origin | No |
| `OWNER_EMAIL` or `OWNER_SITE_USER_ID` | Existing owner identity for review and aggregate administration | Yes |
| `VAPID_PUBLIC_KEY` | P-256 web-push public application key | No |
| `VAPID_PRIVATE_KEY` | Matching web-push private key | Yes |
| `VAPID_SUBJECT` | HTTPS or mailto contact URI | No |
| `NOTIFICATION_SIGNING_SECRET` | At least 32 characters; scoped email unsubscribe signatures | Yes |
| `SCHEDULER_ACTIVE` | True only after an actual unattended scheduler is connected and tested | No |
| `RESEND_API_KEY` | Transactional email provider credential | Yes |
| `RECRUITMENT_EMAIL_FROM` | Verified sender address/domain | No |
| `EMAIL_SENDER_VERIFIED` | Set `true` after sender verification | No |
| `RESEND_WEBHOOK_SECRET` | Provider webhook signature secret | Yes |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Official messaging provider account | Yes |
| `TWILIO_VERIFY_SERVICE_SID` | Recipient OTP verification service | Yes |
| `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_CONTENT_SID` | Approved sender/template | Yes |
| `WHATSAPP_TEMPLATE_APPROVED` | Explicit provider approval gate | No |
| `TWILIO_SMS_MESSAGING_SERVICE_SID`, `TWILIO_SMS_CONTENT_SID` | Approved SMS messaging service/template | Yes |
| `SMS_DLT_APPROVED` | Explicit Indian sender/template approval gate | No |

The Site environment stores secret values. They must not appear in source, archives, screenshots, client bundles, automation prompts or logs. Changing Site runtime variables requires deployment to apply the new environment revision. Existing keys must not be rotated casually: browser push subscriptions are tied to the public application key.

Email, WhatsApp and SMS are provider-dependent. Missing credentials/approvals produce blocked capabilities, not claimed delivery. Web push still requires a candidate's browser permission, subscription and separate explicit consent. No real recipient was sent a test message.

## Browser-independent scheduler

The hosted authenticated MCP tool `refresh_technical_sources` executes one bounded durable phase. Four successful calls advance source check → event fanout → reminder calculation → delivery. A SQL lease prevents concurrent runners, a persistent phase pointer survives process restarts, and each stage records observed results. `technical_source_health` reads persisted timestamps and source outcomes without candidate profiles or recipients.

The deployed Worker also exports the standard `scheduled` handler. A handler alone does **not** prove a Cron Trigger exists. Sites cloud scheduling requires an installed/connected Site plugin and a verified unattended writer. Verify a refresh call and persisted readback before creating a linked schedule. Never paste service secrets into a schedule prompt. Do not label scheduling active merely because the code exports a handler.

For an independently managed Node deployment, run `node scripts/run-recruitment.mjs --db <explicit-persistent-sqlite-path>` using an actual service scheduler. It executes the four durable phases without a browser. Install the service under the deployment operator's account; do not point it at an ephemeral/test database. Cloudflare deployments outside Sites may attach Cron Triggers to the exported scheduled handler using their normal infrastructure configuration.

Default hosted batches are deliberately bounded: one source, up to five discovered notice links; one event with ten candidates; five saved records; five queued deliveries. Tune capacity against actual D1 query/time limits and backlog. This release does not certify nationwide scrape completeness or high-volume delivery throughput.

## Official-source and reviewer operations

Only explicitly enabled, directly reviewed sources are polled. Other source rows remain visible watchlist/manual-review records. Fetches enforce exact HTTPS hosts, redirect limits, content limits, conditional validators, timeouts and retry backoff. CAPTCHA/login/access restrictions are recorded; no bypass is attempted. Source check time is distinct from publication time. Discovered links enter `review_required` with unknown application status and no inferred qualification rules.

Owner-only `GET /api/recruitment/review` and `PUT /api/recruitment/review/:id` provide real moderation. Approval needs current revision/hash, an exact official URL, post-level qualification evidence and explicit human attestations. Complete criteria and exact deadlines need separate attestations. Approval, new notice revision, event and immutable audit commit atomically. Startup seeding never overwrites stored reviewed revisions. See `NOTIFICATION_ENGINE_HANDOFF.md` for the request contract.

## Provider callbacks and privacy

Configure Resend delivery callbacks at `/api/recruitment/webhooks/resend` with the provider's signing secret. Configure Twilio status callbacks at `/api/recruitment/webhooks/twilio?channel=sms` or `whatsapp`; sender requests include this URL. Configure incoming STOP callbacks at `/api/recruitment/webhooks/twilio-inbound?channel=sms` or `whatsapp`. Signatures are checked before durable status/consent writes; provider events are deduplicated atomically. Accepted submissions remain `submitted` until provider confirmation. Web-push acceptance is not proof the person saw a notification.

Email confirmation links are one-use, hashed at rest and expire after 30 minutes. Recipient changes revoke previous channel consent. Email unsubscribe is a narrow signed opt-out capability; opening its confirmation page does not mutate preferences. Optional channel defaults are all off. Account-data deletion requires typed confirmation and CSRF, cascades private records, redacts/anonymizes the author's community contributions while retaining other people's replies, and leaves the ChatGPT account unchanged.

## Validation and deployment record

Run `npm run verify`. This includes build/type checks, domain/eligibility/backend/UI/crypto tests and both retained research regression suites. All 520 question records and existing rank/admissions workflows must remain available. Local SQL/fixture tests are not proof of live provider delivery or an authenticated production candidate save. Production observations are recorded in `docs/recruitment/DEPLOYMENT_VERIFICATION.md` after publication.

Protocol references: [Web Push encryption, RFC 8291](https://datatracker.ietf.org/doc/html/rfc8291), [VAPID, RFC 8292](https://datatracker.ietf.org/doc/html/rfc8292), [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Twilio Verify](https://www.twilio.com/docs/verify/api/verification), [Twilio approved WhatsApp templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates), [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
