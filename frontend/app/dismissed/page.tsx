"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface DismissedItem {
  channel_id: string;
  thread_ts: string;
  dismissed_by?: string;
  dismissed_at: number;
  age_hours: number;
}

function formatAge(h: number) {
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default function DismissedPage() {
  const [items, setItems] = useState<DismissedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.dismissed();
      setItems(res.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (channelId: string, threadTs: string) => {
    const key = `${channelId}:${threadTs}`;
    setRevoking(key);
    try {
      await api.revokeDismissed(channelId, threadTs);
      await load();
    } catch (e) {
      alert("Error revoking: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 rounded-xl h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">✅ Dismissed</h2>
        <span className="text-sm text-slate-400">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
          No hay items dismissed activos
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const key = `${item.channel_id}:${item.thread_ts}`;
            return (
              <div key={key} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-slate-300">#{item.channel_id}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.dismissed_by && <span>por {item.dismissed_by} · </span>}
                    hace {formatAge(item.age_hours)}
                  </div>
                </div>
                <button
                  onClick={() => revoke(item.channel_id, item.thread_ts)}
                  disabled={revoking === key}
                  className="shrink-0 text-xs bg-slate-700 hover:bg-red-900 hover:text-red-300 text-slate-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {revoking === key ? "…" : "Revocar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
