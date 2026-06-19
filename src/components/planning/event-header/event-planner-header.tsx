"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { m as motion, useReducedMotion, useScroll, useMotionValueEvent } from "framer-motion";
import { useTranslations } from "next-intl";
import { useThemeMode } from "@/components/theme-provider";
import { EventPropertiesDrawer } from "./event-properties-drawer";
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
  isOwner?: boolean;
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
    handleDeleteEvent: () => Promise<void>;
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
  isOwner,
  handlers,
}: EventPlannerHeaderProps) {
  // Theme hook removed (was for christmas)
  const t = useTranslations("EventDashboard.Header");
  const tShared = useTranslations("EventDashboard.Shared");

  const [isScrolled, setIsScrolled] = useState(false);
  const [showPropertiesDrawer, setShowPropertiesDrawer] = useState(false);
  const [showAttention, setShowAttention] = useState(true);
  const reduceMotion = useReducedMotion();

  // Stop attention animation after 2 minutes
  useEffect(() => {
    const timer = setTimeout(() => setShowAttention(false), 2 * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle scroll for sticky header styling — hysteresis to avoid flicker.
  // A hard threshold flickers because collapsing the header shrinks the document,
  // and the browser's scroll-anchoring bounces scrollY back across the threshold.
  // Dead band between the two thresholds = no toggling; COLLAPSE_ABOVE is kept well
  // above the collapsed height (~90px) so the post-collapse anchor jump can't land
  // back under EXPAND_BELOW. (Same useScroll pattern as tab-bar.tsx.)
  const EXPAND_BELOW = 28;
  const COLLAPSE_ABOVE = 120;
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (Math.abs(latest - prev) < 6) {
      return; // ignore micro-scroll jitter
    }
    if (latest < EXPAND_BELOW) {
      setIsScrolled(false); // always expanded near the top
      return;
    }
    if (latest > COLLAPSE_ABOVE) {
      setIsScrolled(true); // collapsed once scrolled well past the header
    }
    // between the two thresholds: keep current state (hysteresis)
  });

  const firstMeal = plan.meals[0];

  return (
    <>
      {/* Christmas Theme Garland */}

      {/* Read-only banner is rendered by EventPlanner component to avoid duplication */}

      {/* Main Sticky Header */}
      <header
        className={cn(
          "sticky top-0 z-[100] w-full transition-all duration-500 overflow-visible",
          isScrolled ? "header-scrolled" : "bg-transparent"
        )}
      >
        <div className="safe-area-top mx-auto w-full lg:max-w-4xl transition-all duration-500">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={false}
              animate={isScrolled ? "scrolled" : "default"}
              variants={{
                default: { paddingTop: "1.25rem", paddingBottom: "1.5rem" },
                scrolled: { paddingTop: "1.1rem", paddingBottom: "1rem" },
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
                    onMenuClick={() => setShowPropertiesDrawer(true)}
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

                {/* Meta Pills + Actions Row - Hidden on Scroll (only title stays) */}
                {plan.meals.length > 0 && firstMeal && (
                  <motion.div
                    initial={false}
                    animate={{
                      height: isScrolled ? 0 : "auto",
                      opacity: isScrolled ? 0 : 1,
                      y: isScrolled ? -8 : 0,
                    }}
                    transition={
                      reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
                    }
                    className="overflow-hidden"
                    aria-hidden={isScrolled}
                    inert={isScrolled}
                  >
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
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Properties Drawer */}
      <EventPropertiesDrawer
        open={showPropertiesDrawer}
        onClose={() => setShowPropertiesDrawer(false)}
        plan={plan}
        setSheet={setSheet}
        isOwner={isOwner}
        handlers={handlers}
      />
    </>
  );
}
