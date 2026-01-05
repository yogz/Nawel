"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarningBannerProps {
  message: string;
  className?: string;
  centered?: boolean;
}

export function WarningBanner({ message, className, centered = false }: WarningBannerProps) {
  if (centered) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-xl border border-red-100 bg-red-50/50 p-3 text-center transition-all duration-300 animate-in fade-in slide-in-from-top-2",
          className
        )}
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-red-100/50 text-red-500">
          <ShieldAlert size={14} />
        </div>
        <p className="text-xs font-bold leading-relaxed text-red-700/80">{message}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 rounded-xl border border-red-100 bg-red-50/50 p-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
        className
      )}
    >
      <div className="flex shrink-0 items-start pt-0.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-red-100/50 text-red-500">
          <ShieldAlert size={14} />
        </div>
      </div>
      <p className="text-xs font-bold leading-relaxed text-red-700/80">{message}</p>
    </div>
  );
}
