"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Minus, Plus, Users, HelpCircle, CircleDashed } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { type Person } from "@/lib/types";
import { getDisplayName } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RSVPControlProps {
  person: Person;
  token?: string | null;
  readOnly?: boolean;
  onUpdateStatus: (
    id: number,
    status: "confirmed" | "declined" | "maybe",
    token?: string | null
  ) => void;
  onUpdateGuestCount: (id: number, adults: number, children: number, token?: string | null) => void;
  variant?: "card" | "inline";
}

export function RSVPControl({
  person,
  token,
  readOnly,
  onUpdateStatus,
  onUpdateGuestCount,
  variant = "card",
}: RSVPControlProps) {
  const t = useTranslations("EventDashboard.People");
  const [isEditing, setIsEditing] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null);

  const effectiveStatus = person.status;
  const currentCounts = {
    guestAdults: person.guest_adults,
    guestChildren: person.guest_children,
  };

  const displayAdults = 1 + currentCounts.guestAdults;
  const displayChildren = currentCounts.guestChildren;

  const handleStatusChange = (status: "confirmed" | "declined" | "maybe") => {
    onUpdateStatus(person.id, status, token);
    setOpenPopoverId(null);
    if (status === "confirmed") {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleCountChange = (type: "adults" | "children", delta: number) => {
    const adults =
      type === "adults"
        ? Math.max(0, currentCounts.guestAdults + delta)
        : currentCounts.guestAdults;
    const children =
      type === "children"
        ? Math.max(0, currentCounts.guestChildren + delta)
        : currentCounts.guestChildren;
    onUpdateGuestCount(person.id, adults, children, token);
  };

  if (variant === "inline") {
    return (
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
            {effectiveStatus === "confirmed" && <Check size={12} strokeWidth={3} />}
            {effectiveStatus === "declined" && <X size={12} strokeWidth={3} />}
            {effectiveStatus === "maybe" && <HelpCircle size={12} strokeWidth={3} />}
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
            {effectiveStatus === "confirmed" && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setOpenPopoverId(null);
                }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Users size={10} strokeWidth={3} />
                </div>
                {t("adjust")}
              </button>
            )}
            <button
              onClick={() => handleStatusChange("confirmed")}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check size={10} strokeWidth={3} />
              </div>
              {t("present")}
            </button>
            <button
              onClick={() => handleStatusChange("maybe")}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <HelpCircle size={10} strokeWidth={3} />
              </div>
              {t("maybe")}
            </button>
            <button
              onClick={() => handleStatusChange("declined")}
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
    );
  }

  // Card variant (default)
  if (effectiveStatus === "declined") return null;
  if (effectiveStatus === "confirmed" && !isEditing) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-white to-purple-50 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {getDisplayName(person)},{" "}
              {effectiveStatus === "confirmed" ? t("howMany") : t("areYouComing")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {effectiveStatus === "confirmed" ? t("adjustCounts") : t("confirmPresence")}
            </p>
          </div>

          {effectiveStatus !== "confirmed" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange("confirmed")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <button
                onClick={() => handleStatusChange("declined")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 transition-colors hover:bg-red-200"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        {effectiveStatus === "confirmed" && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-center">
                  Adultes
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCountChange("adults", -1)}
                    disabled={displayAdults <= 1}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm disabled:opacity-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-lg font-bold text-gray-900 w-4 text-center">
                    {displayAdults}
                  </span>
                  <button
                    onClick={() => handleCountChange("adults", 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-center">
                  Enfants
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCountChange("children", -1)}
                    disabled={displayChildren <= 0}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm disabled:opacity-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-lg font-bold text-gray-900 w-4 text-center">
                    {displayChildren}
                  </span>
                  <button
                    onClick={() => handleCountChange("children", 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(false)}
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-gray-800 transition-all"
            >
              {t("validate")}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
