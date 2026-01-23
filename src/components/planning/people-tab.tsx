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
  Minus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RSVPSummary } from "@/features/people/components/rsvp-summary";
import { RSVPControl } from "@/features/people/components/rsvp-control";
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
  handleUpdateStatus?: (
    id: number,
    status: "confirmed" | "declined" | "maybe",
    token?: string | null
  ) => void;
  handleUpdateGuestCount?: (
    id: number,
    adults: number,
    children: number,
    token?: string | null
  ) => void;
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
  handleUpdateStatus,
  handleUpdateGuestCount,
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
  const [guestTokens, setGuestTokens] = useState<Record<number, string>>({});
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);

  // Load guest tokens on mount
  useEffect(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem("colist_guest_tokens") || "{}");
      setGuestTokens(tokens);
    } catch (e) {
      console.error("Failed to load guest tokens", e);
    }
  }, []);

  const stats = plan.people.reduce(
    (acc, person) => {
      const status = person.status;
      const adults = person.guest_adults || 0;
      const children = person.guest_children || 0;

      if (status === "confirmed") {
        acc.confirmed += 1 + adults + children;
      } else if (status === "declined") acc.declined++;
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
        {/* Simplified RSVP Controls for current identity (Owner or Token Owner) */}
        {!readOnly &&
          handleUpdateStatus &&
          handleUpdateGuestCount &&
          plan.people
            .filter(
              (p) => p.userId === currentUserId || !!guestTokens[p.id] || editingPersonId === p.id
            )
            .map((person) => (
              <RSVPControl
                key={person.id}
                person={person}
                token={guestTokens[person.id]}
                readOnly={readOnly}
                onUpdateStatus={handleUpdateStatus}
                onUpdateGuestCount={handleUpdateGuestCount}
                onAdjust={() => {
                  setEditingPersonId(person.id);
                  // Scroll to card so user sees it
                  setTimeout(() => {
                    document
                      .getElementById(`attendance-card-${person.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 100);
                }}
                onValidated={() => setEditingPersonId(null)}
                isEditing={editingPersonId === person.id}
                variant="card"
              />
            ))}

        <RSVPSummary
          plan={plan}
          selectedPersonId={selectedPerson}
          onSelectPerson={setSelectedPerson}
          onAddPerson={readOnly ? undefined : () => setSheet({ type: "person" })}
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-8">
        {plan.people
          .filter((p) => selectedPerson === null || selectedPerson === p.id)
          .map((person) => {
            const personItems = itemsByPerson[person.id] || [];
            // Show everyone even if they have no items, so they appear in "hero mode"
            const effectiveStatus = person.status;
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
                      {canEdit && handleUpdateStatus && handleUpdateGuestCount && (
                        <RSVPControl
                          person={person}
                          token={guestTokens[person.id]}
                          readOnly={readOnly}
                          onUpdateStatus={handleUpdateStatus}
                          onUpdateGuestCount={handleUpdateGuestCount}
                          onAdjust={() => {
                            setEditingPersonId(person.id);
                            // Scroll to card so user sees it
                            setTimeout(() => {
                              document
                                .getElementById(`attendance-card-${person.id}`)
                                ?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }, 100);
                          }}
                          onValidated={() => setEditingPersonId(null)}
                          variant="inline"
                        />
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
                          onClick={() =>
                            setSheet({
                              type: "person-edit",
                              person,
                              token: guestTokens[person.id] || null,
                            })
                          }
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
