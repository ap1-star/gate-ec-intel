# Project Aurora 3.0 — UI handoff

**Native-reviewed implementation; prepared for Sites deployment.** Aurora is the requested frontend sprint between Part 2 and Part 3. The source contains four complete appearance configurations and the redesigned shared/module presentation. Browser control has been restored, all four appearances have received native review, and a screenshot-observed layout defect has been corrected. Exact review coverage, remaining limits and publication state are recorded in the QA report and release JSON; no deployment is inferred from this heading.

## Starting checkpoint and preservation

Started from Part 2 `39140840451e516513c1edfa4110522fa7667991`, saved/published version 12 of Site `appgprj_6af5a0ff7a00819196fd4bf62194e4dd`. The baseline 90 tests and both research regression suites were independently rerun successfully before source implementation. An initial local HTTP `EACCES` was resolved by granting turn-scoped network access and rerunning the suite.

The 520 research records, question identifiers, protected numerical engines, source exports, scenario formulas, career mathematics/reference seed, API DTOs, SQL migrations, authentication/ownership and community permissions remain unchanged. No production backend, account provider, scheduler or database was activated. The hosting manifest retains static `dist`. Part 3 has not started.

The exact Aurora checkpoint and saved version are recorded in sibling `AURORA_3_RELEASE.json` after source synchronization. Within the checkout use `git log -1` or `git rev-parse HEAD`. Roll back by building Part 2's checkpoint or redeploying its saved version 12; there is no production data migration to undo.

## Theme architecture

- `src/app/appearance.js` is a small standalone head script, copied to `dist/appearance.js`. It applies the effective `data-theme` before the first stylesheet/meaningful paint.
- Explicit values: `obsidian`, `porcelain`, `glacier`, `volt`. The independent preference `system` resolves to Porcelain for light OS preference and Obsidian for dark, with change listeners only affecting System.
- Preference key: `gate-aurora-appearance`. Plain or JSON-encoded legacy `gate-v5-theme` light/dark values migrate deterministically. Invalid new/old values resolve safely to Obsidian. Denied storage preserves the current session choice and reports unavailable persistence without resetting research.
- `TerminalAppearance` exposes current preference/effective theme, selection and subscriptions. It does not know routes, data or private services. The saved research-view schema is untouched.
- `src/ui/tokens.css` defines all semantic palettes, elevation, atmosphere, focus, selection, charts and compatibility aliases. Components share one stylesheet system. Active source CSS has no competing `.light-theme` rules.
- Main UI subscribers recolor existing chart/legend/heatmap nodes and update appearance controls without replacing content. Route, filters, series selection, unsaved fields, focus and open drawers survive. Export preparation resolves theme colors for standalone images.

See [design system and exact palettes](docs/aurora/DESIGN_SYSTEM.md), [token contrast evidence](docs/aurora/CONTRAST.json), and the typed appearance declaration.

## Updated presentation

The shared shell has a custom Aurora mark, refined grouped navigation, illuminated active state, icon-only collapsed layout, larger command/toolbar controls, a five-choice Appearance shortcut and a full Settings gallery. Miniatures display actual scope counts and actual allocation curves. System has a labeled pressed state and visual switch. Keyboard Escape restores shortcut focus.

Overview uses varied composition: evidence/context, differentiated numerical metrics, one large allocation chart beside a stability-only rail, a compact full-width Scope notes interpretation strip, then a full-width heatmap and question table. Native full-page review exposed excessive vacant space caused by stacking the long notes beneath stability in the same grid row. Moving the unchanged notes into three desktop columns, stacked on mobile, removes that forced row height. The chart has stable canonical subject colors, labeled legends and non-color line patterns. Difficulty mix uses actual Easy/Moderate/Tough counts and retains the structural-versus-empirical distinction.

All original research routes adopt the shared typography, surfaces, tables, filters, plots, dialogs and feedback. Career layouts distinguish input, result, comparison and provenance. PYQ combines a canonical library header, filters, summary, table/cards and collections. Personal routes use task/progress layouts; community emphasizes readable text and replies. Auth, owner-only and unavailable states retain truthful behavior. See [module adoption](docs/aurora/FEATURE_ADOPTION.md).

Typography is generally 14–15px body, 13px controls/tables, 12px metadata, 28–34px main headings and 30–39px major numbers. Inter/JetBrains Mono and fallbacks remain. Theme-specific static ambient lighting, surface shadows, interaction focus and signature chart lighting replace the flat surface treatment. Short motion respects reduced motion; no continuously animated bloom was added.

Responsive layouts cover desktop splits, tablet stacking/compact sidebar, mobile drawer and stacked forms. Wide tables and the overview plot scroll inside their own containers. Representative native mobile, tablet and desktop views have now been inspected; the QA report records the actual viewport/theme/page combinations rather than claiming every possible combination passed.

## Validation and limitations

The final executed commands and results are recorded in [validation evidence](docs/aurora/VALIDATION.md). Coverage includes the unchanged research suites, theme/migration/System/storage cases, chart mapping and contrast, actual main-host theme clicks, all 26 ordinary route renderers, denied owner state, real rank values, and preservation of research/form/focus/modal state. The Node render harness is not a browser.

CSS parses without esbuild warnings. Source-token normal text contrast exceeds 4.5:1 across the five checked surfaces in each theme; focused/control/chart boundaries are checked independently. This is not full WCAG certification or a clinical color-vision assessment. Semantic text/line patterns supplement color.

The earlier URL/minimized-window failures are retained as history, but browser review now works. Native inspection has covered Obsidian, Porcelain, Glacier and Volt, and actual PNGs are being retained in sibling `AURORA_VISUAL_QA/`. Command search navigation to Settings, gallery selection, refresh persistence and preserved research scope were verified in the working browser. No unrelated-window image is accepted as evidence. See [the visual QA report](docs/aurora/VISUAL_QA.md) for exact screenshot/viewport coverage, before/after evidence and remaining limitations.

System OS changes, denied storage, reduced motion, arbitrary unsaved form/modal state and image-export behavior are covered by the documented automated/source tests; exhaustive native checks of those paths are not claimed. Native screenshot review does not activate or verify hosted private services.

`npm run preview:themes` produces **32 actual-data static HTML references** plus a Part 2 before reference in sibling `AURORA_PREVIEWS/`. The gallery offers common viewport sizes. These supplementary artifacts are explicitly labeled HTML, not screenshots. Working interactive appearances are integrated in the application itself.

## Publication and continuation

The user's Aurora brief requires verified changes before deployment. Native browser inspection has now informed a concrete layout correction, and the release is prepared for final source verification and native Sites deployment. Exact saved version, deployment ID, status and URL belong to `AURORA_3_RELEASE.json`; do not invent them or infer a successful publish from a source commit. Source/static ZIPs and screenshots do not establish hosted cloud persistence.

For continuation, use the recorded QA coverage and release result to identify any remaining native interaction checks. Preserve the tested appearance/state boundaries, repeat regressions after source changes, and publish only the matching verified artifact. This remains Aurora work. Wait for the user's separate instructions before beginning Part 3 or provisioning backend infrastructure.
