# GATE EC — Question toughness and difficulty analytics

All 520 questions have an individually reasoned structural toughness estimate. The intended reference is a prepared GATE EC candidate. Ratings are AI judgments, not measured candidate failure rates.

## Scoring rule

**Score = 25C/4 + 25R/4 + 20A/4 + 20I/4 + 10V/4**. Each component is 0–4. C=concept depth; R=reasoning chain; A=computation; I=topic integration; V=representation. The full anchor descriptions are in difficulty-statistics.json and the in-app rubric.

Default bands: **Easy <35; Moderate 35–<65; Tough ≥65**. You can edit band thresholds in the interface; scores remain fixed. Format, marks and text length are not score inputs.

## Annual profile — all 65 questions per year

This table includes MTA tasks so every year totals 65 questions. The default dashboard excludes MTA/free-mark items from scored-burden summaries; use its checkbox to reproduce the table below.

|Year|Easy|Moderate|Tough|Mean score|Easy marks|Tough marks|
|---|---:|---:|---:|---:|---:|---:|
|2019|16|43|6|42.38|18|12|
|2020|16|43|6|42.62|19|12|
|2021|13|41|11|48.10|17|21|
|2022|19|44|2|39.21|24|4|
|2023|25|38|2|38.60|32|4|
|2024|7|50|8|48.00|8|15|
|2025|12|49|4|43.98|15|7|
|2026|12|50|3|42.50|16|6|

## New analyses

- Year-level easy/moderate/tough question counts and mark pools, with direct question drilldown.
- Score histogram and percentile profile.
- Higher/lower challenge topic lists and a full topic ledger: mean score, band mix, tough share, easy marks, sample SD, sample size and score range.
- Topic × year and subject × year difficulty heatmaps with per-cell sample size and drilldown.
- Topic weight versus toughness scatter plot.
- Two-paper comparison: mean-score change, tough-share change, descriptive Cliff’s delta and component profiles.
- Highest-challenge question ledger, with per-question component contributions, rationale, confidence and uncertainty.
- Active-scope export includes the selected thresholds, confidence/MTA filters, year breakdowns, topic results and question scores.

## Review and cross-calibration

All 520 question ratings were authored against the reviewed content and source-specific repair notes. A cross-year anchor comparison found reviewer drift in some familiar circuit tasks. For example, 2026 EC65 was lowered to40 after source inspection identified a direct positive-peak divider calculation rather than an unnecessary full-cycle analysis. The initial component ratings and revision reason are preserved. Cross-calibration remains an AI consistency pass, not independent human calibration.

Weights and boundaries are editorial design choices. These numbers support transparent comparisons, not psychometric claims. Means over sparse topic samples remain unstable, so the topic minimum-n control defaults to3. The dashboard does not call a topic uniformly easy merely because its average is low.

## Scored versus MTA cohorts

All11 MTA questions retain scores for structural content analysis, but are excluded by default from historical scored burden. This leaves509 questions and781 marks in the all-year default cohort. Marks-to-all never means a candidate had to solve the question.

## Files and reproduction

- toughness-audit.csv / toughness-audit.json: every question, dimensions, score, rationale, confidence and source.
- difficulty-statistics.json: rubric and yearly aggregates including and excluding MTA.
- research/toughness_*.json: frozen per-question assessments; toughness_cross_calibration.json records consistency review.
- Run python reproduce-difficulty.py from the extracted gate-terminal folder to rebuild the score dataset and summaries. The script uses Python standard library.
- source-pages/ adds54 official-page previews for130 records that lacked extracted question images.

## Verification

Verified all520 score formulas and bounds, band boundaries,509-record default MTA cohort,65/100 yearly totals with MTA included, band-count reconciliation, all question inspectors, threshold filtering, response-workbench regressions and quoted CSV parsing. Browser QA covers the year-to-question drilldown, score explanations, topic sorting, threshold changes and responsive layout.
