"use client";

import { useState } from "react";
import { type AuditLogEntry } from "@/app/actions/audit-actions";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Search, Eye, History, User, Globe, Link } from "lucide-react";

export function AuditLogList({ initialLogs }: { initialLogs: AuditLogEntry[] }) {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(date));
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Création
          </span>
        );
      case "update":
        return (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Modification
          </span>
        );
      case "delete":
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Suppression
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {action}
          </span>
        );
    }
  };

  const JsonViewer = ({ data, label }: { data: string | null; label: string }) => {
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return (
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
          <pre className="overflow-x-auto rounded-lg bg-black/5 p-3 font-mono text-xs">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      );
    } catch {
      return (
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
          <p className="rounded bg-red-50 p-2 text-xs text-red-600">Erreur de lecture JSON</p>
        </div>
      );
    }
  };

  return (
    <>
      <div className="space-y-3">
        {initialLogs.map((log) => (
          <div
            key={log.id}
            className="group flex flex-col justify-between gap-4 rounded-2xl border border-white/20 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                {getActionBadge(log.action)}
                <span className="text-sm font-semibold text-text">
                  {log.tableName}{" "}
                  <span className="font-normal text-muted-foreground">#{log.recordId}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {log.userName ? `${log.userName} (${log.userEmail})` : "Anonyme"}
                </span>
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  {formatDate(log.createdAt)}
                </span>
                {log.userIp && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {log.userIp}
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(log)}
              className="shrink-0"
            >
              <Eye className="mr-2 h-4 w-4" />
              Détails
            </Button>
          </div>
        ))}

        {initialLogs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-muted/50 py-12 text-center">
            <p className="text-muted-foreground">Aucun log trouvé.</p>
          </div>
        )}
      </div>

      <BottomSheet
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Détails du changement"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">ACTEUR</div>
                <div className="border-l-2 border-primary pl-2 text-sm">
                  <p className="font-semibold text-text">{selectedLog.userName ?? "Anonyme"}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLog.userEmail ?? "Pas d'adresse email"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">CONTEXTE</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {selectedLog.userIp ?? "N/A"}
                  </div>
                  <div className="flex max-w-[200px] items-start gap-1 truncate">
                    <Link className="mt-0.5 h-3 w-3 flex-shrink-0" />{" "}
                    {selectedLog.referer ?? "Direct"}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <JsonViewer label="Avant (Old Data)" data={selectedLog.oldData} />
              <JsonViewer label="Après (New Data)" data={selectedLog.newData} />
            </div>

            <div className="border-t pt-4 font-mono text-[10px] text-muted-foreground">
              UA: {selectedLog.userAgent}
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
