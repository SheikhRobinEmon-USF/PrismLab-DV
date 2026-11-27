export const cases = [
  {
    slug: "grid-atlas", name: "Grid Atlas", theme: "energy", category: "Energy", period: "2000–2025",
    question: "Where is clean electricity replacing fossil power?",
    summary: "Track the generation mix and the pace of change across 209 economies.",
    result: "42.5%", resultLabel: "of world electricity came from clean sources in 2025",
    image: "grid/hero.webp", source: "Ember", sourceUrl: "https://ember-energy.org/data/yearly-electricity-data/",
  },
  {
    slug: "warming", name: "A hotter planet", theme: "climate", category: "Climate", period: "1880–2025",
    question: "Is global warming visible beyond the hottest individual years?",
    summary: "Follow 146 years of temperature anomalies, then compare individual months.",
    result: "+1.19°C", resultLabel: "global temperature anomaly in 2025",
    image: "research/warming.webp", source: "NASA GISTEMP", sourceUrl: "https://data.giss.nasa.gov/gistemp/",
  },
  {
    slug: "digital-divide", name: "The digital divide", theme: "access", category: "Connectivity", period: "2000–2024",
    question: "How much of the world is online, and where are the gaps?",
    summary: "Compare internet use across economies and distinguish adoption from the pace of adoption.",
    result: "71.2%", resultLabel: "of the world’s population used the internet in 2024",
    image: "research/digital-divide.webp", source: "World Bank / ITU", sourceUrl: "https://data.worldbank.org/indicator/IT.NET.USER.ZS",
  },
  {
    slug: "transit-recovery", name: "New York rides again", theme: "transit", category: "Mobility", period: "Mar 2020–Dec 2024",
    question: "Did New York’s subway, buses and commuter rail recover at the same pace?",
    summary: "Compare estimated daily use and recovery against comparable pre-pandemic days.",
    result: "77%", resultLabel: "of pre-pandemic subway use in December 2024",
    image: "research/transit-recovery.webp", source: "MTA Open Data", sourceUrl: "https://data.ny.gov/d/vxuj-8kew",
  },
  {
    slug: "seismic-atlas", name: "The seismic atlas", theme: "seismic", category: "Earth science", period: "2000–2025",
    question: "Where are large earthquakes recorded, and how common are the largest events?",
    summary: "Filter the global catalog by year and magnitude, then inspect event depth and location.",
    result: "3,874", resultLabel: "earthquakes of magnitude 6.0 or greater",
    image: "research/seismic-atlas.webp", source: "USGS Earthquake Catalog", sourceUrl: "https://earthquake.usgs.gov/earthquakes/search/",
  },
] as const;

export type ResearchCase = (typeof cases)[number];
export type CaseSlug = ResearchCase["slug"];
export type NewCase = Exclude<ResearchCase, { slug: "grid-atlas" }>;
export const caseHref = (slug: CaseSlug) => `/cases/${slug}/`;
