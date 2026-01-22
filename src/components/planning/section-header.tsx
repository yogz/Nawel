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
        "flex h-11 items-center justify-between gap-3 px-4 rounded-2xl bg-gradient-to-r from-purple-100/95 via-white/90 to-pink-100/95 backdrop-blur-xl border-2 border-accent/20 shadow-md transition-all",
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
        <div className="flex flex-col min-w-0">
          <h3 className="text-base font-extrabold text-gray-800 tracking-tight truncate">
            {title}
          </h3>
          {description && (
            <div className="text-[10px] font-medium text-gray-500 leading-none">{description}</div>
          )}
        </div>
      </div>

      {children}

      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  );
}
