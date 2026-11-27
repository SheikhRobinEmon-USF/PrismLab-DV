import type { Metadata } from "next";
import ResearchHub from "../src/research/hub";

export const metadata: Metadata = {
  title: "PrismLab — Interactive research",
  description: "Five interactive case studies about electricity, climate, connectivity, transit and earthquakes, built with open data.",
};

export default function Page() { return <ResearchHub />; }
