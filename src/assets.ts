export const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (name: string) => base + "/" + name;
export const demos = {
  retail: {
    name: "Retail performance", file: "retail.csv", source: "PrismLab synthetic retail fixture",
    license: "CC0-1.0", description: "Monthly fictional retail performance across four regions.",
  },
  earthquakes: {
    name: "Global earthquakes", file: "earthquakes.parquet",
    source: "https://earthquake.usgs.gov/fdsnws/event/1/query?format=csv&starttime=2024-01-01&endtime=2024-02-01&minmagnitude=5&orderby=time-asc",
    license: "U.S. government data (public domain)",
    description: "USGS events of magnitude 5 and greater during January 2024.",
  },
} as const;
export type Demo = keyof typeof demos;
