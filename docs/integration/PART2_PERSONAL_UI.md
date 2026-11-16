# Part 2 personal, community and owner views

Implemented in `src/features/personal.mjs` and `personal.css`, within the existing Part 1 shell. No donor header, nested sidebar, router, Tailwind stylesheet, fabricated account or sample performance record was imported.

## Host contract

`createPersonalFeature(bridge)` exports:

- `renderers`: dashboard, profile, planner, mocks, reminders, forum, admin
- `names`, `descriptions`
- `load(route, force?)`, `resetUser()`
- `handleClick(event)`, `handleSubmit(event)`, `handleChange(event)`

The host supplies the Part 1 component kit, icon renderer, same-origin API client, current server session, session refresh, canonical research subjects/topics, URL parameters, navigation and render function. API responses may be unwrapped or `status: ok` envelopes. A failed/unavailable API is never converted into a successful empty list.

Private ledger loads follow API offset pages before rendering summaries: planner tasks request up to 520 per page; mock attempts, deadlines, revision reminders and notifications request up to 100. Returned smaller page limits are respected. First-page planner metadata and scheduler status are retained. Duplicate/invalid pages and histories beyond 10,000 records become explicit errors; no truncated totals are displayed. Dashboard lists remain intentionally bounded previews, and forum threads retain their page controls. Expanded replies collect every API page under the same 10,000-record guard.

The host must render after awaiting initial `load(route)`, provided the route is still current. Mutation handlers reload their own route. Call `resetUser()` on session/identity change or logout. The module clears in-memory private caches, form drafts, replies and pending state, and increments a generation. Responses, mutation errors and replies from earlier identities cannot populate the next account's view. Private data is not stored in localStorage.

## Implemented workflows

| View | API-backed behavior | Correctness boundary |
|---|---|---|
| Candidate dashboard | `/api/dashboard` real task, attempt, bookmark, estimate, reminder and notification summaries | No illustrative AIR or generated progress. Bookmark navigation uses `collection=bookmarks` in the unified question explorer. |
| Candidate profile | GET/PATCH `/api/profile`; category, target year, exam calendar date, study minutes, display name and in-app/off preference | Private preference fields stay separate from public research. Display name is intentionally used in community authorship. Email delivery is unavailable. |
| Study planner | GET/POST `/api/planner`, PATCH task completion | Explicit user-selected assignment repeats over daily dates or selected weekly weekday. Calendar validation preserves date-only values across year/leap boundaries. No automatic personalized recommendations. |
| Mock analytics | GET/POST `/api/mocks`; actual attempt date, score/total, duration, optional subject points, response counts and explicit topic error notes | Percentages use each entered denominator. Accuracy needs actual correct/incorrect counts. Topic links use recorded error counts. Unequal subject point totals do not establish relative proficiency. Complete subject breakdown reconciliation remains server-enforced. |
| Mock deadlines | GET/POST/PATCH `/api/mock-deadlines`; optional owned attempt linkage and completion | Actual saved status is displayed. A record is not claimed delivered or active without server status. |
| Revision reminders | GET/POST/PATCH `/api/reminders`; once/daily/weekly; pause/enable | Clock input is converted using the selected IANA timezone. DST gaps and ambiguous times are rejected. Durable delivery belongs to the server runner, never a browser timer. |
| Notifications | GET `/api/notifications`, PATCH mark-read | Only actually stored messages are shown. No generated delivery messages or manufactured success rate. |
| Discussion forum | Public query/filter/pagination, replies; authenticated thread/reply creation and vote toggles | All user text, author names and tags are escaped. Discussion is explicitly separate from verified research. Owner-only hide actions depend on server session and record permissions and remain server-authorized. |
| Owner metrics | GET `/api/admin/metrics?days=7/28/90` | Load is denied for non-owners. Aggregates only, nulls and suppressed segments stay distinct from zero. No account list, private progress or unrestricted export. |

## Authentication and unavailable states

Production sign-in/sign-out are normal top-level Sites anchors only when the server declares platform authentication capability. No custom production OAuth flow or browser role toggle exists.

Local registration/login/logout forms appear only when the API explicitly reports development authentication. These use the real local server credential/session endpoints and are labelled local development. The form limits match the backend: password at least 12 characters, username at most 64, profile year 2020–2040. Passwords are not retained in form drafts. A missing production backend receives an honest connection-unavailable state; it is not labelled cloud persistence.

## Tests actually executed

`node --test tests/personal-ui.test.mjs` — 15/15 passed:

- Gregorian/leap/year-boundary dates and explicit weekly assignment
- Selected-zone reminder conversion; DST gap/ambiguity rejection
- Real denominator/date/error-note mock summaries, missing accuracy handling
- Unavailable/anonymous gates without fabricated candidate data
- API failure distinct from empty forum
- Escaped user-generated text and non-owner API denial
- Owner reminder delivery fractions converted to percentages, with missing rates preserved; labels and denominator explicitly describe unique non-skipped occurrences rather than retries
- Late old-user dashboard, reply and mutation results discarded after reset
- Multi-page histories include all 101 mock attempts and 366 planned tasks, plus later reminder/notification/deadline pages
- More than 10,000 ledger records causes an explicit error rather than partial statistics; an account change during page two discards old results
- Expanded discussions display all 101 replies from multiple pages

Also executed `node --test tests/personal-ui.test.mjs tests/feature-service-flow.test.mjs` — 21/21 passed. The service-flow suite uses genuine disposable SQLite, credential/session cookies and the feature handlers to verify login/logout/profile, planner persistence/completion, mock input and server rejection, canonical bookmarks/collections, and identity changes. It is a DOM/FormData simulation, not browser visual QA.

## Verification limits and remaining deployment requirements

These views are wired to actual backend procedures. Private persistence is functional only where the database-backed service is running; the published static-only build must keep unavailable states until production infrastructure is approved/configured. Owner metrics and durable delivery require their corresponding server configuration. No production database mutation, identity-provider setup, live private record import or production account creation was performed by this UI work.

Browser rendering and screenshots were not claimed by this implementation subtask. The task's computer-use browser tool became unavailable; the owner must report the actual available visual verification separately. CSS uses shared semantic colors, responsive grids and internally scrolling tables, but source inspection alone does not certify rendered layout.
