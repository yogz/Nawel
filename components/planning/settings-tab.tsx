"use client";

import { MessageSquare, Trash2, Sparkles } from "lucide-react";

interface ChangeLog {
    id: number;
    action: string;
    tableName: string;
    recordId: number;
    oldData: { name?: string; title?: string } | null;
    newData: { name?: string; title?: string } | null;
    createdAt: string;
    actionType?: string;
}

interface SettingsTabProps {
    logsLoading: boolean;
    logs: ChangeLog[];
    christmas: boolean;
    toggleChristmas: () => void;
    onDeleteEvent: () => void;
    readOnly: boolean;
}

export function SettingsTab({
    logsLoading,
    logs,
    christmas,
    toggleChristmas,
    onDeleteEvent,
    readOnly
}: SettingsTabProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="premium-card p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-text/40 flex items-center gap-2">
                    <Sparkles size={14} /> Ambiance
                </h3>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                    <div>
                        <p className="text-sm font-bold text-text">Mode Festif</p>
                        <p className="text-[10px] text-gray-500 font-medium">Activer les décorations de Noël</p>
                    </div>
                    <button
                        onClick={toggleChristmas}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${christmas ? 'bg-accent' : 'bg-gray-200'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${christmas ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="premium-card p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-text/40 flex items-center gap-2">
                    <MessageSquare size={14} /> Historique des changements
                </h3>
                {logsLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />)}
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                        {logs.map((log) => (
                            <div key={log.id} className="text-[11px] p-3 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-accent/10 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-black uppercase tracking-tighter text-accent/60 italic">{log.actionType} {log.tableName}</span>
                                    <span className="text-[9px] text-gray-400 font-medium">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-text/70 leading-relaxed truncate">
                                    {log.tableName === "items" && (log.newData?.name || log.oldData?.name)}
                                    {log.tableName === "people" && (log.newData?.name || log.oldData?.name)}
                                    {log.tableName === "meals" && (log.newData?.title || log.oldData?.title)}
                                </p>
                            </div>
                        ))}
                        {logs.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">Aucun changement récent</p>}
                    </div>
                )}
            </div>

            {!readOnly && (
                <div className="premium-card p-6 border-red-100 bg-red-50/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-900/40 mb-4 flex items-center gap-2">
                        <Trash2 size={14} /> Zone de danger
                    </h3>
                    <button
                        onClick={onDeleteEvent}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-4 text-sm font-black uppercase tracking-widest text-red-600 hover:bg-red-100 transition-all border border-red-200"
                    >
                        <Trash2 size={16} /> Supprimer l&apos;événement
                    </button>
                    <p className="mt-3 text-[10px] text-red-900/40 text-center font-medium">Cette action est irréversible.</p>
                </div>
            )}
        </div>
    );
}
