"use client";

import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Item, Person } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import { Scale, Euro, MessageSquare } from "lucide-react";

export function ItemRow({
  item,
  person,
  onAssign,
  onDelete,
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
      className="mb-2 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.03] cursor-pointer group hover:border-accent/10 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-200"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold text-text truncate group-hover:text-accent transition-colors">
            {item.name}
          </p>
          <div className="shrink-0">
            {person ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                disabled={readOnly}
                className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-black text-accent border border-accent/10 transition-all active:scale-90 hover:bg-accent hover:text-white"
              >
                <span className="text-sm">{getPersonEmoji(person.name, allPeopleNames, person.emoji)}</span>
                <span className="hidden sm:inline">{person.name}</span>
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                disabled={readOnly}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-amber-950 border border-amber-500/20 shadow-sm transition-all active:scale-90 hover:scale-110 font-black text-lg"
              >
                ?
              </button>
            )}
          </div>
        </div>

        {(item.quantity || item.note || item.price) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.quantity && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                <Scale size={12} className="text-gray-400" />
                {item.quantity}
              </div>
            )}
            {item.price && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-green-600 uppercase tracking-tight">
                <Euro size={12} className="text-green-500" />
                {item.price.toFixed(2)} €
              </div>
            )}
            {item.note && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 italic tracking-tight">
                <MessageSquare size={12} className="text-gray-400" />
                <span className="truncate max-w-[150px]">{item.note}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
