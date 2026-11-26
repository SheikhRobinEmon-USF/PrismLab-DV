export const sections = {
  datasets: "Datasets", build: "Chart composer", explore: "Linked analysis",
  story: "Storyboard", export: "Export & provenance",
} as const;
export type Section = keyof typeof sections;
