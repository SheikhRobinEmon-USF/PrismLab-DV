# PrismLab

PrismLab is a collection of five interactive studies built around questions the public data can answer. Each case combines an explorable dashboard, findings, a conclusion, source notes and CSV export.

[Explore the five cases](https://sheikhrobinemon-usf.github.io/PrismLab-DV/)
![The PrismLab collection featuring Grid Atlas and four more studies](docs/screenshots/research-collection.webp)

| Case | Scope | Public source |
| --- | --- | --- |
| [Grid Atlas](https://sheikhrobinemon-usf.github.io/PrismLab-DV/cases/grid-atlas/) | The global electricity transition | Ember |
| [A hotter planet](https://sheikhrobinemon-usf.github.io/PrismLab-DV/cases/warming/) | Global surface temperature anomalies | NASA GISTEMP |
| [The digital divide](https://sheikhrobinemon-usf.github.io/PrismLab-DV/cases/digital-divide/) | Internet adoption by economy | World Bank / ITU |
| [New York rides again](https://sheikhrobinemon-usf.github.io/PrismLab-DV/cases/transit-recovery/) | Recovery across transit modes | MTA Open Data |
| [The seismic atlas](https://sheikhrobinemon-usf.github.io/PrismLab-DV/cases/seismic-atlas/) | Where large earthquakes are recorded | USGS Earthquake Catalog |

[Research notes and reproducibility](docs/case-research.md) · [Project status](PROJECT_STATUS.md)

## Run locally

Requires Node.js 22+ and curl. The site uses Next.js App Router, React, TypeScript, ECharts and locally served assets.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. [The dataset studio](docs/studio.md) is available at `/studio/`.

```sh
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_BASE_PATH=/PrismLab-DV npm run build
npx playwright install chromium
NEXT_PUBLIC_BASE_PATH=/PrismLab-DV npm run e2e
```

## Deploy

The production export is served under `/PrismLab-DV/`. The repository’s branch-based GitHub Pages configuration serves the checked-in static snapshot at the root. Source lives in `app/`, `src/` and `public/`. Build with the Pages base path and use the contents of `out/` to refresh that snapshot. GitHub Actions deployment is available by setting **Settings → Pages → Source** to **GitHub Actions**.
