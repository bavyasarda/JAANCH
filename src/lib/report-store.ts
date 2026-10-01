import type { RunState } from "@/lib/agent/context";
import type { Role } from "@/lib/constants";

/**
 * Hand-off of the finished run to the /report page. sessionStorage is used only as a transport
 * for derived, regenerable data within the same tab (cleared when the tab closes). Nothing important
 * is persisted here.
 */
export interface ReportPayload {
  state: RunState;
  role: Role;
  language: string;
  imageDataUrl?: string;
  summary: string;
  createdAt: string;
}
const KEY = "jaanch:report";

export function saveReportPayload(p: ReportPayload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota exceeded: drop the image */
    sessionStorage.setItem(KEY, JSON.stringify({ ...p, imageDataUrl: undefined }));
  }
}
export function loadReportPayload(): ReportPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReportPayload) : null;
  } catch {
    return null;
  }
}
