"use client";

import { useState, useTransition } from "react";
import { type AuditLogEntry, deleteAuditLogsAction } from "@/app/actions/audit-actions";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Eye, History, User, Globe, Link, Settings, Trash2, AlertCircle } from "lucide-react";

function JsonViewer({ data, label }: { data: string | null; label: string }) {
  if (!data) {
    return null;
  }

  let parsed: unknown = null;
  let parseError = false;

  try {
    parsed = JSON.parse(data);
  } catch {
    parseError = true;
  }

  if (parseError) {
    return (
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <p className="rounded bg-red-50 p-2 text-xs text-red-600">Erreur de lecture JSON</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <pre className="overflow-x-auto rounded-lg bg-black/5 p-3 font-mono text-xs">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
}

export function AuditLogList({ initialLogs }: { initialLogs: AuditLogEntry[] }) {
  const [logs, _setLogs] = useState(initialLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleBatchDelete = (days?: number) => {
    const confirmMsg = days
      ? `Supprimer tous les logs de plus de ${days} jours ?`
      : "Supprimer TOUS les logs d'audit ? Cette action est irréversible.";

    if (!confirm(confirmMsg)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteAuditLogsAction(days ? { olderThanDays: days } : { deleteAll: true });
        // Refresh to show empty state
        window.location.reload();
      } catch {
        alert("Erreur lors de la suppression");
      }
    });
  };

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

  const renderChangeSummary = (log: AuditLogEntry) => {
    if (log.action === "create") {
      return <span className="text-xs font-medium text-green-600">Nouveau record crée</span>;
    }
    if (log.action === "delete") {
      return <span className="text-xs font-medium text-red-600">Record supprimé</span>;
    }
    if (!log.oldData || !log.newData) {
      return null;
    }

    try {
      const oldObj = JSON.parse(log.oldData) as Record<string, unknown>;
      const newObj = JSON.parse(log.newData) as Record<string, unknown>;
      const changes: string[] = [];

      const skipKeys = [
        "updatedAt",
        "createdAt",
        "id",
        "eventId",
        "mealId",
        "personId",
        "key",
        "adminKey",
      ];

      const formatVal = (v: unknown): string => {
        if (v === null || v === undefined) {
          return "vide";
        }
        if (typeof v === "object") {
          return "...";
        }
        return String(v);
      };

      Object.keys(newObj).forEach((key) => {
        if (skipKeys.includes(key)) {
          return;
        }
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
          changes.push(`${key}: ${formatVal(oldObj[key])} → ${formatVal(newObj[key])}`);
        }
      });

      if (changes.length === 0) {
        return (
          <span className="text-[10px] italic text-muted-foreground">Aucun changement visible</span>
        );
      }

      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {changes.slice(0, 4).map((change, i) => (
            <span
              key={i}
              className="rounded border border-primary/10 bg-primary/5 px-2 py-0.5 text-[9px] font-medium text-primary"
            >
              {change}
            </span>
          ))}
          {changes.length > 4 && (
            <span className="self-center text-[9px] text-muted-foreground">
              +{changes.length - 4} autres
            </span>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  const getRecordDisplayName = (log: AuditLogEntry) => {
    let data: Record<string, unknown> | null = null;

    try {
      data = log.newData
        ? (JSON.parse(log.newData) as Record<string, unknown>)
        : log.oldData
          ? (JSON.parse(log.oldData) as Record<string, unknown>)
          : null;
    } catch {
      return `#${log.recordId}`;
    }

    if (!data) {
      return `#${log.recordId}`;
    }

    const rawName = data.name || data.title || data.dishName || data.email;
    const name = typeof rawName === "string" ? rawName : null;

    if (!name) {
      return `#${log.recordId}`;
    }

    return (
      <>
        <span className="font-bold text-primary">{name}</span>
        <span className="ml-1 text-[10px] text-muted-foreground">#{log.recordId}</span>
      </>
    );
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManageModal(true)}
          className="bg-white/50 backdrop-blur-sm"
        >
          <Settings className="mr-2 h-4 w-4" />
          Gérer les logs
        </Button>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="group flex flex-col justify-between gap-4 rounded-2xl border border-white/20 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                {getActionBadge(log.action)}
                <span className="text-sm font-semibold text-text">
                  {log.tableName} {getRecordDisplayName(log)}
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
              {renderChangeSummary(log)}
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

      <Drawer open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-1 text-left">
            <DrawerTitle>Détails du changement</DrawerTitle>
          </DrawerHeader>
          <div className="scrollbar-none overflow-y-auto pb-8">
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
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showManageModal} onOpenChange={(open) => !open && setShowManageModal(false)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-1 text-left">
            <DrawerTitle>Gestion du journal d'audit</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-6 pb-8">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="mb-1 font-semibold">Maintenance de la base de données</p>
                  <p>
                    La suppression des anciens logs permet de libérer de l&apos;espace et
                    d&apos;améliorer les performances.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="h-auto justify-start px-4 py-3"
                onClick={() => handleBatchDelete(30)}
                disabled={isPending}
              >
                <div className="text-left">
                  <p className="font-semibold">Plus de 30 jours</p>
                  <p className="text-xs text-muted-foreground">
                    Conserver uniquement le dernier mois
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto justify-start px-4 py-3"
                onClick={() => handleBatchDelete(7)}
                disabled={isPending}
              >
                <div className="text-left">
                  <p className="font-semibold">Plus de 7 jours</p>
                  <p className="text-xs text-muted-foreground">
                    Conserver uniquement la dernière semaine
                  </p>
                </div>
              </Button>

              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleBatchDelete()}
                  disabled={isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Tout supprimer
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
