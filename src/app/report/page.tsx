import type { Metadata } from "next";
import { ReportView } from "@/components/report-view";

export const metadata: Metadata = { title: "Compliance report — Jaanch" };

export default function ReportPage() {
  return <ReportView />;
}
