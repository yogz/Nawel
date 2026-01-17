"use client";

import { useState, useTransition, useMemo } from "react";
import type { PlanData, Sheet } from "@/lib/types";
import { useToast } from "./use-toast";

export interface ChangeLog {
  id: number;
  action: string;
  tableName: string;
  recordId: number;
  oldData: { name?: string; title?: string } | null;
  newData: { name?: string; title?: string } | null;
  userIp: string | null;
  userAgent: string | null;
  referer: string | null;
  createdAt: Date;
}

export function useEventState(initialPlan: PlanData, writeEnabled: boolean) {
  const [plan, setPlan] = useState(initialPlan);
  const [tab, setTab] = useState<"planning" | "people" | "shopping">("planning");
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [readOnly, setReadOnly] = useState(!writeEnabled);
  const [pending, startTransition] = useTransition();
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  // Toast messages with auto-dismiss - no need for manual setTimeout
  const { message: successMessage, setMessage: setSuccessMessage } = useToast();
  const [logsLoading, setLogsLoading] = useState(false);

  return {
    plan,
    setPlan,
    tab,
    setTab,
    logs,
    setLogs,
    sheet,
    setSheet,
    selectedPerson,
    setSelectedPerson,
    readOnly,
    setReadOnly,
    pending,
    startTransition,
    activeItemId,
    setActiveItemId,
    successMessage,
    setSuccessMessage,
    logsLoading,
    setLogsLoading,
  };
}
