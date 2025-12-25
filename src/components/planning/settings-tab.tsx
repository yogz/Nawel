"use client";

import { MessageSquare, Trash2, Sparkles, Check } from "lucide-react";
import { useThemeMode } from "@/components/theme-provider";
import type { ChangeLog } from "@/hooks/use-event-state";

interface SettingsTabProps {
  logsLoading: boolean;
  logs: ChangeLog[];
  onDeleteEvent: () => void;
  readOnly: boolean;
}

export function SettingsTab({ logsLoading, logs, onDeleteEvent, readOnly }: SettingsTabProps) {
  const { theme, setTheme, themes } = useThemeMode();

  return (
    <div className="space-y-8 duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div className="premium-card space-y-4 p-6">
        <h3 className="text-text/40 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Sparkles size={14} /> Ambiance
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                theme === t.id
                  ? "border-accent/30 bg-accent/10 ring-2 ring-accent/20"
                  : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.emoji}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-text">{t.label}</p>
                  <p className="text-[10px] font-medium text-gray-500">{t.description}</p>
                </div>
              </div>
              {theme === t.id && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="premium-card space-y-4 p-6">
        <h3 className="text-text/40 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <MessageSquare size={14} /> Historique des changements
        </h3>
        {logsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="no-scrollbar max-h-[400px] space-y-3 overflow-y-auto pr-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-[11px] transition-colors hover:border-accent/10"
              >
                <div className="mb-1 flex items-start justify-between">
                  <span className="font-black uppercase italic tracking-tighter text-accent/60">
                    {log.action} {log.tableName}
                  </span>
                  <span className="text-[9px] font-medium text-gray-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-text/70 truncate leading-relaxed">
                  {log.tableName === "items" && (log.newData?.name || log.oldData?.name)}
                  {log.tableName === "people" && (log.newData?.name || log.oldData?.name)}
                  {log.tableName === "services" && (log.newData?.title || log.oldData?.title)}
                  {log.tableName === "meals" && (log.newData?.title || log.oldData?.title)}
                </p>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">Aucun changement récent</p>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="premium-card border-red-100 bg-red-50/10 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-red-900/40">
            <Trash2 size={14} /> Zone de danger
          </h3>
          <button
            onClick={onDeleteEvent}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-100"
          >
            <Trash2 size={16} /> Supprimer l&apos;événement
          </button>
          <p className="mt-3 text-center text-[10px] font-medium text-red-900/40">
            Cette action est irréversible.
          </p>
        </div>
      )}
    </div>
  );
}
