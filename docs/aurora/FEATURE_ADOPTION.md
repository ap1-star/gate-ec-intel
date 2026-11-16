# Aurora 3.0 — feature adoption

Scope: the existing Part 2 PYQ, career, personal, community and owner presentation layers. The research corpus, career reference values/calculations, server, schemas, session/ownership boundaries and HTTP contracts were not changed by this subtask.

## Shared presentation

All feature styles consume the centralized Aurora semantic tokens and their existing aliases. There are no per-theme component copies. Forms and tables use 13px text; content uses 14–15px; supporting evidence uses 12px; numerical results have deliberate tabular mono typography. Surface, border, focus, lighting and shadow treatments follow the active theme. The former hard-coded blue primary-button borders and light-theme chart condition are removed.

`shell.css` now contains only feature/account adaptation. Navigation geometry and typography stay owned by the shared shell. Inputs retain native labels, form validation and keyboard operation. Wide evidence tables scroll within their own containers.

## Layout changes

- Rank Intelligence: distinct input and illuminated estimate panels, a larger marks input and result, a chart/history research area, and separated methodology columns. The source limits, sensitivity wording and unqualified empty state stay intact. A below-reference check uses a warning icon color and explicit wording; positive/negative meaning never depends only on color.
- Admissions/institutes: structured filter grid, readable seven-column evidence table and a supporting benchmark/interpretation composition. Missing source values stay missing. Source details use a readable overlay hierarchy and definition list.
- PSU: the same filter/table/evidence system with clearly separated directory content. No current vacancy or selection inference is introduced.
- PYQ: a clear canonical-library header and cohort count, visible summary strip, grouped exact metadata filters, readable row hierarchy, substantial question cards and accessible pagination/collection controls. All original selectors and row/column behavior are retained.
- Personal: a route-specific wrapper allows planner, mock and reminder workflows to use task-oriented desktop splits rather than identical full-width panels. Dashboard previews retain genuine counts; profile has a comfortable reading width; notifications use a clear ledger treatment.
- Community: content-centered discussion typography, readable author/context lines, restrained tags and reply indentation, and clear vote/reply actions. No sample discussion data or fabricated saved performance was added.
- Admin: aggregate tables, units and suppression semantics remain unchanged; shared appearance styles apply to cards, filters and status states.

## Charts and interactions

Single-series career and personal charts use the semantic accent with stable `data-ui-semantic` / `data-ui-theme-attr` markers. The chart appearance layer can recolor them without changing points, scales or calculations. The old feature-specific `.light-theme` branch is gone. CSS variables also provide an immediate safe color before a later chart decorator runs.

Hover effects use short transitions and a restrained lift on question cards. Reduced-motion disables those transitions and transforms. Form focus remains visible through a 2px semantic focus ring. Public account-unavailable, loading, authentication, error and protected states retain their original content and behavior.

## Responsive source coverage

Breakpoints cover large split workspaces, tablet column reduction, compact stacked forms and 360px mobile layouts. Supporting metadata wraps; controls use 40–46px practical targets, with native keyboard operation. These are implemented source rules, not a rendered QA claim. The main Aurora QA report must record actual browser screenshots and any subsequent refinements.

## Executed checks

`node --check` passed for `career.mjs`, `personal.mjs` and `pyq.mjs` after the markup changes.

`node --test tests/career-domain.test.mjs tests/personal-ui.test.mjs tests/pyq.test.mjs tests/pyq-identity.test.mjs tests/feature-service-flow.test.mjs` passed **41/41 tests**. These preserve domain results, source seed identity, supported rank cases, account boundaries, genuine SQLite form/controller flows, pagination and safe generated text. They are not screenshot/layout tests. No mathematical, API or data-related test expectation was weakened.
