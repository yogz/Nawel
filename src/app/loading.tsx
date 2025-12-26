"use client";

import { useThemeMode } from "@/components/theme-provider";

export default function Loading() {
  const { christmas } = useThemeMode();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div
            className={`absolute inset-0 animate-ping rounded-full opacity-75 ${christmas ? "bg-red-200" : "bg-accent/20"}`}
          />
          <div
            className={`relative flex h-16 w-16 items-center justify-center rounded-full text-3xl ${christmas ? "bg-red-100" : "bg-accent/10"}`}
          >
            {christmas ? "🎄" : "✨"}
          </div>
        </div>
        <p className="animate-pulse text-sm font-medium text-gray-500">
          {christmas ? "Chargement de Noël..." : "Chargement en cours..."}
        </p>
      </div>
    </div>
  );
}
