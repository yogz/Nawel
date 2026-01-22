"use client";

import { useMemo } from "react";
import {
  Sparkles,
  Pencil,
  ShoppingCart,
  Scale,
  Euro,
  MessageSquare,
  ChefHat,
  Plus,
  ChevronRight,
  Check,
  X,
  HelpCircle,
  CircleDashed,
} from "lucide-react";
import { updatePersonStatusAction } from "@/app/actions/person-actions";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTransition, useState, useEffect } from "react";
import { getDisplayName } from "@/lib/utils";
import { motion } from "framer-motion";
import clsx from "clsx";
import { type PlanData, type Person, type Item, type Service, type Sheet } from "@/lib/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PersonAvatar } from "../common/person-avatar";
import { SectionHeader } from "./section-header";

interface PeopleTabProps {
  plan: PlanData;
  slug: string;
  writeKey?: string;
  selectedPerson: number | null;
  setSelectedPerson: (id: number | null) => void;
  setSheet: (sheet: Sheet) => void;
  onClaim?: (personId: number) => void;
  onUnclaim?: (personId: number) => void; // Keeping prop for now to avoid breaking too many things, but will remove usage
  readOnly?: boolean;
  currentUserId?: string;
}

interface PersonItem {
  item: Item;
  service: Service;
  mealTitle: string;
}

