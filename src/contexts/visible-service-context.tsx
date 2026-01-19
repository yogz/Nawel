"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useVisibleService } from "@/hooks/use-visible-service";

interface VisibleServiceContextValue {
  visibleServiceId: number | null;
  registerService: (serviceId: number, element: Element | null) => void;
  unregisterService: (serviceId: number) => void;
}

const VisibleServiceContext = createContext<VisibleServiceContextValue | null>(null);

export function VisibleServiceProvider({ children }: { children: ReactNode }) {
  const visibleService = useVisibleService();

  return (
    <VisibleServiceContext.Provider value={visibleService}>
      {children}
    </VisibleServiceContext.Provider>
  );
}

export function useVisibleServiceContext() {
  const context = useContext(VisibleServiceContext);
  if (!context) {
    throw new Error("useVisibleServiceContext must be used within a VisibleServiceProvider");
  }
  return context;
}
