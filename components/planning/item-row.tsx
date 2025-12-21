"use client";

import { motion, useMotionValue } from "framer-motion";
import { useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { UserRound } from "lucide-react";
import { Item, Person } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";

export function ItemRow({
  item,
  person,
  onAssign,
  onDelete,
  readOnly,
}: {
  item: Item;
  person?: Person | null;
  onAssign: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const x = useMotionValue(0);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

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
          onClick={onDelete}
          disabled={readOnly}
          className="rounded-full bg-red-100 px-3 py-1 text-red-600 shadow-sm"
        >
          Supprimer
        </button>
      </div>
      <motion.div
        ref={setNodeRef}
        drag={!readOnly ? "x" : false}
        dragConstraints={{ left: -100, right: 0 }}
        style={{ ...style, x }}
        whileTap={{ scale: 0.98 }}
        onTap={() => {
          if (!readOnly && !isDragging) {
            onAssign();
          }
        }}
        {...listeners}
        {...attributes}
        className="relative z-10 mb-2 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.03] cursor-pointer"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">{item.name}</p>
            {person ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                disabled={readOnly}
                className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent border border-accent/10 transition-transform active:scale-90"
              >
                <span className="text-sm">{getPersonEmoji(person.name)}</span>
                {person.name}
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                disabled={readOnly}
                className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950 border border-amber-500/20 shadow-sm transition-transform active:scale-90"
              >
                Sélectionner ✨
              </button>
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
