"use client";

import { useState, useMemo, useCallback } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";
import { type PlanData, type Service } from "@/lib/types";
import { QuickListInput, QuickListItem } from "../common/quick-list-input";
import { createItemAction, deleteItemAction } from "@/app/actions";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useTranslatedServiceTitle } from "@/hooks/use-translated-service-title";

interface QuickAddPageProps {
  initialPlan: PlanData;
  slug: string;
  writeKey?: string;
  writeEnabled: boolean;
  initialServiceId?: number;
}

function ServiceSelector({
  services,
  selectedId,
  onSelect,
}: {
  services: Service[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedService = services.find((s) => s.id === selectedId);
  const translatedTitle = useTranslatedServiceTitle(selectedService?.title || "");

  if (services.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{selectedService?.icon}</span>
        <span className="font-semibold text-gray-900">{translatedTitle}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 transition-colors hover:bg-white/80"
      >
        <span className="text-lg">{selectedService?.icon}</span>
        <span className="font-semibold text-gray-900">{translatedTitle}</span>
        <ChevronDown
          size={16}
          className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
            {services.map((service) => (
              <ServiceOption
                key={service.id}
                service={service}
                isSelected={service.id === selectedId}
                onSelect={() => {
                  onSelect(service.id);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ServiceOption({
  service,
  isSelected,
  onSelect,
}: {
  service: Service;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const translatedTitle = useTranslatedServiceTitle(service.title);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        isSelected ? "bg-accent/10 text-accent" : "hover:bg-gray-50"
      )}
    >
      <span className="text-lg">{service.icon}</span>
      <span className="flex-1 font-medium">{translatedTitle}</span>
      {isSelected && <Check size={16} />}
    </button>
  );
}

export function QuickAddPage({
  initialPlan,
  slug,
  writeKey,
  writeEnabled,
  initialServiceId,
}: QuickAddPageProps) {
  const t = useTranslations("EventDashboard.Organizer");
  const tShared = useTranslations("EventDashboard.Shared");
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [pendingItems, setPendingItems] = useState<QuickListItem[]>([]);

  // Get all services from all meals
  const allServices = useMemo(() => {
    return plan.meals.flatMap((m) => m.services);
  }, [plan.meals]);

  // Find initial service or default to first available
  const [selectedServiceId, setSelectedServiceId] = useState(() => {
    if (initialServiceId && allServices.some((s) => s.id === initialServiceId)) {
      return initialServiceId;
    }
    return allServices[0]?.id || 0;
  });

  const selectedService = allServices.find((s) => s.id === selectedServiceId);

  // Build items list for the selected service
  const existingItems: QuickListItem[] = useMemo(() => {
    if (!selectedService) return [];
    return [...selectedService.items].reverse().map((item) => ({
      id: item.id,
      name: item.name,
    }));
  }, [selectedService]);

  // Count occurrences by name in existing items
  const existingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of existingItems) {
      const key = item.name.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [existingItems]);

  // Filter pending items: keep only those not yet confirmed by backend
  const filteredPending = useMemo(() => {
    const pendingCounts = new Map<string, number>();
    return pendingItems.filter((item) => {
      const key = item.name.toLowerCase();
      const existingCount = existingCounts.get(key) || 0;
      const alreadyUsed = pendingCounts.get(key) || 0;

      if (alreadyUsed < existingCount) {
        pendingCounts.set(key, alreadyUsed + 1);
        return false;
      }
      return true;
    });
  }, [pendingItems, existingCounts]);

  // Combine: pending first (newest), then existing
  const allItems = useMemo(
    () => [...filteredPending, ...existingItems],
    [filteredPending, existingItems]
  );

  const placeholder = selectedService?.title
    ? t("quickAddPlaceholderService", { service: selectedService.title })
    : t("quickAddPlaceholder");

  const handleAdd = useCallback(
    async (name: string) => {
      if (!selectedServiceId) return;

      // Optimistic UI update
      setPendingItems((prev) => [{ name, isNew: true }, ...prev]);

      // Backend update
      const result = await createItemAction({
        name,
        serviceId: selectedServiceId,
        quantity: "1",
        slug,
        key: writeKey,
      });

      if (result) {
        // Update local plan state with the new item
        setPlan((prev) => ({
          ...prev,
          meals: prev.meals.map((meal) => ({
            ...meal,
            services: meal.services.map((service) => {
              if (service.id === selectedServiceId) {
                return {
                  ...service,
                  items: [...service.items, { ...result, ingredients: [] }],
                };
              }
              return service;
            }),
          })),
        }));
      }
    },
    [selectedServiceId, slug, writeKey]
  );

  const handleRemove = useCallback(
    async (item: QuickListItem, index: number) => {
      if (item.id) {
        // Optimistic UI: remove from local state immediately
        setPlan((prev) => ({
          ...prev,
          meals: prev.meals.map((meal) => ({
            ...meal,
            services: meal.services.map((service) => {
              if (service.id === selectedServiceId) {
                return {
                  ...service,
                  items: service.items.filter((i) => i.id !== item.id),
                };
              }
              return service;
            }),
          })),
        }));

        // Backend delete
        await deleteItemAction({
          id: item.id,
          slug,
          key: writeKey,
        });
      } else {
        // Pending item - remove from local state
        setPendingItems((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [selectedServiceId, slug, writeKey]
  );

  const backUrl = writeKey ? `/event/${slug}?key=${writeKey}` : `/event/${slug}`;

  if (!selectedService || allServices.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-gray-500">{t("quickAddEmptyTitle")}</p>
        <Link href={backUrl} className="mt-4 text-accent hover:underline">
          {tShared("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ paddingTop: `max(0.75rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))` }}
      >
        <button
          onClick={() => router.push(backUrl)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          aria-label={tShared("back")}
        >
          <ArrowLeft size={20} />
        </button>
        <ServiceSelector
          services={allServices}
          selectedId={selectedServiceId}
          onSelect={setSelectedServiceId}
        />
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Item count */}
      <div className="border-b bg-gray-50/50 px-4 py-2">
        <p className="text-center text-xs font-black uppercase tracking-widest text-gray-500">
          {allItems.length} {tShared("items")}
        </p>
      </div>

      {/* Quick List Input */}
      <div className="flex-1 overflow-hidden">
        <QuickListInput
          items={allItems}
          onAdd={handleAdd}
          onRemove={handleRemove}
          placeholder={placeholder}
          className="h-full"
          hideCount
        />
      </div>
    </div>
  );
}
