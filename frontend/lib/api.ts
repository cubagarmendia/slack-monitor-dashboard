// Use internal Next.js proxy to avoid mixed-content issues (HTTPS frontend → HTTP backend)
const BASE = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://178.156.222.29:8765");
const API_PREFIX = typeof window !== "undefined" ? "/api/proxy" : "/api";

export async function apiFetch(path: string, init?: RequestInit) {
  // path is like "/api/status" — rewrite to "/api/proxy/status" on client
  const url = typeof window !== "undefined"
    ? path.replace(/^\/api\//, "/api/proxy/")
    : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  status: () => apiFetch("/api/status"),
  report: () => apiFetch("/api/report"),
  dismissed: () => apiFetch("/api/dismissed"),
  revokeDismissed: (channelId: string, threadTs: string) =>
    apiFetch(`/api/dismissed/${encodeURIComponent(channelId)}/${encodeURIComponent(threadTs)}`, { method: "DELETE" }),
  config: () => apiFetch("/api/config"),
  updateConfig: (data: Record<string, unknown>) =>
    apiFetch("/api/config", { method: "PATCH", body: JSON.stringify(data) }),
  run: () => apiFetch("/api/run", { method: "POST" }),
  channels: () => apiFetch("/api/channels"),
};

export const BUCKET_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  critical:    { label: "Más de 24 horas", color: "text-red-400 border-red-800 bg-red-950/30",    emoji: "🚨" },
  urgent:      { label: "Entre 6 y 24 horas", color: "text-orange-400 border-orange-800 bg-orange-950/30", emoji: "🔴" },
  warning:     { label: "Entre 2 y 6 horas", color: "text-yellow-400 border-yellow-800 bg-yellow-950/30", emoji: "🟡" },
  recent:      { label: "Entre 1 y 2 horas", color: "text-slate-300 border-slate-700 bg-slate-800/50",   emoji: "⚪" },
  very_recent: { label: "Menos de 1 hora",  color: "text-slate-400 border-slate-700 bg-slate-800/30",   emoji: "🕐" },
};
