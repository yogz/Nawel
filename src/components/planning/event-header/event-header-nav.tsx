"use client";

import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface EventHeaderNavProps {
  isScrolled: boolean;
  onMenuClick: () => void;
}

/**
 * EventHeaderNav
 * --------------
 * Navigation row with back button and menu button.
 * Appears at the top of the header, hidden when scrolled.
 *
 * Styling:
 * - White/transparent buttons when not scrolled (over gradient)
 * - Gray/white buttons when scrolled (over white header)
 */
export function EventHeaderNav({ isScrolled, onMenuClick }: EventHeaderNavProps) {
  // Dark text for contrast, subtle background adapts to scroll state
  const buttonClasses = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 border shadow-sm text-[#1a0a33]/80",
    isScrolled ? "bg-white/50 border-white/60" : "bg-white/40 border-black/[0.06] backdrop-blur-sm"
  );

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      {/* Back button - navigates to events list */}
      <Link href="/event" className={buttonClasses} aria-label="Back to events">
        <ChevronLeft className="h-5 w-5" strokeWidth={2} />
      </Link>

      {/* Menu button - opens profile drawer */}
      <button onClick={onMenuClick} className={buttonClasses} aria-label="Open menu">
        <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}
