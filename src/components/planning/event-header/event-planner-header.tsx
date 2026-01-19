"use client";

import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useThemeMode } from "@/components/theme-provider";
import { ProfileDrawer } from "@/components/auth/profile-drawer";
import { EventHeaderNav } from "./event-header-nav";
import { EventTitle } from "./event-title";
import { EventMetaPills } from "./event-meta-pills";
import { EventHeaderActions } from "./event-header-actions";
import type { PlanData, Sheet } from "@/lib/types";

type TabType = "planning" | "people" | "shopping";

interface EventPlannerHeaderProps {
  readOnly: boolean;
  tab: TabType;
  setTab: (tab: TabType) => void;
  plan: PlanData;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  slug: string;
  writeKey?: string;
  handlers: {
    handleUpdateEvent?: (name: string) => void;
    handleUpdateMeal?: (
      mealId: number,
      date: string,
      title?: string | null,
      adults?: number,
      children?: number,
      time?: string,
      address?: string
    ) => void;
  };
}

/**
 * EventPlannerHeader
 * ==================
 * Main sticky header for event pages.
 *
 * STRUCTURE:
 * - Read-only warning banner (when applicable)
 * - Christmas garland (when theme is christmas)
 * - Sticky header container:
 *   - Navigation row (back + menu) - hidden on scroll
 *   - Event title (editable)
 *   - Meta pills (date, time, location) + action buttons
 *
 * Z-INDEX: 100 (see globals.css for hierarchy)
 *
 * SAFE-AREA:
 * - Applies paddingTop: env(safe-area-inset-top) for notch/status bar
 *
 * SCROLL BEHAVIOR:
 * - Transparent background when at top
 * - White/blur background with border when scrolled
 * - Navigation row animates out when scrolled
 *
 * SUB-COMPONENTS:
 * - EventHeaderNav: Back and menu buttons
 * - EventTitle: Editable event name
 * - EventMetaPills: Date, time, location pills
 * - EventHeaderActions: Calendar and share buttons
 */
export function EventPlannerHeader({
  readOnly,
  tab: _tab,
  setTab: _setTab,
  plan,
  setSheet,
  sheet: _sheet,
  slug: _slug,
  writeKey: _writeKey,
  handlers,
}: EventPlannerHeaderProps) {
  const { theme } = useThemeMode();
  const t = useTranslations("EventDashboard.Header");
  const tShared = useTranslations("EventDashboard.Shared");

  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showAttention, setShowAttention] = useState(true);

  // Stop attention animation after 2 minutes
  useEffect(() => {
    const timer = setTimeout(() => setShowAttention(false), 2 * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle scroll for sticky header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const firstMeal = plan.meals[0];

  return (
    <>
      {/* Christmas Theme Garland */}
      {theme === "christmas" && (
        <div className="christmas-garland">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="christmas-light" />
          ))}
        </div>
      )}

      {/* Read-Only Warning Banner */}
      {readOnly && (
        <div className="flex items-center gap-2 bg-amber-100 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert size={16} />
          {t("readOnlyWarning")}
        </div>
      )}

      {/* Main Sticky Header */}
      <header
        className={cn(
          "sticky top-0 z-[100] w-full transition-all duration-500 overflow-visible",
          isScrolled
            ? "bg-[#E6D9F8]/85 backdrop-blur-xl border-b border-black/[0.04] shadow-sm"
            : "bg-transparent"
        )}
      >
        <div
          className="mx-auto w-full lg:max-w-4xl transition-all duration-500"
          style={{
            paddingTop: `env(safe-area-inset-top, 0px)`,
          }}
        >
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={false}
              animate={{
                paddingTop: isScrolled ? "1.1rem" : "1.25rem",
                paddingBottom: isScrolled ? "0.85rem" : "1.1rem",
              }}
              transition={{
                duration: 0.4,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="relative px-4"
            >
              <div className="flex flex-col gap-0.5">
                {/* Navigation Row - Hidden on Scroll */}
                <motion.div
                  initial={false}
                  animate={{
                    height: isScrolled ? 0 : "auto",
                    opacity: isScrolled ? 0 : 1,
                    y: isScrolled ? -20 : 0,
                    marginBottom: isScrolled ? 0 : 4,
                  }}
                  transition={{
                    duration: 0.4,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="overflow-hidden"
                >
                  <EventHeaderNav
                    isScrolled={isScrolled}
                    onMenuClick={() => setShowProfileDrawer(true)}
                  />
                </motion.div>

                {/* Event Title */}
                <div className="flex items-center gap-2">
                  <EventTitle
                    name={plan.event?.name || ""}
                    defaultName={tShared("defaultEventName")}
                    isScrolled={isScrolled}
                    readOnly={readOnly}
                    onUpdate={(newName) => handlers.handleUpdateEvent?.(newName)}
                  />
                </div>

                {/* Meta Pills + Actions Row */}
                {plan.meals.length > 0 && firstMeal && (
                  <div className="flex items-center justify-between gap-2 px-1">
                    <EventMetaPills
                      meal={firstMeal}
                      mealCount={plan.meals.length}
                      isScrolled={isScrolled}
                      readOnly={readOnly}
                      onUpdateMeal={(id, date, title, adults, children, time, address) =>
                        handlers.handleUpdateMeal?.(
                          id,
                          date,
                          title,
                          adults,
                          children,
                          time,
                          address
                        )
                      }
                    />

                    <EventHeaderActions
                      meal={firstMeal}
                      eventName={plan.event?.name || "Event"}
                      isScrolled={isScrolled}
                      readOnly={readOnly}
                      showAttention={showAttention}
                      onShareClick={() => setSheet({ type: "share" })}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Profile Drawer */}
      <ProfileDrawer open={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
    </>
  );
}
