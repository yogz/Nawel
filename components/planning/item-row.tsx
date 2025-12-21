"use client";

import { motion, useMotionValue } from "framer-motion";
import { useEffect } from "react";
import { UserRound } from "lucide-react";
import { Item, Person } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";

export function ItemRow({
  item,
  person,
  onAssign,
  onDelete,
  readOnly,
  dragHandle,
}: {
  item: Item;
  person?: Person | null;
  onAssign: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  dragHandle?: React.ReactNode;
}) {
  const x = useMotionValue(0);

  useEffect(() => {
    const unsubscribe = x.on("change", (value) => {
      if (value < -120) {
        onDelete();
      }
    });
    return () => unsubscribe();
  }, [onDelete, x]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 right-2 z-0 flex items-center gap-2 text-sm">
        <button
          onClick={onAssign}
          disabled={readOnly}
          className="rounded-full bg-accent-soft px-3 py-1 text-accent shadow-sm"
        >
          Choisir
        </button>
        <button
          onClick={onDelete}
          disabled={readOnly}
          className="rounded-full bg-red-100 px-3 py-1 text-red-600 shadow-sm"
        >
          Supprimer
        </button>
      </div>
      <motion.div
        drag={!readOnly ? "x" : false}
        dragConstraints={{ left: -140, right: 0 }}
        style={{ x }}
        whileTap={{ scale: 0.98 }}
        className="relative z-10 mb-2 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.03]"
      >
        {dragHandle}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">{item.name}</p>
            {person ? (
              <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent border border-accent/10">
                <span className="text-sm">{getPersonEmoji(person.name)}</span>
                {person.name}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 border border-amber-200 shadow-sm">
                À prévoir ✨
              </span>
            )}
          </div>
          {(item.quantity || item.note) && (
            <p className="mt-1 text-sm text-gray-600">
              {[item.quantity, item.note].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
