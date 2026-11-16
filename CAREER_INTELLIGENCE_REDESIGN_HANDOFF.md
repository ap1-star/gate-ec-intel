# Career Intelligence redesign handoff

Implemented on top of Aurora 14, checkpoint `610bc106910d4c2a54eae7165b4b115b7b770029`. This sprint redesigns Rank Intelligence, Admissions Explorer and Institute Intelligence, and connects them to the existing PSU references. It does not begin the final comprehensive integrity audit or activate production account/community infrastructure.

## Delivered interactions

Rank Intelligence now has a split input/result workbench. The marks field and accessible slider synchronize immediately, with supported bounds adapting to the selected year. Changing marks updates the prominent approximate AIR, original sensitivity endpoints, approximate GATE score, qualifying-mark context, scenario cards and existing chart markers. Controls retain focus and input identity. Live changes are batched into an animation frame; historical curves are cached.

Users explicitly add up to three scenarios. Each has a letter, color, marks, actual model estimate and rank difference from A. Selecting a scenario changes the main editing input; removing or resetting scenarios does not invent replacement results. The initial candidate is empty. Linked scenarios use the same validation as direct input.

The relationship explorer plots the actual `rankSeries` output on a logarithmic AIR axis with lower rank at the top. User scenarios have circle markers and marks-sensitivity whiskers; the supplied historical AIR 1 anchor has a square. A second reference-year model can be overlaid without extrapolating the restricted 2026 curve. The same-marks historical strip selects preserved year-specific models. 2027 and its toughness control remain explicitly hypothetical. Keyboard marker actions and accessible labels supplement color.

Admissions has a candidate/filter rail, a dominant historical score-evidence stage, cards/table, and a pinned three-record comparison workspace. Inputs include an explicitly chosen GATE-score/AIR unit, historical record year, category, institute, programme/discipline, search, accepted-EC-paper filter and numeric-evidence filter. Score changes move the existing dashed candidate marker and update comparisons while the focused input remains mounted. Search is debounced by 90ms and checks the active route before applying queued work.

The chart shows only supplied numeric cutoffs or operated-score ranges. Selecting records replaces the four-row preview with those exact records. Each row retains its programme, institute, year, category, stage and source identity. Changing candidate category suppresses comparisons against a selected row from another category. Missing cutoffs and unsupported EC-paper rows do not produce favourable numeric comparisons.

Institute details preserve compatible candidate inputs, filters and selected record IDs. They expose source filename/page/URL, accepted paper, degree context, original stage and record identity. An expandable historical evidence table keeps qualifying-discipline tracks separate and does not infer a continuous trend or missing cutoff.

## Numerical and evidence safeguards

The predictor, career domain, supplied seed and research corpus are unchanged. The following executed 2025 GEN examples come directly from the preserved engine:

| Marks | Approximate AIR | Original marks sensitivity | Approximate score / 1000 |
| ---: | ---: | ---: | ---: |
| 45 | 1,761 | 1,628–1,894 | 584 |
| 55 | 550 | 502–599 | 702 |
| 65 | 140 | 127–153 | 819 |

The range is the original ±0.75-mark sensitivity, not a confidence interval or probability distribution. Central AIR remains the original integer approximation. Category changes qualifying-mark references rather than AIR. The 2026 reconstructed curve still supports only 21–89.67 marks.

Programme references use GATE score / 1000. AIR mode therefore shows an informative unavailable programme chart and comparison; broad inherited AIR tier heuristics remain inside a separate disclosure. No marks-to-score reinterpretation, admission percentage, eligibility guarantee, seat availability or future counselling outcome is generated. Model-forwarded scores stay labelled approximations until the user edits them. Source labels remain inherited claims, not independent certification.

The 600 supplied programme/category/year records cover IISc Bengaluru and IIT Madras. The default GEN scope contains 120 rows, 103 with numeric values. For example, the IISc 2022 Electronics and Communication Engineering operated range is 650–916; score 702 compares as +52 against the supplied lower reference. This is historical context only.

Rank → Admissions passes the validated AIR, approximate score, year, category and `scoreBasis=model_approximation`, with score as the explicit active comparison unit. Admissions → Institute Details forwards only the active unit and exact source IDs. Switching score/AIR clears candidate values. Rank → PSU forwards approximate score and category, without misusing exam year as a PSU recruitment year. Changing the PSU candidate unit clears its previous number and model-score provenance.

## Architecture and presentation

