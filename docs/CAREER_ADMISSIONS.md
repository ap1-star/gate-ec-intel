# Admissions and institute comparison workspace

`src/features/admissions.mjs` provides `createAdmissionsFeature(bridge)`. The career composition owns registration; the new feature does not install global listeners, change domains, call private services or alter the supplied dataset.

The module provides Admissions Explorer and Institute Intelligence renderers, delegated input/change/click/submit/keydown handlers, an `afterRender` hook and a read-only snapshot. Root host input and keyboard delegation is required. `admissions.css` uses the existing Aurora semantic tokens and is appended after the base career stylesheet.

## Interaction and layout

The candidate/filter rail stays mounted while live results change. GATE score updates move the existing chart marker with a 230ms transform transition and update the candidate summary and record comparisons. They do not replace the focused input, SVG chart or marker. Search waits 90ms after typing; pending work checks the active route before patching. Filter changes update source-backed results, not a forecast.

The dominant visual region plots individual supplied cutoffs or operated-score ranges on a GATE-score axis. The candidate position is a separate dashed marker. Every source row retains its programme, institute, year, category and stage. Preview rows are labelled as the first four numeric results. Selecting up to three records replaces that preview with the exact selected rows.

Programme cards and a dense table are both available, with pagination. Selected programme records appear side-by-side and remain pinned when filters change. Cross-category comparisons are suppressed rather than silently applying the candidate category to a different source row. Comparison cards scroll inside their own container on narrower screens. Charts retain internal scrolling so labels are not shrunk to phone width. Candidate controls stack into a compact grid.

Institute Details carries compatible candidate units and filters through the existing route/query boundary, plus an exact source record ID and at most three selected record IDs. It shows source filename/page, accepted-paper context, degree context and stage. Its expandable historical evidence table retains each same-named programme/category source row separately; it does not merge qualifying-discipline tracks or invent a continuous trend.

SVG marker actions support Enter and Space through the host keydown delegation. Buttons, form fields and disclosure summaries retain native keyboard semantics. Focus, selection, surface elevation, marker emphasis and motion use theme tokens. `prefers-reduced-motion` disables the marker transition, result animation and hover transforms.

## Unit and evidence safeguards

- GATE score / 1000 and AIR are distinct input modes. Changing mode clears candidate values to prevent reinterpretation.
- Links carrying both an approximate score and AIR default to score unless an explicit supported metric says otherwise. Outgoing links carry only the active unit.
- Model-forwarded scores retain the donor-model approximation disclosure. Editing the score changes its basis to entered and updates both input label and result metadata.
- Programme records use score, so AIR mode shows an informative unavailable chart and suppresses numeric programme comparisons. Legacy broad AIR tier heuristics remain inside a clearly labelled source/coverage disclosure.
- Missing cutoffs remain unavailable. Zero is valid if present; it is not replaced by a missing marker.
- EC paper not accepted, category mismatches, invalid candidate values and category-browsing mode do not produce favourable numeric comparisons.
- No admission probabilities, seat availability, guaranteed eligibility or future counselling outcomes are generated.
- All 600 source rows remain in the unchanged career domain. The default GEN scope has 120 rows, 103 with numeric cutoffs. Source labels are inherited claims, not independent certification.

## Focused executed tests

`node --test tests/admissions-workspace.test.mjs` passes nine tests covering unit validation, actual cutoff/range comparisons, missing evidence and accepted-paper guards, programme/track identity, three-record selection, linked defaults and source metadata, cross-unit navigation, live input/marker preservation, route-safe search debounce and keyboard marker actions.

The actual IISc 2022 Electronics and Communication Engineering reference is 650–916 score points; an entered 702 compares as +52 above the historical lower reference. That calculation is supplied by the unchanged domain comparison. This does not establish an admission probability.

These tests are deliberate Node renderer/DOM simulations, not rendered browser QA. The root handoff records actual visual inspection coverage and any browser limitation separately. No native browser automation was performed by this module task.
