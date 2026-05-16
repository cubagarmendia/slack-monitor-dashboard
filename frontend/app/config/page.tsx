"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface ConfigData {
  min_age_hours: number;
  max_age_hours: number;
  non_actionable_max_chars: number;
  non_actionable_patterns: string[];
  exclude_channels: string[];
  include_channels: string[];
  channel_ids?: Record<string, string>;
}

interface Channel {
  name: string;
  pm_email: string | null;
  tl_email: string | null;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local editable state
  const [minAge, setMinAge] = useState(1);
  const [maxAge, setMaxAge] = useState(72);
  const [patterns, setPatterns] = useState("");
  const [excludes, setExcludes] = useState("");
  const [includes, setIncludes] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, ch] = await Promise.all([api.config(), api.channels()]);
      setConfig(c);
      setChannels(ch.channels || []);
      setMinAge(c.min_age_hours ?? 1);
      setMaxAge(c.max_age_hours ?? 72);
      setPatterns((c.non_actionable_patterns || []).join("\n"));
      setExcludes((c.exclude_channels || []).join("\n"));
      setIncludes((c.include_channels || []).join("\n"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateConfig({
        min_age_hours: minAge,
        max_age_hours: maxAge,
        non_actionable_patterns: patterns.split("\n").map((s) => s.trim()).filter(Boolean),
        exclude_channels: excludes.split("\n").map((s) => s.trim()).filter(Boolean),
        include_channels: includes.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="bg-slate-800 rounded-xl h-20 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">⚙️ Configuración</h2>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-3 text-red-400 text-sm">{error}</div>
      )}

      {saved && (
        <div className="bg-green-950 border border-green-800 rounded-xl p-3 text-green-400 text-sm">
          ✅ Guardado correctamente
        </div>
      )}

      {/* Age window */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-slate-300">Ventana de tiempo</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Min horas (ignorar muy recientes)</span>
            <input
              type="number"
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-600"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Max horas (ignorar muy viejos)</span>
            <input
              type="number"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-600"
            />
          </label>
        </div>
      </div>

      {/* Non-actionable patterns */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-medium text-slate-300">Patrones no-accionables</h3>
        <p className="text-xs text-slate-500">Mensajes que coincidan son ignorados (uno por línea)</p>
        <textarea
          value={patterns}
          onChange={(e) => setPatterns(e.target.value)}
          rows={8}
          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 ring-blue-600 resize-y"
        />
      </div>

      {/* Exclude channels */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-medium text-slate-300">Canales excluidos</h3>
        <textarea
          value={excludes}
          onChange={(e) => setExcludes(e.target.value)}
          rows={4}
          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 ring-blue-600 resize-y"
        />
      </div>

      {/* Include channels */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-medium text-slate-300">Canales incluidos manualmente</h3>
        <textarea
          value={includes}
          onChange={(e) => setIncludes(e.target.value)}
          rows={3}
          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 ring-blue-600 resize-y"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
      >
        {saving ? "Guardando…" : "💾 Guardar cambios"}
      </button>

      {/* Monitored channels (read-only) */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-medium text-slate-300">Canales monitoreados ({channels.length})</h3>
        <div className="space-y-1 max-h-64 overflow-auto">
          {channels.map((ch) => (
            <div key={ch.name} className="flex items-center justify-between text-sm py-1 border-b border-slate-700 last:border-0">
              <span className="font-mono text-slate-300">#{ch.name.replace("-litebox", "")}</span>
              <span className="text-xs text-slate-500">{ch.pm_email?.split("@")[0] ?? "sin PM"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
