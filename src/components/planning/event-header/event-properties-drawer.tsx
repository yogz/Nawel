"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X, Share2, PenLine, Calendar, MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { DangerZoneContent } from "@/components/common/destructive-actions";
import { type PlanData, type Sheet } from "@/lib/types";
import { format } from "date-fns";
import { fr, enUS, el, de, es, pt } from "date-fns/locale";
import { useParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const dateLocales: Record<string, typeof fr> = {
  fr,
  en: enUS,
  el,
  de,
  es,
  pt,
};

interface EventPropertiesDrawerProps {
  open: boolean;
  onClose: () => void;
  plan: PlanData;
  setSheet: (sheet: Sheet) => void;
  isOwner?: boolean;
  handlers: {
    handleDeleteEvent: () => Promise<void>;
  };
}

export function EventPropertiesDrawer({
  open,
  onClose,
  plan,
  setSheet,
  isOwner,
  handlers,
}: EventPropertiesDrawerProps) {
  const t = useTranslations("EventDashboard");
  const tCommon = useTranslations("common");
  const params = useParams();
  const currentLocale = (params.locale as string) || "fr";
  const dateLocale = dateLocales[currentLocale] || fr;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const firstMeal = plan.meals[0];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await handlers.handleDeleteEvent();
      onClose();
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 text-left">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className="text-lg font-black tracking-tight">
              {t("Properties.title")}
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                className="rounded-full bg-gray-50 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 active:scale-95 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                aria-label={tCommon("close")}
              >
                <X size={16} />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="scrollbar-none min-h-[40vh] flex-1 overflow-y-auto pb-10">
          <div className="space-y-6">
            {/* Event Summary Card */}
            <div className="space-y-4 rounded-2xl bg-gray-50 p-4 dark:bg-zinc-800">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  {plan.event?.name}
                </h3>
                {plan.event?.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-zinc-400">
                    {plan.event.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {firstMeal?.date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                    <Calendar size={16} className="text-violet-500 dark:text-violet-400" />
                    <span>
                      {format(new Date(firstMeal.date), "PPP", { locale: dateLocale })}
                      {firstMeal.time && ` • ${firstMeal.time}`}
                    </span>
                  </div>
                )}
                {(() => {
                  const mealWithAddress = plan.meals.find((m) => m.address);
                  const address = mealWithAddress?.address;
                  if (!address) return null;

                  return (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                      <MapPin size={16} className="text-violet-500 dark:text-violet-400" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-1 transition-colors hover:text-violet-600 hover:underline dark:hover:text-violet-400"
                      >
                        {address}
                      </a>
                    </div>
                  );
                })()}
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-400">
                  <Users size={16} className="mt-0.5 text-violet-500 dark:text-violet-400" />
                  <div className="flex flex-col">
                    <span>
                      {(() => {
                        const stats = plan.people.reduce(
                          (acc, person) => {
                            const isConfirmed = person.status === "confirmed";
                            if (isConfirmed) {
                              acc.confirmedCount++;
                              // Each person counts as 1 adult (the user) + their guests
                              acc.totalAdults += 1 + (person.guest_adults || 0);
                              acc.totalChildren += person.guest_children || 0;
                            } else {
                              // For non-confirmed, we just count the potential head (1)
                              // or should we show "X/Y responded"?
                              // Request says "how many responded", "how many adults/children"
                              // Usually adults/children count is relevant only for those coming.
                            }
                            acc.totalResponseCount +=
                              person.status && person.status !== "pending" ? 1 : 0;
                            return acc;
                          },
                          {
                            confirmedCount: 0,
                            totalAdults: 0,
                            totalChildren: 0,
                            totalResponseCount: 0,
                          }
                        );

                        if (stats.confirmedCount === 0) {
                          return t("Properties.noConfirmed", { total: plan.people.length });
                        }

                        return (
                          <>
                            <span className="font-medium text-gray-900 dark:text-zinc-100">
                              {t("Properties.confirmed", { count: stats.confirmedCount })}
                            </span>
                            <span className="text-gray-500 dark:text-zinc-400">
                              {" "}
                              / {t("Properties.guests", { count: plan.people.length })}
                            </span>
                          </>
                        );
                      })()}
                    </span>
                    {(() => {
                      const stats = plan.people.reduce(
                        (acc, person) => {
                          if (person.status === "confirmed") {
                            acc.totalAdults += 1 + (person.guest_adults || 0);
                            acc.totalChildren += person.guest_children || 0;
                          }
                          return acc;
                        },
                        { totalAdults: 0, totalChildren: 0 }
                      );

                      if (stats.totalAdults === 0 && stats.totalChildren === 0) return null;

                      return (
                        <span className="text-xs text-gray-400 dark:text-zinc-500">
                          {t("Properties.adults", { count: stats.totalAdults })}
                          {stats.totalChildren > 0 &&
                            `, ${t("Properties.children", { count: stats.totalChildren })}`}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={cn("grid gap-3", isOwner ? "grid-cols-2" : "grid-cols-1")}>
              {isOwner && (
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 rounded-2xl border-gray-100 bg-white py-4 transition-all hover:bg-gray-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  onClick={() => {
                    setSheet({ type: "event-edit" });
                    onClose();
                  }}
                >
                  <div className="rounded-full bg-violet-50 p-2 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                    <PenLine size={20} />
                  </div>
                  <span className="font-semibold text-gray-700 dark:text-zinc-300">
                    {t("Properties.edit")}
                  </span>
                </Button>
              )}

              <Button
                variant="outline"
                className={cn(
                  "h-auto gap-2 rounded-2xl border-gray-100 bg-white py-4 transition-all hover:bg-gray-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700",
                  isOwner ? "flex-col" : "flex-row justify-center"
                )}
                onClick={() => {
                  setSheet({ type: "share" });
                  onClose();
                }}
              >
                <div className="rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <Share2 size={20} />
                </div>
                <span className="font-semibold text-gray-700 dark:text-zinc-300">
                  {t("Properties.share")}
                </span>
              </Button>
            </div>

            {/* Danger Zone */}
            {isOwner && (
              <div className="border-t border-gray-100 pt-4 dark:border-zinc-700">
                {!showDangerZone ? (
                  <button
                    onClick={() => setShowDangerZone(true)}
                    className="w-full py-3 text-xs font-black uppercase tracking-widest text-red-500/60 transition-all hover:text-red-500"
                  >
                    {t("Properties.deleteEvent")}
                  </button>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <DangerZoneContent
                      onDelete={handleDelete}
                      onCancel={() => setShowDangerZone(false)}
                      isDeleting={isDeleting}
                      title={t("Properties.deleteEvent")}
                      warningMessage={t("Properties.deleteWarning")}
                      deleteButtonLabel={t("Properties.deleteConfirm")}
                      cancelButtonLabel={tCommon("cancel")}
                      confirmationConfig={{
                        title: t("Properties.deleteConfirmTitle"),
                        description: t("Properties.deleteConfirmDescription"),
                        confirmLabel: t("Properties.deleteConfirmYes"),
                        cancelLabel: tCommon("cancel"),
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
