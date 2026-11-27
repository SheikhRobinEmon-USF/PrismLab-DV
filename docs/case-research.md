# PrismLab research collection

Each case asks a separate question, uses a reproducible public snapshot and includes its own visual analysis, takeaway and source limitations. The four new snapshots were retrieved November 26, 2026 (America/New_York).

| Case | Question | Source and coverage | Evidence |
| --- | --- | --- | --- |
| [Grid Atlas](grid-research.md) | Where is clean electricity replacing fossil generation? | Ember, 2000–2025 | Clean supplied 42.5% of global generation in 2025. Solar accounted for the largest source gain. |
| A hotter planet | Does the warming signal persist across decades? | NASA GISTEMP v4, 1880–2025 | The trailing 10-year mean rose from −0.21°C in 1880–1889 to +1.01°C in 2016–2025. |
| The digital divide | How much of the world is online, and where are gaps? | World Bank World Development Indicators / ITU, 2000–2024 | Worldwide use reached 71.2% in 2024. India gained about 35.4 percentage points compared with 2019 and remained below that world level. |
| New York rides again | Did MTA modes recover equally? | MTA daily comparable-day series, March 2020–December 2024 | The December 2024 subway average was 77% of the pre-pandemic comparison. Long Island Rail Road was near 94% and MTA road crossings reached 105%. |
| The seismic atlas | How are large earthquakes distributed? | USGS Earthquake Catalog, 2000–2025 inclusive | The catalog recorded 3,874 earthquakes of magnitude 6.0 or above. Of those, 387 reached magnitude 7.0 or above and 3,063 were shallower than 70 km. |

## Reproduce the four new data snapshots

Download the five files below into one directory. Run `python scripts/prepare-cases.py <directory>`. Each output embeds the SHA-256 digests of its input files under `provenance`. Revise the research numbers and rerun the browser checks if the source agencies revise past observations.

| File | Public download | Attribution or terms |
| --- | --- | --- |
| `temperature.csv` | [NASA global Land–Ocean Temperature Index](https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv) | [NASA GISS GISTEMP v4](https://data.giss.nasa.gov/gistemp/). Cite the project and respect its guidance. |
| `internet.json` | [World Bank indicator API](https://api.worldbank.org/v2/country/all/indicator/IT.NET.USER.ZS?format=json&date=2000:2024&per_page=12000) | [World Bank data terms](https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets), with ITU attribution. The indicator snapshot identifies November 11, 2026 as the last update. |
| `countries.json` | [World Bank economy metadata API](https://api.worldbank.org/v2/country?format=json&per_page=400) | World Bank region and country descriptors. |
| `mta.json` | [New York State open data API](https://data.ny.gov/resource/vxuj-8kew.json?$limit=5000&$order=date) | [Metropolitan Transportation Authority dataset](https://data.ny.gov/d/vxuj-8kew). The agency replaced this series in January 2025 with one without the baseline ratios. |
| `quakes.csv` | [USGS ComCat query](https://earthquake.usgs.gov/fdsnws/event/1/query?format=csv&starttime=2000-01-01&endtime=2026-01-01&minmagnitude=6&orderby=time-asc) | [USGS public domain](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits). [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) public-domain geometry comes from the Grid Atlas basemap. |

## Analysis choices

- **Climate** uses NASA’s annual anomaly column directly and averages the ten annual values for the trailing mean. Monthly heatmap cells use separate month-specific baseline anomalies. December 2025 closes the final full year. Incomplete years are excluded.
- **Connectivity** uses published population shares and preserves the World aggregate. Discrete observations are kept without filling gaps. The five-year ranking requires both the selected and endpoint observations for each economy.
- **Mobility** averages MTA daily estimates over full calendar months. Recovery averages the published comparable-day ratios. Bridge and tunnel counts are vehicles. Early bus counts used modeled estimates, as described in the MTA methodology. The analysis compares series but cannot infer mode switching.
- **Seismic** preserves the preferred USGS magnitude and depth and filters to records identified as earthquakes. Points mark epicenters. Annual counts and magnitude bands are descriptive. The map does not account for how depth, soils, infrastructure or exposure affect risk at a specific site.

The cover images are generated illustrations. Chart marks and labels come from the attributed data.
