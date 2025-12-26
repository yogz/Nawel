"use client";

import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { type Item, type Person } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import { Scale, Euro, MessageSquare, ChefHat } from "lucide-react";

export function ItemRow({
  item,
  person,
  onAssign,
  onDelete: _onDelete,
  readOnly,
  allPeopleNames,
}: {
  item: Item;
  person?: Person | null;
  onAssign: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  allPeopleNames?: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 0,
  } as React.CSSProperties;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      whileTap={{ scale: 0.98 }}
      onTap={() => {
        if (!readOnly && !isDragging) {
          onAssign();
        }
      }}
      {...listeners}
      {...attributes}
      className="group mb-2 flex cursor-pointer items-center gap-2 rounded-2xl border border-black/[0.03] bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-accent/10 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:mb-3 sm:gap-3 sm:p-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold text-text transition-colors group-hover:text-accent">
            {item.name}
          </p>
          <div className="shrink-0">
            {person ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign();
                }}
                disabled={readOnly}
                className="bg-accent-soft flex items-center gap-1.5 rounded-full border border-accent/10 px-2.5 py-1 text-xs font-black text-accent transition-all hover:bg-accent hover:text-white active:scale-90"
              >
                <span className="text-sm">
                  {getPersonEmoji(person.name, allPeopleNames, person.emoji)}
                </span>
                <span className="inline-block max-w-[80px] truncate sm:max-w-none">
                  {person.name}
                </span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign();
                }}
                disabled={readOnly}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/20 bg-amber-400 text-lg font-black text-amber-950 shadow-sm transition-all hover:scale-110 active:scale-90"
              >
                ?
              </button>
            )}
          </div>
        </div>

        {(item.quantity ||
          item.note ||
          item.price ||
          (item.ingredients && item.ingredients.length > 0)) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.quantity && (
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-gray-500">
                <Scale size={12} className="text-gray-400" />
                {item.quantity}
              </div>
            )}
            {item.price && (
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-green-600">
                <Euro size={12} className="text-green-500" />
                {item.price.toFixed(2)} €
              </div>
            )}
            {item.note && (
              <div className="flex items-center gap-1 text-[11px] font-bold italic tracking-tight text-gray-500">
                <MessageSquare size={12} className="text-gray-400" />
                <span className="max-w-[150px] truncate">{item.note}</span>
              </div>
            )}
            {item.ingredients && item.ingredients.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-purple-500">
                <ChefHat size={12} className="text-purple-400" />
                {item.ingredients.filter((i) => i.checked).length}/{item.ingredients.length}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
