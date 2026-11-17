# Seat Map import schema

Source: [GATE Seat Map](https://giri256.github.io/gate-seat-map/) by [giri256](https://github.com/giri256/gate-seat-map). Dataset build date: 22 October 2026. The repository has no declared license. The user supplied this as their own website and expressly requested integration; retain attribution and original evidence links. Public factual data is imported; the original UI is not embedded or copied into the terminal.

`data.js` is the acquired public asset. `data.json` is the same object parsed without executing JavaScript. `manifest.json` contains hashes, acquisition URLs, repository commit, counts and known limits; `sources.json` deduplicates the original official links. `index.html` and `README.md` are retained only as provenance/methodology references. Refresh with `node scripts/import-seatmap.mjs --refresh`; without that flag, rebuild derived JSON from the acquired local snapshot.

## CCMT programmes

`data.programs[]` contains programme **merit groups**, not unique degree programmes, plus one `Total Seats` aggregate with blank identity fields. Exclude that aggregate from programme, institute and seat totals. Composite programme-group key: `icode + pcode + group`.

| Property | Meaning |
| --- | --- |
| `inst`, `icode`, `type` | Institute display name, supplied institute code, institute type |
| `dept`, `prog`, `pcode`, `group` | Department, programme, programme code, merit group |
| `field` | Source's broad discovery grouping; not a formal discipline-eligibility rule |
| `seats[category]` | 2026 seat-matrix count; zero is an actual supplied zero |
| `elig[gatePaper]` | Accepted qualifying-degree indices, into `data.degrees[]`; this mapping is supplied for 2026 |
| `cut[year][category][roundIndex]` | `[openingScore, closingScore]` on GATE's 0–1000 score scale, or `null` |

`roundIndex` maps to `data.rounds[]`: Round 1, Round 2, Round 3, Special Round 1, Special Round 2, National Spot Round. Keep the group when comparing rounds and years. The institute/programme code pair can appear in several groups with different degree/paper eligibility.

Categories: `OPEN`, `OPEN-PwD`, `EWS`, `EWS-PwD`, `OBC-NCL`, `OBC-NCL-PwD`, `SC`, `SC-PwD`, `ST`, `ST-PwD`. A PwD category is a separate supplied category: do not substitute the parent category if absent.

## Exact eligibility and related-degree review

Each `data.degrees[index]` ends in a code, for example `T135` = supplied Electronics and Communication Engineering degree. Formal comparison is the candidate's exact supplied degree index **and** selected GATE paper **and** programme merit group.

An exact match occurs when the degree index appears in `programme.elig[paper]`. The `data.anyDegree` map supplies wildcard indices scoped to qualification level: B.E./B.Tech. index 16, M.Sc. index 431, B.S index 421 in this snapshot. An applicable same-level wildcard can also match. A wildcard at one degree level does not authorize another level.

The source UI additionally calculates near-degree hints from text-based discipline families. Such hints must remain **possibly eligible / needs review**, never an exact verified match. The mapping and seat counts must retain the 2026 cycle label when viewing historical cutoff years.

## Other admission systems

`data.iit[]` and `data.other[]` have raw fields:

`iit`, `degree`, `program`, `department`, `admission_route`, `qualifying_degree`, `gate_papers`, `cutoff_type`, `year`, `GEN`, `EWS`, `OBC_NCL`, `SC`, `ST`, `PwD`, `notes`, `source_url`.

All category values remain strings. Parse a numeric value only when the complete string is numeric. Do not turn missing strings into zero, split ambiguous text into invented values, or relabel every figure a closing score. Examples include institute application minima, shortlisting cutoffs, COAP offers/closing scores and IIIT Delhi's entrance-test-waiver threshold. IIT records are largely CS/DA-related; do not imply EC eligibility from an institute-level record.

Six IIT source references contain a homepage followed by a prose document description, rather than an exact URL. `sources.json` retains `rawReference`, a safe homepage URL and `status: homepage_with_unresolved_document_note`. These must be visibly marked as an unresolved exact-document link; do not display them as independently verified PDF links. One supplied IIT Mandi source uses HTTP and is retained without silently inventing an HTTPS endpoint.

## Import integrity limits

The public object contains 843 array rows, including one `Total Seats` aggregate. The usable set has **842 programme groups**, **760 institute/programme-code pairs** and **84 CCMT institutes**. Actual programme-group seat counts sum to **13,759**; including the aggregate would incorrectly double that total. There are 530 qualifying-degree labels, 30 GATE papers and 3,826 group/paper mappings. Exported numeric round records: 10,574 (2026), 9,465 (2025), 8,155 (2024), 6,239 (2023). These are **34,433 imported records**.

The upstream `stats` declares different prior-year joined counts. Do not present those declared counts as imported rows. The importer records the discrepancy explicitly. The original source's preferred-last-round order is SR2, NSR, SR1, R3, R2, R1, which is not chronological. Expose round selection clearly rather than hiding the rule.

There are 62 IIT programme/year records at 18 IITs and 16 other programme/year records across IISc Bangalore, IIIT Bangalore and IIIT Delhi. Original source links are retained, but this import does not independently reverify every original document.

## Canonical Atlas snapshot

Run `node scripts/normalize-seatmap.mjs` to produce `normalized.json`. It contains `opportunities`, `programmes`, `degrees`, `paperOptions`, `sources`, and shared `eligibilityRules`.

- Degree `code` is the stringified source index (`"178"` for ECE); `ccmtCode` retains `T135`. A degree also carries `level` and same-level `anyDegreeCode`.
- `ruleGroups.degreeCodes` expand only an explicit supplied any-discipline wildcard within its own qualification level and paper. Original supplied indices remain in `suppliedDegreeCodes`. No related-degree aliases are silently accepted.
- CCMT opportunity rows use one programme-group/year/category, with all available rounds and the **chronologically last** supplied round as the summary (`NSR` after `SR2`). Source-category codes remain alongside canonical `GEN`, `GEN_EWS`, `OBC_NCL`, and `_PWD` variants.
- 2026 seat-matrix categories with no cutoff become rows with a null summary and empty rounds, not a zero cutoff. Historical rows always have `seats: null` and retain `seatsYear: 2026` for context.
- The normalizer includes all ten 2026 seat-matrix categories for all 842 real programme groups (8,420 rows), including 41 groups with seat counts but no 2026 cutoff object. It excludes the raw aggregate row. Total canonical opportunities: 16,156, comprising 15,752 CCMT programme-group/year/category rows and 404 supplied institute/category figures; 10,941 rows have numeric summaries.
- Each CCMT row has `eligibilityRef`. Resolve it through `eligibilityRules[eligibilityRef]` at runtime. Keep those shared references; expanding every rule into every serialized row would inflate the payload needlessly.
- IIT/other rows retain `cutoffType`, `evidenceKind`, `rawValue`, original year labels, source-reference status and unstructured-qualification warnings. Missing exact degree codes never mean any degree.
