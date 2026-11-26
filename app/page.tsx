import type { Metadata } from "next";
import Dashboard from "../src/grid/dashboard";

export const metadata: Metadata = {
  title: "Grid Atlas — The global power transition",
  description: "An interactive dashboard of electricity generation, the rise of clean power, and changes in the global energy mix.",
};

export default function Page() { return <Dashboard />; }