export function PeopleTab({
  plan,
  slug,
  writeKey,
  selectedPerson,
  setSelectedPerson,
  setSheet,
  readOnly,
  currentUserId,
  onClaim,
  onUnclaim: _onUnclaim,
}: PeopleTabProps) {
  const t = useTranslations("EventDashboard.People");
  const tForm = useTranslations("EventDashboard.ItemForm");
  const itemsByPerson = useMemo(() => {
    const byPerson: Record<number, PersonItem[]> = {};
    plan.people.forEach((person: Person) => {
      byPerson[person.id] = [];
    });
    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (item.personId && byPerson[item.personId]) {
            byPerson[item.personId].push({ item, service, mealTitle: meal.title || meal.date });
          }
        });
      });
    });
    return byPerson;
  }, [plan.meals, plan.people]);

  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<Record<number, string>>({});
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null);
  const [guestTokens, setGuestTokens] = useState<Record<number, string>>({});

  // Load guest tokens on mount
  useEffect(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem("colist_guest_tokens") || "{}");
      setGuestTokens(tokens);
    } catch (e) {
      console.error("Failed to load guest tokens", e);
    }
  }, []);

  const handleStatusUpdate = (personId: number, status: "confirmed" | "declined" | "maybe") => {
    // 1. Optimistic Update (Immediate Feedback)
    setOptimisticStatus((prev) => ({ ...prev, [personId]: status }));

    // 2. Close Popover immediately
    setOpenPopoverId(null);

    // 3. Server Action
    startTransition(async () => {
      try {
        await updatePersonStatusAction({
          slug,
          key: writeKey,
          personId,
          status,
          token: guestTokens[personId],
        });
        toast.success(t("statusUpdated"));
      } catch (error) {
        toast.error(t("errorUpdatingStatus"));
        // Revert optimistic update on error
        setOptimisticStatus((prev) => {
          const newState = { ...prev };
          delete newState[personId];
          return newState;
        });
      }
    });
  };

  const stats = plan.people.reduce(
    (acc, person) => {
      const status = optimisticStatus[person.id] || person.status;
      if (status === "confirmed") acc.confirmed++;
      else if (status === "declined") acc.declined++;
      else if (status === "maybe") acc.maybe++;
      else acc.pending++;
      return acc;
    },
    { confirmed: 0, declined: 0, maybe: 0, pending: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Attendance & Filters Area */}
      <div className="space-y-4">
        {/* Attendance Confirmation Card (for current user or token owner) */}
        {!readOnly &&
          plan.people.map((person) => {
            const effectiveStatus = optimisticStatus[person.id] || person.status;
            const isOwner = person.userId === currentUserId;
            const isTokenOwner = !!guestTokens[person.id];
            const canEdit = isOwner || isTokenOwner;

            if (!canEdit) return null;
            if (effectiveStatus && effectiveStatus !== "maybe") return null;

            return (
              <motion.div
                key={person.id}
                layout // Smooth layout transition when it disappears
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-white to-purple-50 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {getDisplayName(person)}, {t("areYouComing")}
                    </h3>
                    <p className="text-xs text-muted-foreground">{t("confirmPresence")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(person.id, "confirmed")}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(person.id, "declined")}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 transition-colors hover:bg-red-200"
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

        {/* Horizontal Filter Scroll */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-3 p-1">
            <button
              onClick={() => setSelectedPerson(null)}
              className={clsx(
                "group relative flex h-14 items-center justify-between gap-4 rounded-2xl border-2 px-3 transition-all outline-none",
                selectedPerson === null
                  ? "border-accent bg-accent text-white shadow-md shadow-accent/20"
                  : "border-gray-200 bg-white hover:border-accent/30 hover:bg-gray-50"
              )}
            >
              <div className="flex flex-col items-start min-w-[60px]">
                <span
                  className={clsx(
                    "text-sm font-black uppercase tracking-widest",
                    selectedPerson === null ? "text-white" : "text-gray-900"
                  )}
                >
                  {t("all")}
                </span>
                <span
                  className={clsx(
                    "text-[10px] font-bold",
                    selectedPerson === null ? "text-white/80" : "text-gray-400"
                  )}
                >
                  {plan.people.length}
                </span>
              </div>

              <div
                className={clsx(
                  "h-8 w-[1.5px] rounded-full",
                  selectedPerson === null ? "bg-white/20" : "bg-gray-100"
                )}
              />

              <div className="flex flex-col gap-0.5 min-w-[50px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Check
                      size={10}
                      strokeWidth={4}
                      className={clsx(selectedPerson === null ? "text-white" : "text-green-600")}
                    />
                    <span
                      className={clsx(
                        "text-[9px] font-bold leading-none",
                        selectedPerson === null ? "text-white" : "text-gray-700"
                      )}
                    >
                      {stats.confirmed}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle
                      size={10}
                      strokeWidth={4}
                      className={clsx(selectedPerson === null ? "text-white" : "text-orange-500")}
                    />
                    <span
                      className={clsx(
                        "text-[9px] font-bold leading-none",
                        selectedPerson === null ? "text-white" : "text-gray-700"
                      )}
                    >
                      {stats.maybe}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <X
                      size={10}
                      strokeWidth={4}
                      className={clsx(selectedPerson === null ? "text-white" : "text-red-500")}
                    />
                    <span
                      className={clsx(
                        "text-[9px] font-bold leading-none",
                        selectedPerson === null ? "text-white" : "text-gray-700"
                      )}
                    >
                      {stats.declined}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {plan.people.map((person) => {
              const effectiveStatus = optimisticStatus[person.id] || person.status;
              const isAssigned = person.userId !== null;

              const statusColor =
                effectiveStatus === "confirmed"
                  ? "bg-green-500"
                  : effectiveStatus === "declined"
                    ? "bg-red-500"
                    : "bg-gray-300";

              return (
                <div key={person.id} className="relative group">
                  <button
                    onClick={() => setSelectedPerson(person.id)}
                    className={clsx(
                      "flex flex-col items-center gap-1.5 transition-all outline-none",
                      selectedPerson === person.id
                        ? "opacity-100 scale-105"
                        : "opacity-60 hover:opacity-80"
                    )}
                  >
                    <div
                      className={clsx(
                        "relative p-0.5 rounded-full border-2 transition-all",
                        selectedPerson === person.id ? "border-accent" : "border-transparent"
                      )}
                    >
                      <PersonAvatar
                        person={person}
                        allNames={plan.people.map((p) => p.name)}
                        size="md" // 12w ~ 48px
                        className="h-11 w-11 shadow-sm ring-2 ring-white"
                      />
                      {effectiveStatus && (
                        <div
                          className={clsx(
                            "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white",
                            effectiveStatus === "confirmed"
                              ? "bg-green-500"
                              : effectiveStatus === "declined"
                                ? "bg-red-500"
                                : "bg-gray-200"
                          )}
                        >
                          {effectiveStatus === "confirmed" && <Check size={8} strokeWidth={4} />}
                          {effectiveStatus === "declined" && <X size={8} strokeWidth={4} />}
                        </div>
                      )}
                    </div>
                    <span
                      className={clsx(
                        "text-[10px] font-medium truncate max-w-[60px]",
                        selectedPerson === person.id ? "text-accent font-bold" : "text-gray-600"
                      )}
                    >
                      {getDisplayName(person)}
                    </span>
                  </button>
                </div>
              );
            })}

            {!readOnly && (
              <button
                onClick={() => setSheet({ type: "person" })}
                className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-all outline-none"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-accent hover:text-accent hover:bg-accent/5">
                  <Plus size={20} />
                </div>
                <span className="text-[10px] font-medium text-gray-500">{t("add")}</span>
              </button>
            )}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="space-y-8">
        {plan.people
          .filter((p) => selectedPerson === null || selectedPerson === p.id)
          .map((person) => {
            const personItems = itemsByPerson[person.id] || [];
            // Show everyone even if they have no items, so they appear in "hero mode"
            const effectiveStatus = optimisticStatus[person.id] || person.status;
            const isOwner = person.userId === currentUserId;
            const isTokenOwner = !!guestTokens[person.id];
            const canEdit = isOwner || isTokenOwner;

            return (
              <div key={person.id} className="space-y-4">
                <SectionHeader
                  className="sticky top-[calc(env(safe-area-inset-top)+154px)] z-30 mx-1"
                  title={getDisplayName(person)}
                  description={
                    person.userId === currentUserId ? (
                      <span className="text-accent font-bold uppercase tracking-wider text-[10px]">
                        {t("itsYou")}
                      </span>
                    ) : null
                  }
                  icon={
                    <div className="relative">
                      <PersonAvatar
                        person={person}
                        allNames={plan.people.map((p) => p.name)}
                        size="md"
                        className="shadow-sm ring-1 ring-gray-100"
                      />
                      {person.userId === currentUserId && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] text-white shadow-sm ring-2 ring-white">
                          <Sparkles size={8} />
                        </div>
                      )}
                    </div>
                  }
                  actions={
                    <div className="flex items-center gap-2">
                      {/* Status Picker for Current User OR Token Owner */}
                      {canEdit && (
                        <Popover
                          open={openPopoverId === person.id}
                          onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? person.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className={clsx(
                                "flex h-8 items-center gap-2 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ring-1 ring-inset",
                                effectiveStatus === "confirmed"
                                  ? "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100"
                                  : effectiveStatus === "declined"
                                    ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                                    : effectiveStatus === "maybe"
                                      ? "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100"
                                      : "bg-white text-gray-500 ring-gray-200 hover:bg-gray-50"
                              )}
                            >
                              {effectiveStatus === "confirmed" && (
                                <Check size={12} strokeWidth={3} />
                              )}
                              {effectiveStatus === "declined" && <X size={12} strokeWidth={3} />}
                              {effectiveStatus === "maybe" && (
                                <HelpCircle size={12} strokeWidth={3} />
                              )}
                              {!effectiveStatus && <CircleDashed size={12} strokeWidth={3} />}
                              <span>
                                {effectiveStatus === "confirmed"
                                  ? t("present")
                                  : effectiveStatus === "declined"
                                    ? t("absent")
                                    : effectiveStatus === "maybe"
                                      ? t("maybe")
                                      : t("respond")}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-1" align="end">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleStatusUpdate(person.id, "confirmed")}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                              >
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                                  <Check size={10} strokeWidth={3} />
                                </div>
                                {t("present")}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(person.id, "maybe")}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                              >
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                  <HelpCircle size={10} strokeWidth={3} />
                                </div>
                                {t("maybe")}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(person.id, "declined")}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                                  <X size={10} strokeWidth={3} />
                                </div>
                                {t("absent")}
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* Claim Button Logic (keep existing logic if needed, but might be redundant if user is already linked) */}
                      {!person.userId &&
                        currentUserId &&
                        !plan.people.some((p) => p.userId === currentUserId) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClaim?.(person.id);
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-accent/90"
                          >
                            {t("itsMe")}
                          </button>
                        )}

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => setSheet({ type: "person-edit", person })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-black/5 hover:text-gray-900"
                        >
                          <Pencil size={14} />
                        </button>
                      )}

                      {personItems.length > 0 && (
                        <Link
                          href={
                            writeKey
                              ? `/event/${slug}/shopping/${person.id}?key=${writeKey}`
                              : `/event/${slug}/shopping/${person.id}`
                          }
                          className="flex h-9 items-center gap-2 rounded-xl bg-white/50 px-3 text-xs font-bold uppercase tracking-wide text-accent transition-all hover:bg-white/80"
                        >
                          <ShoppingCart size={14} />
                          <span className="hidden sm:inline">{t("shoppingList")}</span>
                        </Link>
                      )}
                    </div>
                  }
                >
                  {/* Meta Content in middle (Article count) */}
                  <div className="hidden sm:flex items-center gap-3 ml-auto mr-4">
                    <p className="text-xs font-medium text-gray-500">
                      {t("articlesCount", { count: personItems.length })}
                    </p>
                  </div>
                </SectionHeader>

                {/* Mobile Article Count (outside header if space is tight, or just rely on items below) */}
                <div className="sm:hidden -mt-2 px-2 flex justify-end">
                  <p className="text-[10px] font-medium text-gray-400">
                    {t("articlesCount", { count: personItems.length })}
                  </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex flex-col">
                    {personItems.map(({ item, service, mealTitle }: PersonItem) => (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileTap={{ scale: 0.995 }}
                        onClick={() => setSheet({ type: "item", serviceId: service.id, item })}
                        disabled={readOnly}
                        aria-label={t("editItem", { name: item.name })}
                        className="group relative w-full cursor-pointer px-4 py-3 text-left transition-all duration-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default"
                      >
                        <div className="relative">
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                              {plan.meals.length > 1 ? `${mealTitle} • ` : ""}
                              {service.title}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-accent">
                              {item.name}
                            </p>
                            <ChevronRight
                              size={14}
                              className="text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                            />
                          </div>
                          {(item.quantity ||
                            item.note ||
                            item.price ||
                            (item.ingredients && item.ingredients.length > 0)) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {item.quantity?.trim() && (
                                <div className="flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                  <Scale size={10} className="text-gray-400" />
                                  {item.quantity}
                                </div>
                              )}
                              {item.price && (
                                <div className="flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                  <Euro size={10} className="text-green-600" />
                                  {item.price.toFixed(2)}
                                </div>
                              )}
                              {item.ingredients && item.ingredients.length > 0 && (
                                <div className="flex items-center gap-1 rounded-md bg-accent/5 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                                  <ChefHat size={10} className="text-accent" />
                                  {item.ingredients.filter((i) => i.checked).length}/
                                  {item.ingredients.length}
                                </div>
                              )}
                              {item.note && (
                                <div className="flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium italic text-blue-700">
                                  <MessageSquare size={10} className="text-blue-400" />
                                  <span className="max-w-[150px] truncate">
                                    {item.note.startsWith("EventDashboard.")
                                      ? tForm("defaultNote", {
                                          count:
                                            service.peopleCount ||
                                            service.adults + service.children ||
                                            0,
                                        })
                                      : item.note}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-4 right-4 h-px bg-gray-50 group-last:hidden" />
                      </motion.button>
                    ))}
                    {personItems.length === 0 && (
                      <div className="p-8 text-center bg-gray-50/30">
                        <p className="text-sm font-medium text-gray-400">{t("noItems")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
