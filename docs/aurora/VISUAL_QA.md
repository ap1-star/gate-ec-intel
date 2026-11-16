# Aurora visual QA

Native Chrome screenshot review was performed on 2026-11-15. The four themes were inspected against the same 520-record, all-year/all-subject research scope. A concrete layout defect was found, corrected and recaptured before release. This report describes the checks actually performed; it does not claim exhaustive browser or private-service acceptance.

## Captured evidence

The sibling `AURORA_VISUAL_QA/` folder contains unchanged native Chrome PNG captures, a machine-readable manifest and a comparison gallery. Device emulation used a 1000px CSS viewport height, fit-to-window preview and device pixel ratio 2. Full-page image height follows content; these are not browser-window screenshots or generated mockups.

| File | CSS width | Evidence |
| --- | ---: | --- |
| `obsidian-overview-1440.png` | 1440 | Corrected flagship theme; chart, stability, notes, heatmap and question table |
| `porcelain-overview-1440.png` | 1440 | Corrected daylight theme, same data and composition |
| `glacier-overview-1440.png` | 1440 | Corrected midnight theme, same data and composition |
| `volt-overview-1440.png` | 1440 | Corrected terminal theme, same data and composition |
| `before-part2-overview-1440.png` | 1440 | Production version 12 before publication of Aurora |
| `before-part2-overview-390.png` | 390 | Part 2 phone reference |
| `obsidian-overview-390.png` | 390 | Corrected Aurora phone reference |
| `volt-mobile-360-heatmap.png` | 360 | Viewport capture of stacked difficulty notes and internally scrolling heatmap |
| `iteration1-obsidian-overview-1440.png` | 1440 | Initial Aurora composition used to identify the excessive chart-row height; superseded |

All final PNGs were inspected. The phone before/after pair shares viewport dimensions and research scope. The baseline full-page phone capture retains the sticky toolbar at its original scrolled position, a native capture artifact; it is not a pixel-aligned scroll-position comparison. The four final desktop theme captures have identical 2880 x 6528 pixel dimensions.

## Findings and corrections

The first Aurora full-page capture exposed a large blank area below the main chart. A long Scope notes stack shared the chart row and dictated its height. The corrected layout keeps only allocation stability beside the chart, then places Scope notes in a compact three-column band below. Tablet and phone layouts stack or compact this band. Corrected captures confirm that the empty area is removed. Numerical values and research calculations were preserved.

The old production capture shows the previous smaller, flatter presentation. Aurora adds a custom brand mark, clearer heading/metric hierarchy, larger readable controls, differentiated surfaces and restrained theme lighting. Porcelain uses warm paper surfaces and elevation; Glacier uses midnight surfaces and blue/copper accents; Volt uses carbon and lime; Obsidian uses graphite and champagne. The charts retain names, numeric labels and different line patterns alongside color.

The final phone capture shows stacked filters, two-column metrics and a compact toolbar. Plot, heatmap and question-table width is retained inside their own scroll containers so labels stay readable. The apparent right-side clipping in these containers is intentional internal scrolling, not document overflow. Long mobile content is a density tradeoff; it has not been tested in a user study.

## Native review matrix

| View | Appearance / width | Observed result |
| --- | --- | --- |
| Overview | All four / 1440 | Complete page inspected; final PNGs saved |
| Overview, top and lower analyses | Volt / 360, 390 | Toolbar fits, filters stack, metric grid fits; heatmap scrolls internally |
| Overview | Volt / 768, 1024, 1280 | Adaptive filters, chart layout and compact/full navigation inspected |
| Subject Analytics | Volt / 1920 | Wide chart, legend, filters and full navigation inspected |
| Overview | Obsidian / 390 | Full page captured and inspected; readable stacked composition |
| Settings | All four / 1440 | Miniature actual-data previews, selected checks and System control inspected |
| Admissions | Volt / 1440 | Dense comparison table, methodology/source rail and shared shell inspected |
| Candidate Dashboard | Obsidian / 1280 | Truthful account-service-unavailable state and public-research action inspected |

These are representative combinations, not all routes in all themes at every width. PYQ, Statistical Lab, Scenario Lab, forum and authorized private/admin workflows retain the documented source-render, contract and regression coverage; exhaustive native interaction review of these modules is not claimed.

## Native behavior checked

- Live appearance selection changed the actual page and chart palette without changing the 520-record research scope.
- Appearance gallery selections and selected indicators updated immediately.
- Refresh retained the Porcelain preference; navigation retained explicit theme choices.
- Command search was filtered to Settings and activated by keyboard.
- Native loading and service-unavailable states were inspected without seeding personal data or enabling production infrastructure.

System OS changes, denied storage, arbitrary unsaved form/modal state, all hover/focus combinations, reduced-motion emulation and image-export behavior are not claimed as exhaustive native tests. Their automated/source coverage is recorded separately in `VALIDATION.md`. The browser's existing theme was applied during loading, but no instrumented first-paint timing measurement was performed.

## Internal design scorecard

This is an engineering/design self-assessment on a 10-point scale, based on the rendered evidence above. It is not user-testing or independent accessibility certification.

| Category | Weight | Assessment | Reason |
| --- | ---: | ---: | --- |
| Visual identity | 15% | 8 | Distinctive mark, restrained lighting and consistent terminal language |
| Color harmony | 15% | 8 | Four coherent appearances; daylight treatment has its own depth |
| Layout and hierarchy | 15% | 8 | Main composition corrected after screenshot review; clear analysis order |
| Typography/readability | 15% | 8 | Larger type and aligned numbers; wide mobile analyses need inner scrolling |
| Lighting/glow | 10% | 8 | Noticeable, controlled and different across themes |
| Charts/tables | 10% | 8 | Readable values, non-color line cues and consistent surfaces |
| Component consistency | 10% | 8 | Shared treatment across inspected research/career/personal/system views |
| Interactions/motion | 5% | 7 | Live themes and command flow checked; full native motion/focus matrix incomplete |
| Responsive polish | 5% | 8 | Seven target widths inspected on representative views; no observed body overflow |

Weighted assessment: 7.95/10. No significant unresolved visual defect was observed in the reviewed combinations. Remaining coverage limits are explicit rather than inferred passes.

## Tool history and reproducibility

Earlier turns could not reliably verify or capture the minimized Chrome preview. A fresh documented helper initialization restored native review in this turn. Browser state occasionally lagged an action by one capture, so loaded views were observed again before assessment. Later, after the dashboard review, restore again reported detected user input; further native input was stopped. No alternate browser automation was used and no unrelated-window capture is distributed.

To repeat: run `npm run build`, then `node scripts/dev-server.mjs --port 8803 --db .openai/cache/aurora-review.sqlite`. Open the printed local URL in Chrome. Choose appearances in Settings, compare `#monitor` at the same scope, and use the browser device toolbar for 1920, 1440, 1280, 1024, 768, 390 and 360px. Complete remaining native checks using real data: PYQ table/cards and source drawer, lab/scenarios, rank result, forum availability, keyboard focus, mobile drawer, System OS changes, storage denial, reduced motion and SVG/PNG exports. Native private-service workflows require a separately authorized development configuration; do not fabricate records to fill the screens.

The `AURORA_PREVIEWS/` HTML gallery is supplementary renderer output, not native screenshot evidence. Publication status is recorded only after the native Sites operation returns in sibling `AURORA_3_RELEASE.json`. Part 3 and production backend activation remain outside this sprint.
