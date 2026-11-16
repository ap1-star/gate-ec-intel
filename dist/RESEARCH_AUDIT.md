# GATE EC research audit — 12 November 2026

Reviewed **520 questions** from the 2019–2026 papers. Every record has a semantic rationale, an official-source visual review and a separate answer-key comparison. This is an AI audit, not independent human certification.

## Findings

- 19 primary-subject changes after canonical alias normalization.
- 41 classification corrections or refinements, including subject, topic and microtopic changes.
- 4 unresolved taxonomy overlaps remain explicitly ambiguous.
- Two supplied answer keys were wrong: **2025 EC43 A → D**, **2025 EC53 B;C → B**.
- 11 marks-to-all records are retained historically and excluded from response calibration.
- The original 13 subject spellings are consolidated into 10 analytical subjects. The official syllabus combines Networks and Signals; the terminal separates them for analysis.
- 267 records carry at least one conservatively detected content-risk flag. Flags include extraction artifacts and uncertain layout; this count is not a count of proven wrong questions.

## What each record now contains

Identity, year, official number, question format, marks, penalty and scoring disposition; original and reviewed answers; original and reviewed subject/topic/microtopic; secondary subjects; review rationale and confidence; cognitive operations; provisional Bloom level; representations and figure dependence; negative wording; text length; official source URL, page and file hash; online/visual/key comparison scopes; content repair notes and original uncalibrated estimates. Topic families are versioned rule-based consolidations of reviewed labels, not a second independent expert judgment.

Empirical difficulty, discrimination, IRT alpha/beta/gamma and observed solving-time distributions remain null because no candidate-response dataset was provided. The original numeric IRT/time fields are preserved only as uncalibrated provenance.

## Source-confirmed examples

| Question | Finding |
|---|---|
| 2022 EC11 | Vector-field line integral was tagged Digital Circuits; reviewed as Engineering Mathematics / Vector Calculus. |
| 2019 EC54 | Current-mirror-biased common-source amplifier was incorrectly called a cascode. |
| 2020 EC05 | Running maximum of input magnitude was incorrectly put under LTI systems; reviewed under nonlinear system properties. |
| 2020 EC03 | Supplied exponential expression differs from the official source, despite agreeing at the derivative evaluation point. |
| 2023 EC34 | Source circuit is a cross-coupled NAND latch, not combinational logic. |
| 2023 EC48 | Supplied filter expression loses its 1/2 coefficient. |
| 2023 EC59 | Official white-noise PSD is 1/2 W/Hz; supplied transcription says 1 W/Hz. |
| 2024 EC57 | Autocorrelation loses its factor 2/3. |
| 2026 EC16 | Input delta sequence loses its 1/3 coefficient. |

## Statistical tools implemented

- Historical format and subject weightage, zero-inclusive annual means, sample SD, IQR, MAD and CV.
- Subject/year heatmap, histograms, quantiles and empirical cumulative distributions.
- Shannon entropy and Herfindahl concentration for subject mix.
- OLS and Theil–Sen slopes, exact two-sided 8! year-permutation tests, Benjamini–Hochberg adjustment over ten subject tests.
- 4,000 seeded paper-level bootstrap resamples for exploratory mean intervals.
- Pearson correlations across annual marks, with constant variables shown as undefined.
- Local CSV response import: observed success rates, Wilson intervals, complete-case corrected item-total correlations, median response times, duplicate/invalid-record rejection.

The annual paper is the sampling unit for trend inference. The inference studio is fixed to all eight papers and explicitly ignores global filters; descriptive panels follow the selected scope. Permutation/bootstrap exchangeability is an exploratory assumption. Annual subject marks sum to 100, so compositional constraints can induce correlations. No future appearance probability or rank model is claimed.

## Design research and decisions

| Primary reference | Applied pattern |
|---|---|
| [Bloomberg Terminal](https://professional.bloomberg.com/products/bloomberg-terminal/) and [Charts](https://professional.bloomberg.com/products/bloomberg-terminal/charts/) | Dense linked research panels, direct function navigation, compact ledgers, stable context. |
| [IBM Carbon data visualization](https://www.carbondesignsystem.com/building-blocks/data-visualization/overview) | Consistent chart hierarchy, coordinated color semantics, clear chart selection. |
| [Microsoft Power BI drillthrough](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough) | Drill from summary to question evidence while preserving the analytical scope. |

The result uses graphite surfaces, amber navigation, blue/cyan analytical charts, monospaced numbers, responsive panels and a command menu. These are adaptations of interaction patterns, not copied layouts or claims of affiliation.

## Remaining limits

Full source comparison does not mean every damaged mathematical expression and option has been rewritten into clean typeset content. Original transcriptions remain clearly labelled, source-confirmed repair notes are attached, and official source pages remain authoritative for scored practice. Two defects originating in the official source are flagged separately. The four remaining classification overlaps need a chosen taxonomy convention or independent expert adjudication. No independent human reviewer or student calibration was supplied.

## Predictor integration boundary

Rank and college predictors are reserved for the next integration. Stable question IDs and versioned evidence can feed that work. Rank models need year-specific marks/rank anchors and held-out-year evaluation. Admissions models need official programme/category/round/year cutoffs; calibrated uncertainty and dataset coverage must accompany outputs.

## Primary sources

- [Official EC syllabus](https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/EC_2026_Syllabus.pdf)
- [Official historical paper archive](https://gate2026.iitg.ac.in/download.html)
- [Official 2026 papers, keys and scoring guidance](https://gate2026.iitg.ac.in/QPs-answer-keys.html)
- [Official 2025 final answer key](https://gate2026.iitg.ac.in/doc/download/2025_Key/EC_Keys.pdf)
- [Columbia University: Item Response Theory](https://www.publichealth.columbia.edu/research/population-health-methods/item-response-theory)

## Validation

All eight terminal views, all 520 question inspectors, record/marks totals, year scopes, semantic-tag completeness, ambiguity exclusions, empirical-null safeguards, exact-test/BH bounds, CSV parsing, response statistics and invalid/duplicate response rejection were checked. Desktop and 390px mobile layouts were visually inspected.
