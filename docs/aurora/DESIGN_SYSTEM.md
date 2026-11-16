# Aurora design system

Aurora is a presentation sprint on the Part 2 application. It retains one route catalogue, component library, numerical engine and backend boundary. No framework, charting library or new dependency was introduced.

## Central palette

`src/ui/tokens.css` defines the four effective appearances and shared typography, geometry, motion and compatibility aliases. Palette blocks also target `data-preview-theme` so Settings miniatures use the same definitions. Components use semantic variables rather than four copies of their stylesheets.

| Appearance | Canvas | Sidebar | Surface / raised | Text | Accent | Lighting |
| --- | --- | --- | --- | --- | --- | --- |
| Obsidian | `#0b0c0e` | `#101216` | `#171a1f` / `#22262d` | `#f5f2eb` | `#e0be80` | Warm champagne, graphite elevation |
| Porcelain | `#f4f1eb` | `#ece8e0` | `#ffffff` / `#f8f6f1` | `#25282d` | `#826335` | Cream highlights and daylight shadows |
| Glacier | `#090d16` | `#101725` | `#151d2a` / `#202d40` | `#f2f6fd` | `#a6caff` | Cool blue, restrained copper companion |
| Volt | `#090b0b` | `#101413` | `#151918` / `#222a26` | `#f1f5ed` | `#c5f277` | Carbon, lime focus, sage companion |

The Porcelain interaction accent is darker than the starting brief to support readable accent text and buttons. Its muted text was refined to `#606771` after the actual token contrast check found the earlier value below 4.5:1 on the sidebar. Obsidian's control boundary was similarly adjusted to `#686d76` to exceed 3:1 against its control surface.

Important groups: `--color-*` surfaces/text/selection/control/focus; `--shadow-surface`, `--shadow-overlay`; `--glow-interactive`, `--glow-signature`; `--lighting-ambient`, `--lighting-panel`, `--lighting-brand`; ten `--chart-series-*` colors; heatmap, positive/negative, grid and chart-label tokens. Old names such as `--surface` and `--accent` are aliases, not a second theme system. Legacy light-theme rules have been removed from active source CSS.

## Type, layout and interaction

Inter remains the interface font and JetBrains Mono the numerical/identifier font. Existing Google Fonts loading is retained with preconnect hints and system fallbacks. Body text is 14–15px, controls/tables generally 13px, supporting metadata 12px, headings 28–34px by viewport and major numbers 30–39px. Miniature graphics intentionally use small illustrative labels and are hidden from accessibility; the actual theme button has a full accessible name.

The overview now has an evidence/context line, differentiated metrics, a research strip, one signature allocation chart and a supporting stability/interpretation rail, followed by a full-width heatmap and question table. Career tools distinguish input, estimate, historical comparison and evidence; personal tools use task-led layouts; community content has a comfortable reading measure. Shared navigation, forms, badges, tables, drawers and errors use the same hierarchy.

Lighting is static. Hover/focus and overlays use short 130–260ms transitions without animated ambient blur. Reduced-motion overrides animations and transitions. Selected state also uses labels, checks, active indicators or line patterns. Native buttons and top-level links preserve keyboard semantics. The Appearance shortcut uses a button group, not an incomplete ARIA menu, and Escape restores focus to its trigger.

Responsive source rules cover large desktops, split-to-stack tablet layouts, automatic compact navigation, a mobile drawer, stacked controls and internal table/chart scrolling. The overview's mobile chart retains readable intrinsic dimensions and horizontal scrolling rather than shrinking its labels. These are source features, not a completed rendered layout review.

## Chart contract

`TerminalVisualization` reads the effective CSS palette in the browser. Its fallback palette supports source tests and export preparation. Ten series retain stable canonical subject indices and distinct dash patterns. Heatmaps have sequential/diverging scales, contrast-aware text, and a missing-data pattern distinct from zero. Recoloring updates the existing SVG/legend nodes; geometry, labels, values and selection are preserved. Heat roles take precedence over categorical colors even when endpoint colors coincide. Text inside colored marks retains its semantic foreground. Exports resolve theme variables rather than depending on the parent page's CSS.

`CONTRAST.json` records actual source-token ratios. It is not a browser accessibility certification, user study or clinical color-vision test. Named legends and ten line patterns provide non-color decoding.

## Reference patterns

Navigation recedes while research content receives emphasis, informed by [Linear's interface hierarchy discussion](https://linear.app/now/behind-the-latest-design-refresh). Semantic surface/contrast roles draw on [Geist's color system](https://vercel.com/geist/colors). Explicit and system-following appearance choices draw on [Raycast's theme settings](https://manual.raycast.com/themes). These are pattern references; branding and exact product layouts were not copied.
