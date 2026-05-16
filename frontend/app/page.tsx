"use client";
import { useEffect, useState, useCallback } from "react";
import { api, BUCKET_LABELS } from "@/lib/api";

interface StatusData {
  last_run_at: number | null;
  last_run_ago_hours: number | null;
  report_item_count: number;
  dismissed_count: number;
  channel_count: number;
  cache_date: string | null;
}

interface ReportItem {
  channel_id: string;
  thread_ts: string;
  message_ts: string;
  age_hours: number | null;
  bucket: string;
  is_dismissed: boolean;
  slack_url: string | null;
}

function formatAge(h: number | null) {
  if (h === null) return "?";
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [report, setReport] = useState<ReportItem[]>([]);
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([api.status(), api.report()]);
      setStatus(s);
      setReport(r.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading data");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRun = async () => {
    setRunning(true);
    setRunOutput(null);
    try {
      const res = await api.run();
      setRunOutput(res.stdout || res.stderr || "Done");
      await load();
    } catch (e: unknown) {
      setRunOutput(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
    }
  };

  // Group by bucket
  const bucketOrder = ["critical", "urgent", "warning", "recent", "very_recent"];
  const grouped = bucketOrder.reduce((acc, b) => {
    acc[b] = report.filter((i) => i.bucket === b && !i.is_dismissed);
    return acc;
  }, {} as Record<string, ReportItem[]>);

  const activeCount = report.filter((i) => !i.is_dismissed).length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${activeCount > 0 ? "text-red-400" : "text-green-400"}`}>
            {activeCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">activos</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-300">{status?.dismissed_count ?? "—"}</div>
          <div className="text-xs text-slate-400 mt-1">dismissed</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-300">{status?.channel_count ?? "—"}</div>
          <div className="text-xs text-slate-400 mt-1">canales</div>
        </div>
      </div>

      {/* Last run + Run button */}
      <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
        <div className="text-sm text-slate-400">
          {status?.last_run_ago_hours != null
            ? `Último run: hace ${formatAge(status.last_run_ago_hours)}`
            : "Sin datos de último run"}
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition-colors"
        >
          {running ? "Corriendo…" : "▶ Run Now"}
        </button>
      </div>

      {/* Run output */}
      {runOutput && (
        <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-green-400 whitespace-pre-wrap max-h-48 overflow-auto">
          {runOutput}
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-3 text-red-400 text-sm">{error}</div>
      )}

      {/* Report items by bucket */}
      {activeCount === 0 && !error ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
          ✅ Todo respondido — sin mensajes pendientes
        </div>
      ) : (
        bucketOrder.map((bucket) => {
          const items = grouped[bucket];
          if (!items?.length) return null;
          const meta = BUCKET_LABELS[bucket];
          return (
            <div key={bucket}>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${meta.color.split(" ")[0]}`}>
                {meta.emoji} {meta.label}
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={`${item.channel_id}-${item.thread_ts}`}
                    className={`rounded-xl border p-3 ${meta.color}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm">#{item.channel_id}</span>
                      <span className="text-xs opacity-70">{formatAge(item.age_hours)}</span>
                    </div>
                    {item.slack_url && (
                      <a
                        href={item.slack_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline mt-1 block"
                      >
                        Ver en Slack →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
