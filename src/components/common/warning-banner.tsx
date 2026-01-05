"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarningBannerProps {
  message: string;
  className?: string;
}

export function WarningBanner({ message, className }: WarningBannerProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
        className
      )}
    >
      <div className="flex shrink-0 items-start pt-0.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-100/50 text-red-500">
          <ShieldAlert size={16} />
        </div>
      </div>
      <p className="text-xs font-bold leading-relaxed text-red-700/80">{message}</p>
    </div>
  );
}
