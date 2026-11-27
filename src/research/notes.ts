import type { NewCase } from "./cases";

type Note = { title: string; text: string };
type Narrative = { findings: Note[]; conclusion: string; method: string; caveat: string; reference: string };
export const notes: Record<NewCase["slug"], Narrative> = {
  warming: {
    findings: [
      { title: "The long view", text: "The ten-year average rose from −0.21°C in 1880–1889 to +1.01°C in 2016–2025, relative to the same 1951–1980 baseline." },
      { title: "Year-to-year variation", text: "The annual anomaly fell from +1.28°C in 2024 to +1.19°C in 2025. Both years sit far above the baseline." },
      { title: "Check the months", text: "All twelve months of 2025 were above +1°C relative to the corresponding month in the baseline period." },
    ],
    conclusion: "The sustained rise is visible across decades and across months. The cooler result in 2025 compared with the record year of 2024 sits within that long-term warming trend.",
    method: "NASA GISS Land–Ocean Temperature Index (GISTEMP v4). Annual anomalies use NASA’s published January–December column. Each trailing mean uses the current year and the nine preceding complete years.",
    caveat: "This is the global surface temperature anomaly, not a local forecast or a reading of absolute temperature. NASA describes uncertainties in the historical reconstruction. The snapshot ends in 2025 to exclude incomplete years.",
    reference: "https://data.giss.nasa.gov/gistemp/faq/",
  },
  "digital-divide": {
    findings: [
      { title: "The world moved online", text: "Reported global internet use rose from 53.9% of the population in 2019 to 71.2% in 2024, a 17.3 percentage-point increase." },
      { title: "Levels differ", text: "Norway was at 99.0% in 2024, while Kenya was at about 35.0%. Those rates describe use across each country’s population." },
      { title: "Gains tell another story", text: "India’s share increased about 35.4 percentage points between 2019 and 2024. Its 2024 share of about 64.9% was still below the global aggregate." },
    ],
    conclusion: "Internet adoption expanded globally, with substantial variation across economies. Read the current share and the five-year change together to see both the remaining gap and how fast it is closing.",
    method: "World Development Indicators IT.NET.USER.ZS, sourced from the International Telecommunication Union. The World comparator is the published aggregate. Regional filters use World Bank region metadata and rank only economies with the observations needed for the measure.",
    caveat: "Missing reports remain gaps. There were 182 reporting economies in 2024 in this snapshot. The indicator measures reported use, without measuring affordability, bandwidth, service quality, or differences inside an economy.",
    reference: "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/IT.NET.USER.ZS",
  },
  "transit-recovery": {
    findings: [
      { title: "The initial collapse", text: "The subway averaged 8% of comparable pre-pandemic use in April 2020. By December 2024 it had recovered to about 77%." },
      { title: "Rail recovered unevenly", text: "In December 2024, Long Island Rail Road averaged 94% of its comparison level and Metro-North averaged 85%. Buses averaged 66%." },
      { title: "Road traffic rebounded further", text: "MTA bridge and tunnel crossings averaged 105% of their comparison level in December 2024. Those observations count vehicles, while the transit series estimate riders." },
    ],
    conclusion: "Recovery varied by mode. By December 2024, MTA road crossings were above their comparison level while the subway and bus series remained below theirs. The dataset cannot establish whether people switched between modes.",
    method: "MTA Daily Ridership Data, March 2020 through December 2024. Recovery is the mean of the daily comparable-day ratios within each calendar month. Weekday and weekend figures are separately computed means of daily estimates.",
    caveat: "MTA reports next-day estimates that may differ from official totals. Bus figures from March 23 through September 30, 2020 were model estimates and should be read with extra caution. The last partial month, January 2025, is excluded.",
    reference: "https://data.ny.gov/api/views/vxuj-8kew/files/fc2ea67b-9c84-4be2-b6ff-6de689d84e9d?download=true",
  },
  "seismic-atlas": {
    findings: [
      { title: "A concentrated geography", text: "The epicenter map shows repeated clusters around the Pacific margin. Many events in the catalog are offshore." },
      { title: "A steep drop at higher magnitudes", text: "Of the 3,874 catalog earthquakes of magnitude 6.0 or above, 387 were magnitude 7.0 or above, about one in ten." },
      { title: "Depth varies", text: "The catalog recorded 3,063 shallow events below 70 km in this selection, about 79% of all events. The two largest catalog events in the window both had magnitude 9.1." },
    ],
    conclusion: "Large recorded earthquakes cluster geographically, and magnitude 7.0 or above events are a small fraction of the magnitude 6.0 or above catalog. This distribution provides historical context for exposure. Local hazard also depends on distance, depth, soil, buildings, and tsunami exposure.",
    method: "USGS FDSN Event API, UTC dates from January 1, 2000 to January 1, 2026 exclusive, event type earthquake, and preferred magnitude 6.0 or greater. Depth uses the preferred catalog estimate. Natural Earth provides the map geometry.",
    caveat: "Catalog records are revised and depend on reporting. A point shows an epicenter rather than the geographic extent of shaking. Annual counts and epicenter locations do not predict where or when earthquakes will occur.",
    reference: "https://earthquake.usgs.gov/fdsnws/event/1/",
  },
};
