import { notFound } from "next/navigation";
import Studio from "../../../src/studio";
export function generateStaticParams() { return ["retail", "earthquakes"].map(slug => ({ slug })); }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "retail" && slug !== "earthquakes") notFound();
  return <Studio section="example" example={slug} />;
}
