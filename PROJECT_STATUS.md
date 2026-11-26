# PrismLab project status

## Implementation

- M0 · Next.js static export, responsive theme, original chart-based gallery, CI and Pages workflows, fixtures and architecture notes.
- M1 · Worker-owned CSV and Parquet, staged and cancellable imports, strict parser errors, typed profiling and source preview.
- M2 · Validated query contracts, bound parameters, local calendar bucketing, missing-value policies, summary and record drilldown.
- M3 · Line, bar, scatter, histogram, heatmap and map; linked selection; adjustable time windows; baseline comparison; keyboard-accessible chart data.
- M4 · Storyboard editing, presentation, revision-aware evidence, IndexedDB save/restore, and portable project, chart, aggregate and story exports.
- M5 · SQL golden tests, Chromium workflows, keyboard and reduced-motion checks, axe on the gallery at four widths, and browser benchmarks. [Measurements](docs/performance.md)
- M6 · Static route export, walkthrough, screenshots, case study, deployment workflow. GitHub Pages requires the repository's Pages source to be set to GitHub Actions. The current credential's Pages configuration request returned HTTP 403.

## Verification

See [the verification commands](README.md#verification-and-deployment). The static deployment layout was exercised locally at the GitHub Pages base path. The published GitHub Pages URL is pending activation. Safari, Lighthouse, and multi-device performance targets are unverified.

The full first-run asset bundle includes two DuckDB-Wasm variants. A browser loads the variant it supports. Large and wide data may hit browser memory limits before the documented import caps.
