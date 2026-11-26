# The global power transition

Grid Atlas asks where clean power is growing quickly enough to reduce fossil electricity. The dashboard pairs two measures that answer different questions. Generation share shows the changing composition of the grid. Generation in TWh shows whether the absolute amount of fossil-powered electricity fell while total generation changed.

## What the snapshot shows

- Global clean electricity rose from **35.3%** of generation in 2000 to **42.5%** in 2025. Fossil fell as a share over that period, while annual fossil generation increased from **9,917 TWh** to **18,396 TWh**. The percentage and TWh views tell both parts of that story.
- Between 2024 and 2025, global solar generation rose by **669 TWh**, the largest gain among the nine source categories. Clean generation rose by **913 TWh**, fossil generation fell by **50 TWh**, and total generation rose by **864 TWh**. Calculations use unrounded source values and round only for display.
- In 2025, **Brazil** generated **88.9%** of its electricity from clean sources, compared with **41.1%** in **China**. China’s clean share rose **8.7 percentage points** since 2020, versus **3.5 points** in Brazil. The ranking can switch between the current share and its change.

These are descriptive comparisons of electricity generation. They do not establish which policies caused changes and do not measure a country’s whole energy system or electricity consumption. Ember’s [Global Electricity Review 2026](https://ember-energy.org/latest-insights/global-electricity-review-2026/) provides wider analysis. Grid Atlas uses the November 2026 dataset revision, so figures can differ from the earlier report.

## Data provenance

| Asset | Source | Terms |
| --- | --- | --- |
| World and economy electricity generation | [Ember Yearly Electricity Data](https://ember-energy.org/data/yearly-electricity-data/), updated November 17, 2026 · [CSV](https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv) · [Methodology](https://files.ember-energy.org/public-downloads/ember_electricity_data_methodology.pdf) | CC BY 4.0 |
| Country boundaries | [Natural Earth 1:110m Admin 0 Countries, v5.1.2](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_admin_0_countries.geojson) | [Public domain](https://www.naturalearthdata.com/about/terms-of-use/) |
| Hero artwork | Generated editorial illustration of transmission and wind infrastructure | Illustration |

On November 26, 2026 the Ember CSV had SHA-256 `43db1b75e3ae16eff5fc62a4bfa1f10876efa24af953e0069a939441ea95c616`. To reproduce the two checked-in data assets, download the CSV and run `python scripts/prepare-grid.py path/to/ember.csv` with Python 3.11 or later. The upstream download is revised periodically. The script retains the World aggregate and economies with observations between 2000 and 2025, uses Ember’s clean and fossil aggregates and nine individual sources, and checks that the two aggregates reconcile with total generation to within 0.002 TWh.

Clean includes renewables and nuclear. Shares divide generation by total generation in the same geography and year. Five-year comparisons require both endpoints, and year-over-year comparisons require consecutive years. Missing observations remain gaps. In this snapshot 95 economies report for 2025. The World series comes from Ember’s global aggregate, which includes estimates for places with limited direct coverage. The map uses ISO 3166-1 alpha-3 joins. A few economies have no matching polygon at this map scale and remain available in the selector. Natural Earth boundary geometry was reduced to country codes, English names and coordinates rounded to three decimal places. Antarctica is omitted.

## Visual encodings

The clean/fossil trend retains a full 0–100% scale in share mode. The donut shows the generation mix, with exact percentages in its selectable legend. Country ranking bars share a scale within the current ranking. The change chart uses a common zero and equal scales for increases and decreases. The map uses a fixed 0–100% scale, allowing direct comparison across selections. Motion marks changes to the selected year, indicator values and chart states, and automatic visual transitions respect reduced-motion preferences.