- `src/features/rank.mjs` / `rank.css`: rank controller, actual model chart, scenario comparison, responsive workbench and bounded motion.
- `src/features/admissions.mjs` / `admissions.css`: candidate controls, real evidence plotting, record selection, source detail and compatible navigation.
- `src/features/psu.mjs`: preserved PSU reference rendering/comparison with deterministic linked inputs and unit-change clearing.
- `src/features/career.mjs`: composition of these three modules; numerical engines remain separate.
- `src/features/index.mjs`: input and keyboard delegation; handled career markers close the expanded chart snapshot before returning to the updated workspace.
- `src/ui/visualization.js` and `research-workspace.js`: standalone chart export now inlines computed class-based styling and final marker transforms so CSS-driven curves remain visible outside the application.

All appearances consume Aurora semantic colors, lighting, focus, surfaces and chart-series tokens. No framework, package dependency, domain calculation, API DTO, SQL schema or permission boundary was added or changed. The shared shell still supplies expanded-chart and SVG/PNG export controls for the rank chart. The export appearance helper is covered by a focused test; native export execution is part of the remaining browser checklist.

Layouts adapt to a stacked workbench and forms on smaller screens. Large AIR values wrap safely in source rules. Comparison cards, historical strips and wide evidence tables scroll inside their own containers. The rank chart measures available width and uses sparse mobile ticks. Motion is limited to approximately 160–230ms, with reduced-motion rules. Native overflow, frame time and animation smoothness are not claimed as measured.

## Executed verification

The original baseline was rerun before implementation: 109 tests and both research suites passed. An initial sandboxed loopback request failed with EACCES; rerunning the same verification with approved local-network access passed.

Final `npm run verify`: **137 passed, 0 failed, skipped or cancelled**, strict TypeScript contract check passed, static build/entry assets passed, and both preserved research regression suites passed. Each research suite retains 2,051 exact cohort checks and 520 question inspectors. The 1,763 supported integer rank cases remain finite and monotone.

The 28 added tests cover real rank/scenario values, restricted support, bad/partial inputs, initial and live validation, slider/numeric synchronization without focused-control replacement, frame batching, stale save completions after editing/identity changes, compatible handoffs, category/EC/missing-data safeguards, three-record limits, exact source mapping, route-safe search and keyboard actions. They also cover class-based standalone chart export appearance. Tests are deliberate Node controller/DOM simulations, not native browser tests.

Both new stylesheets parse with esbuild without warnings. `git diff` against Aurora 14 is empty for career domains, backend, migrations, integration contracts and hosting configuration. Existing research preservation checks pass. No comprehensive integrity audit was started.

The local preview served HTTP 200 and the rebuilt appearance/features entry assets. It was exposed through the normal preview panel. Readiness is not visual acceptance. Final verification output is retained in sibling `CAREER_VERIFICATION.log`.

## Rendered QA status and supplemental references

**Native screenshot verification of this Career redesign is incomplete.** The in-app browser helper timed out twice. The Windows Chrome helper then opened a review tab, but a later action was stopped with the physical Escape key. No further Computer Use actions were issued. No new Career screenshots, native focus/slider review, four-theme rendered comparison or measured mobile-overflow pass is claimed. The prior Aurora screenshots do not validate this redesign.

`npm run preview:career` generates 24 actual-source HTML references across Obsidian, Porcelain, Glacier and Volt, plus three Aurora 14 before references in sibling `CAREER_PREVIEWS/`. The six current states are empty rank, 55-mark rank, 45/55/65 scenario comparison, score-based admissions, unavailable AIR-based admissions and three-record institute comparison with exact source detail. A manifest records the input scope and hashes. These are supplemental inert HTML references, not screenshots. Chart resizing and interactive controls must be assessed in the actual application.

The portable baseline archive contains only the old career presentation module and feature CSS. Its archive, entry and unchanged career-domain checksums are verified by the generator; no Git history is needed to regenerate the references after source export.

To complete native review when browser control is available: open `#rank?marks=55&year=2025&category=GEN`, exercise the slider and 45/55/65 scenarios, then inspect at 1440, 1024, 768, 390 and 360px. Check long AIR values, invalid 2026 inputs, overlays, keyboard markers, focus, expanded-chart actions and SVG/PNG export. Repeat the major result states in all four themes. Open Admissions from the rank result, select three actual records, change units/category/year, inspect missing cutoffs and drill into exact institute source evidence. Capture before/after references without substituting the static HTML files for native screenshots. Test reduced motion and verify that no body-level horizontal overflow occurs.

## Publication and continuation

The exact pushed checkpoint, saved version, deployment status and production URL are recorded after the native Sites operation in sibling `CAREER_INTELLIGENCE_RELEASE.json`. A local build or source ZIP alone does not prove publication. The existing public audience and static deployment boundary are retained.

Source and static export ZIPs contain the implementation; the reference ZIP contains supplemental HTML, not screenshots. Production account/community services remain unconfigured. Continue native visual review as recorded above; do not begin the final comprehensive integrity audit or unrelated backend activation without the user's next instruction.
