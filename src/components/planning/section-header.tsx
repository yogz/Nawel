"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode; // For meta or other content in the middle
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  readOnly?: boolean;
}

export function SectionHeader({
  icon,
  title,
  description,
  children,
  actions,
  onClick,
  className,
  readOnly,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[44px] h-auto items-center justify-between gap-3 px-4 py-1 rounded-2xl backdrop-blur-xl border shadow-md transition-all",
        "bg-gradient-to-r from-purple-100/95 via-white/90 to-pink-100/95 border-accent/20",
        "dark:from-zinc-900/90 dark:via-zinc-900/80 dark:to-zinc-900/90 dark:border-white/10",
        !readOnly && onClick && "cursor-pointer active:opacity-90",
        className
      )}
      onClick={!readOnly && onClick ? onClick : undefined}
      role={!readOnly && onClick ? "button" : undefined}
      tabIndex={!readOnly && onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!readOnly && onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex flex-1 items-center gap-2.5 min-w-0">
        {icon && <span className="flex-shrink-0 text-base">{icon}</span>}
        <div className="flex flex-1 flex-col min-w-0">
          <h3 className="text-base font-extrabold text-text tracking-tight truncate">{title}</h3>
          {description && (
            <div className="text-[11px] font-semibold text-muted-foreground opacity-90 leading-snug font-sans">
              {description}
            </div>
          )}
        </div>
      </div>

      {children}

      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  );
}
