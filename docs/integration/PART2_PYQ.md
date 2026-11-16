# Part 2 unified PYQ integration

The original research corpus remains authoritative: 520 unchanged question identifiers across eight annual papers. `src/domains/pyq/catalogue.json` is a derived server-side allowlist and provenance index, not another editable question dataset. Research text, tags, confidence annotations, difficulty scores and calculation engines have not been replaced.

The donor contains five full-paper references in `server/db.ts` (`officialPyqs:2021` through `officialPyqs:2025`). The reconciliation is deliberately at paper granularity. Two references match the canonical official PDF URL; three link the same EC year to the official archive. Each mapping retains the donor key, relationship, original URL, canonical URL and canonical PDF SHA-256. None is merged into an individual question. Similar text is never a deduplication key, and missing question text is never generated.

`src/features/pyq.mjs` replaces only the question route renderer through the existing research bridge. The existing year/subject cohort, search, difficulty band, review outcome, inspector, exports and sorting remain connected to their original selectors. Added exact metadata filters cover topic family, microtopic, type, marks and source-review/open-issue status. Cards and a 15-record paginated table share the same result set. Eight optional columns use a shape-checked local presentation preference. Official source links remain separate from row inspection.

The existing inspector is decorated with canonical bookmark actions and up to six related questions. Related means the same subject and topic family, ordered by exact microtopic and then recency; it is not an adaptive recommendation. Topic links reset the relevant filters and open the original topic/cohort research tools.

Authenticated bookmarks and collections use the actual SQL API. One question or full paper has one bookmark per user, with zero or more owned collection memberships. Removing a collection membership does not delete the global bookmark. The server validates every target against the canonical allowlist and checks collection ownership. The public static deployment cannot save private records and communicates that limitation. It does not substitute localStorage for account persistence.

An identity generation guard discards pending loads and mutation feedback after an account switch. Private caches are cleared immediately when the host changes identity. Preferences contain only column visibility, never bookmarks or collections.

Executed tests cover corpus/mapping integrity, exact filters, null metadata semantics, private membership, late old-account responses and actual migrated SQLite → API → controller/render flows. Browser rendering and native form interaction still require the pending visual review recorded in the Part 2 handoff.
