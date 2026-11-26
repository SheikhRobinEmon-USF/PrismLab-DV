import type { Metadata } from "next";
import "./style.css";
import { WorkspaceProvider } from "../src/workspace";

export const metadata: Metadata = {
  title: "PrismLab — Data visualization studio",
  description: "Explore local datasets and build visual stories with traceable evidence.",
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><WorkspaceProvider>{children}</WorkspaceProvider></body></html>;
}
