# Part 2 career integration

## Implemented source

- `src/domains/career/seed.json`: byte-preserved donor `server/seed/prototype-data.json`; no research corpus replacement.
- `predictor.mjs`: donor rank/score mathematics with its negative-mark sensitivity endpoint corrected from a zero clamp to the supported −20 minimum. Central rank calculations remain unchanged.
- `index.mjs`: shared browser/server API, strict input validation, evidence classification, historical comparison, programme normalization, PSU unit/category normalization and filters.
- `source-manifest.json`: seed checksum, extraction provenance, method change and known source caveat.
- `src/features/career.mjs` + `.css`: Rank Intelligence, Admissions Explorer, Institute Intelligence and PSU Intelligence using the Part 1 component API. No donor shell, router, telemetry, styling framework or chart library was copied.

`createCareerFeature(bridge)` returns renderers/names/descriptions and delegated click/change/submit handlers. `handleClick` can be asynchronous for saving. The bridge must provide `C`, `icon`, `render`, `navigate`, `params`, `api` and `session`. The JSON API bridge serializes object request bodies and rejects unsuccessful responses. The only career mutation is authenticated `POST /api/estimates {marks,year,category,toughness?}`; the server recomputes the result using `predictRank(input)` and saves the actual authenticated user's record. No localStorage prediction success or fabricated user record is used.

## Working data flows and safeguards

- Rank inputs begin blank. Supported reference years are the actual 2013–2027 donor years. 2026 permits only 21–89.67 marks. 2027 alone supports integer toughness −2 through 3 and remains hypothetical.
- Category affects only the historical qualifying-mark comparison; AIR and approximate score remain category-agnostic.
- The result interval is ±0.75-mark sensitivity, not a statistical confidence/prediction interval. The plotted line is the preserved model, not an observed candidate distribution. No prediction accuracy claim is introduced.
- Donor `verified` labels remain in explicit `sourceClaim` fields. Displayed model/score confidence is not independently verified, and calibration is `not_validated`.
- Rank → Admissions forwards AIR and approximate score separately, with `scoreBasis=model_approximation`; Rank → PSU forwards the approximate score with its unit and disclosure. Users can replace it with their official score. AIR tier benchmarks are visually separate from programme GATE-score evidence.
- Parameterized career links use deterministic defaults for omitted fields, so earlier toughness, search filters or candidate values cannot leak into a new linked scenario. A year-only rank link clears the old result until marks are supplied. Bare routes retain local exploration state.
- Estimate saves snapshot validated inputs, require an authenticated session at click time, and ignore success/error messages that arrive after the result or signed-in identity changed. Session resets clear prior save status.
- There are 600 standard-category programme rows (120 source programme/year/discipline rows × five main categories), including missing category cutoffs. Distinct IIT Madras qualifying-discipline rows remain distinct even when their programme codes repeat. Nulls stay null; no zero cutoffs or missing institutions are generated.
- Qualifying-degree context and accepted GATE paper are distinct. For example, IITM EE2 in 2026 accepts an EC qualifying degree in the donor context but lists the EE GATE paper; the domain does not call that an EC-paper eligible comparison. WQ/PwBD/KM source-specific IISc values, where present, are preserved in details without guessing equivalence to standard categories. The separate CFTI CGPA dataset is not converted into GATE scores.
- The PSU table contains 42 metric/category rows including explicit missing category cells and source PwBD entries, preserving marks/100, GATE score/1000 and AIR separately. Mismatched candidate/record units produce no comparison. The directory retains all 20 supplied organisations as historical reference, not a vacancy feed or current eligibility assertion.
- Programme source details expose filenames, pages, original eligibility notes and official URLs. Exact PSU URLs were absent in the donor and are explicitly unavailable rather than invented.

## Source checks and limitations

Official source links were resolved from primary institutional pages on 2026-11-15:

- [IISc official source index](https://www.iisc.ac.in/admissions/cut-off-report-and-gate-score-of-previous-years/), with operated-score PDFs for 2020–2026.
- [IIT Madras admission page](https://mtechadm.iitm.ac.in/) and its published 2024–2026 cutoff links, including [2026 PDF](https://mtechadm.iitm.ac.in/pdfs/M.Tech.2026_Cutoff.pdf).
- [Official 2025 GATE performance report](https://gate2025.iitr.ac.in/doc/download/GATE2025StatisticalAndPerformanceReportWebVersion.pdf).
- [Official CCMT record service](https://ccmt.admissions.nic.in/or-cr/) remains a comparison-source link; no branch-level NIT/IIIT cutoff extract was fabricated or imported.

This link check is not a new row-by-row certification. A known donor/source discrepancy remains explicit: IITM 2026 ED1Y EWS is null in the supplied seed, while the linked official PDF shows 588. The seed null is preserved; a controlled reference-data repair can reconcile it later. Older historical anchor inputs retain inherited source uncertainty. Admissions/PSU outputs are historical comparisons, never offers, guarantees, live drive eligibility or calibrated probabilities.

## Tests executed

`node --test tests/career-domain.test.mjs` — 15 tests passed. Includes seed SHA-256, golden 2025/55-mark AIR550/score702 result, all 1,763 supported integer year/mark cases finite/monotone with low≤center≤high, category invariance, 2026 support, 2027 bounds, malformed numeric input, source ranges/nulls/row identities, degree-versus-GATE-paper context, unavailable programme data, unit-safe PSU comparisons, HTTPS links, safe initial renderer states, deterministic partial-link inputs and deferred-save identity isolation.

These are source/domain/generated-markup tests. Parent integration must separately record rendered desktop/tablet/mobile browser QA, actual authenticated save persistence and publication results. No full-stack production availability claim is made by this document.
