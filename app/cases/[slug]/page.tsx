import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Dashboard from "../../../src/grid/dashboard";
import CaseDashboard from "../../../src/research/dashboard";
import { cases } from "../../../src/research/cases";

export function generateStaticParams() {
  return cases.map(item => ({ slug: item.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = cases.find(item => item.slug === slug);
  if (!item) return {};
  return { title: item.name + " — PrismLab", description: item.question };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = cases.find(item => item.slug === slug);
  if (!item) notFound();
  return item.slug === "grid-atlas" ? <Dashboard /> : <CaseDashboard key={item.slug} item={item} />;
}
