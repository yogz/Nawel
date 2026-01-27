"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Reusable empty state component with illustration, message, and optional action
 * Provides consistent empty states across the application
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className = "",
}: EmptyStateProps) {
  const isCompact = variant === "compact";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`mx-auto flex max-w-lg flex-col items-center justify-center px-6 text-center ${
        isCompact ? "py-12" : "py-20"
      } ${className}`}
    >
      <div className="group relative mb-8">
        <div className="absolute -inset-8 animate-pulse rounded-full bg-accent/5 blur-2xl transition-all group-hover:bg-accent/10" />
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [0, -2, 2, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative rounded-3xl bg-white/50 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
        >
          <div className="flex items-center justify-center text-accent/20">{icon}</div>
          {action && (
            <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 shadow-lg ring-1 ring-accent/20">
              <PlusIcon className="h-5 w-5 text-accent" strokeWidth={2.5} />
            </div>
          )}
        </motion.div>
      </div>

      <h3
        className={`mb-3 font-black tracking-tight text-gray-900 ${
          isCompact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
        }`}
      >
        {title}
      </h3>
      <p
        className={`mb-10 max-w-sm font-medium leading-relaxed text-gray-500 ${
          isCompact ? "text-sm" : "text-base"
        }`}
      >
        {description}
      </p>

      {action && (
        <Button
          variant="premium"
          size="lg"
          className="btn-accent-shadow h-14 w-full max-w-xs rounded-full bg-accent text-lg font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95"
          icon={action.icon || <PlusIcon size={24} />}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
