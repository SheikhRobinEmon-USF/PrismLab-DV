# PrismLab project status

## Research collection

PrismLab now opens on a collection of five interactive cases. Grid Atlas moved to `/cases/grid-atlas/`. The new climate, connectivity, mobility and seismic dashboards each include their own visualizations, linked selections, CSV exports, findings, conclusions and source limitations. The dataset studio remains at `/studio/`.

The production export passed lint, type checking, 26 SQL and serialization tests and 24 Chromium browser tests. Browser coverage includes navigation across all five cases, year and month selection, chart filtering, CSV export, earthquake event selection, and 320-pixel keyboard and axe checks for the collection and all four new cases.

[Published collection](https://sheikhrobinemon-usf.github.io/PrismLab-DV/) · [Source data and reproducibility](docs/case-research.md)

## Grid Atlas

Grid Atlas is an interactive research dashboard based on Ember’s annual electricity generation data, with a linked trend chart, generation mix, map, rankings, annual change chart, timeline playback, data documentation and source CSV export. The dataset studio remains at `/studio/`.

The Grid Atlas production build and all 14 Chromium tests passed locally and in [GitHub CI](https://github.com/SheikhRobinEmon-USF/PrismLab-DV/actions/runs/45910828580). The dashboard tests cover playback, year picking directly on the trend, economy and region filtering, the map, CSV export, a keyboard-accessible methodology dialog, and axe checks at widths of 320, 768 and 1440 pixels.

[Research and provenance](docs/grid-research.md) · [Desktop preview](docs/screenshots/grid-atlas.webp) · [Mobile preview](docs/screenshots/grid-atlas-mobile.webp)

The production export is also committed at the root for the repository’s current branch-based GitHub Pages source. The workflow upload and deployment succeeded, but the public URL continued serving the legacy README build. The root snapshot lets the configured branch deployment serve the dashboard.

## Dataset studio

## Implementation

- M0 · Next.js static export, responsive theme, original chart-based gallery, CI and Pages workflows, fixtures and architecture notes.
- M1 · Worker-owned CSV and Parquet, staged and cancellable imports, strict parser errors, typed profiling and source preview.
- M2 · Validated query contracts, bound parameters, local calendar bucketing, missing-value policies, summary and record drilldown.
- M3 · Line, bar, scatter, histogram, heatmap and map; linked selection; adjustable time windows; baseline comparison; keyboard-accessible chart data.
- M4 · Storyboard editing, presentation, revision-aware evidence, IndexedDB save/restore, and portable project, chart, aggregate and story exports.
- M5 · SQL golden tests, Chromium workflows, keyboard and reduced-motion checks, axe on the gallery at four widths, and browser benchmarks. [Measurements](docs/performance.md)
- M6 · Static route export, walkthrough, screenshots, case study, deployment workflow. GitHub Pages requires the repository's Pages source to be set to GitHub Actions.

## Verification

The clean-checkout run passed `npm ci`, `npm run lint`, `npm run typecheck`, all 26 SQL and serialization tests, and `npm run build` with the GitHub Pages base path. The production dependency audit reported zero vulnerabilities. A tracked-file scan found no recognized GitHub tokens, AWS access-key identifiers, or private-key blocks.

All nine Chromium tests passed on the production export. They cover CSV and Parquet, malformed input, chart variants, keyboard time-window selection, linked records, storyboard revision changes, reload, JSON round trip, offline restore and all download formats. The responsive checks used widths of 320, 375, 768 and 1440 pixels. The gallery and the 320-pixel linked view passed the tested axe WCAG rules.

Safari, Lighthouse and multi-device performance remain unverified. Commands are in the [README](README.md#verification-and-deployment).

The full first-run asset bundle includes two DuckDB-Wasm variants. A browser loads the variant it supports. Large and wide data may hit browser memory limits before the documented import caps.
