import { notFound } from "next/navigation";
import Studio from "../../../src/studio";
import { sections, type Section } from "../../../src/navigation";
export function generateStaticParams() {
  return ["datasets", "build", "explore", "story", "export"].map(section => ({ section }));
}
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  return <Studio section={section as Section} />;
}
