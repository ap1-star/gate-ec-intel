# V5.0 implementation report — 14 November 2026

## Delivered

The working application now has a dark-first Inter/JetBrains Mono design, twelve primary navigation entries, command search, persistent light/dark preference, collapsible research context, local annotations and locally saved analytical views. The original nine tools, stable identifiers, reviewed taxonomy, source references, response importer and content-audit decisions remain available.

New research tools include a score-range explorer linked to question records, hierarchical topic/subtopic filtering, an area-proportional topic treemap, annual topic co-presence, descriptive statistics with definitions and sample sizes, reproducible annual bootstrap analysis, robust trend and leave-one-year-out sensitivity, rolling means, Pearson/Spearman correlation with tied ranks, exploratory split means, two-paper and selected-period comparisons, and a normalized scenario laboratory.

Scenario controls use complete annual compositions, equal or linearly increasing recency weights, explicit relative multipliers, one-at-a-time ±20% sensitivity and expanding-window baseline backtests. An adjusted scenario is an assumption-driven composition. Baseline backtest errors do not validate arbitrary user adjustments.

Research exports include filtered question CSV, laboratory/scenario/comparison JSON, SVG and PNG for analytical SVG charts, downloadable methodology-aware HTML and printable reports. Question tables support sort order and local column visibility. Existing question cards, difficulty controls, audit queue, original exact-test studio, distributions/ECDF and candidate-response workbench remain accessible through navigation, commands and retained tools.

## Statistical methods

Annual papers are the observations for annual descriptive statistics, resampling and trends. Sample variance divides by n−1 and is unavailable at n<2. Quantiles use linear interpolation. Moment skewness/excess kurtosis are uncorrected descriptive moments, restricted to nonconstant samples of adequate size.

The bootstrap resamples n annual allocations with replacement using a reproducible 32-bit LCG and records seed/iteration settings. Default 1,500 resamples, seed 20261114, percentile 95% intervals. Exchangeability is exploratory with eight papers.

Theil–Sen is the median pairwise slope over actual year differences. Rolling means omit incomplete windows. Correlation uses paired annual observations, with average ranks for ties and undefined constant-variable results. Fixed-total subject allocations can induce negative correlations. Marginal-variance shares are named explicitly and are not contributions divided by the zero variance of the fixed paper total.

## Source and permission policy

The project contained no documented permission for redistribution of complete question wording or scans. The public static release therefore uses official-source links for full wording, formulae and figures. Full local audited text, original transcriptions and source assets are retained outside the served directory. Public metadata retains identifiers, source pages/hashes, subject/topic classification, scores, answer metadata and review history. Full historical question-text search in the public build is limited to searchable metadata until redistribution permission is established.

No new question wording, official records, independent expert ratings or candidate observations were invented. The dataset's research version remains distinct from product version V5.0.

## Verification

- Automated baseline regressions passed, including 2,051 exact topic/cohort comparisons, all 520 question inspectors, totals, null empirical fields, CSV parsing, response statistics and duplicate rejection.
- Added tests passed for descriptive moments, missing/single observations, tied Spearman ranks, robust slopes, bootstrap reproducibility, scenario total conservation, constant backtests, thirteen routes and five laboratory modes.
- Browser checks verified bootstrap controls and SVG download, scenario 100-mark reconciliation and six held-out baseline papers.
- Mobile laboratory at 390×844 had no document-level horizontal overflow (380px document width). The viewport was restored.
- Public export archive integrity checked during packaging.

## Limits and deferred work

Independent human content certification and reviewer-agreement statistics require independent labels. Psychometric/IRT calibration requires suitable observed candidate responses and model validation. Both remain unavailable.

This release implements exploratory split comparisons rather than formal change-point claims. The topic co-occurrence view counts annual co-presence and does not infer conceptual dependence. Raw question score scatter points overlap by design, with a range brush and exact selection export. Arbitrary freehand brushing, persistent user-resized layouts, generalized chart zoom, multi-candidate account storage, and automatic report narratives were not added.

The retained static application uses versioned extension modules rather than a new framework. A future consolidation can reduce legacy wrappers. Formal Lighthouse measurements, a complete WCAG audit and multi-browser certification remain outstanding. No public-launch certification is claimed.

Data-quality flags remain on 220 records, including two critical official-source issues. Targeted repairs are not independent certification. Rank/college predictors require separately sourced marks–rank/admissions data and held-out validation.
