# Technical Career Intelligence V4 — implementation handoff

16 November 2026, IST.

## Implemented map

| Layer | Result |
|---|---|
| Public directory | 104 technical pathways, 97 organizations, 102 source records; general graduate exams and standalone aptitude assessments excluded |
| Hierarchy | Organization → recruiting body → technical examination/pathway → cycle → notice → individual post → qualification evidence |
| Eligibility | Four outcomes with exact degree/branch rules, alternative qualifications, GATE units/years, grades, age reference date, required conditions, experience and explicit exclusions |
| Historical context | Eight source-backed previous/closed-cycle notice records and ten post examples; partial rules remain partial |
| Aurora explorer | Search/facets, source labels/timestamps, three-route comparison, focused notice/post detail, responsive layouts and existing four appearances |
| Candidate workspace | Persistent authenticated profile/preferences, watchlists, saves/reminder offsets, notification history and read state, explicit channel consent, recipient verification and account-data deletion |
| Ingestion | Allowlisted official-source jobs, hashes, HTTP validators, leases, retries/backoff, revisioned notices and deduplicated events; discoveries require review |
| Review | Owner-only API, current-version/hash guards, human attestations and immutable approval evidence; raw discoveries stay out of public notices until reviewed |
| Alerts | Durable phase runner, fanout/reminder cursors, quiet hours/digests, deadline rescheduling, idempotent in-app records, retries/dead letters and signed provider callbacks |
| Delivery integrations | Resend email, standards-based web push, approved Twilio WhatsApp/SMS templates and Twilio recipient verification; external credentials remain deployment dependencies |
| Deployment | Fetch-native Worker and logical D1 binding, Sites-owned authentication, compressed public assets, staged schema migrations and hosted authenticated MCP update tools |

The implementation preserves the existing research corpus, statistical tools, rank model, admissions and PSU explorer. It does not start unrelated Topic Treemap work or claim the deferred comprehensive historical integrity audit is complete.

## Open the workspaces

- `/#recruitment`: notices and technical pathway discovery.
- `/#technical-exams`: search and compare technical examination routes.
- `/#recruiters`: organization directory.
- `/#recruitment-detail?noticeId=ssc_je_2026`: exact historical notice and separate Telecom/Civil/IMD post rules.
- `/#recruitment-preferences`: consented qualification context, watchlists and delivery settings.
- `/#recruitment-saved`: owned saves and verified-deadline reminder choices.
- `/#recruitment-notifications`: real persisted in-app messages and read state.

Browsing is public. Sign-in is required for private records. All notification channels default off. Choosing organizations or saving a profile does not enroll a candidate in external messaging.

## Evidence and limits

47 pathway rows were checked through directly read official pages/PDFs; 20 use official indexed references with incomplete extraction; 37 remain unverified potential sources. These are pathway-level review labels, not counts of employers hiring or complete eligibility certifications. Only directly reviewed source records carry the trusted flag; 38 HTML source monitors are enabled. State-specific coverage is representative and incomplete, not a nationwide completeness certificate.

All actual post-rule mappings are partial or unverified. The eligibility engine can establish a documented mismatch from a verified exclusion but does not manufacture positive eligibility from missing criteria. SSC JE 2026 Telecom and IMD are separate from BRO Civil. IMD degree-route Class XII Physics/Mathematics conditions remain explicit. CEPTAM-11 STA-B's completed-B.Tech exclusion is modeled. RRB JE's full PDF could not be directly retrieved during this review, so exact qualification acceptance remains review-pending. Old ISRO and UPSC application windows are closed. Date-only source evidence never acquires an invented time or timezone and never schedules a reminder.

The user supplied the earlier 58-pathway narrative; its companion row-level CSVs were not supplied or found. This release reconciles its technical scope and cited sources but does not claim a row-by-row audit of the missing package. The V4 technical-only scope supersedes V3 general-graduate/standalone-test suggestions.

## Reviewable files

- `TECHNICAL_EXAM_SOURCE_REGISTRY.csv`: reproducible 104-row directory export.
- `docs/recruitment/SOURCE_VERIFICATION.md`: pathway matrix, official URLs, post citations and unresolved evidence.
- `NOTIFICATION_ENGINE_HANDOFF.md`: SQL model, queue state machine, private/reviewer API contracts, fixture coverage and provider boundaries.
- `BACKEND_DEPLOYMENT_REQUIREMENTS.md`: actual runtime, secrets, scheduler and provider setup.
- `docs/recruitment/DEPLOYMENT_VERIFICATION.md`: production observations and remaining external dependencies.
- `docs/recruitment/notice-desktop.jpg`, `notice-mobile.jpg`: actual browser captures of the new focused notice layout.

`npm run verify` exercises the retained research and new recruitment features. Synthetic queue/crypto/provider fixtures use ephemeral SQL and fake transport, never real candidates or recipients. The Web Push implementation passes the published RFC test vector and receiver-decryption tests. Provider acceptance is distinct from delivery. Production persistence, unattended update readiness and provider delivery must each be reported from their own evidence.

## Live operation and next steps

The live public catalogue and anonymous account boundary were verified after deployment. D1 readback confirmed all eight historical seeds. The authenticated hosted updater completed a full cycle and its persisted health was read back. An hourly cloud schedule is enabled at minute 15 IST, and runtime scheduler capability is active. See `docs/recruitment/DEPLOYMENT_VERIFICATION.md` for exact evidence, source access restrictions and distinctions between a saved schedule and observed execution.

Email, WhatsApp and SMS still require verified provider credentials and approvals. Web push keys are configured; delivery still requires an actual browser subscription and explicit user opt-in. No real recipient was sent a test alert.

The rollout order remains:

1. Publish the Worker/D1 version to the existing public Site and verify public catalogue plus anonymous session behavior.
2. Confirm the live schema and seed rows; verify authenticated saves through the platform session without inventing a candidate identity.
3. Exercise the authenticated hosted update tool and read persisted source/runner results.
4. Connect a real unattended schedule only after that writer is verified; keep scheduler status truthful until then.
5. Supply verified email/messaging providers where wanted, exercise signed callbacks and explicitly consented test recipients, and check delivery outcomes.
6. Expand exact post criteria and state sources through the reviewer workflow. Perform the final comprehensive integrity/coverage certification as its own later milestone.
