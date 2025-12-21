"use client";

import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Item, Person } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";

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
      className="mb-2 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.03] cursor-pointer"
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
                <span className="text-sm">{getPersonEmoji(person.name, allPeopleNames)}</span>
                {person.name}
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                disabled={readOnly}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-amber-950 border border-amber-500/20 shadow-sm transition-transform active:scale-90 font-bold text-lg"
              >
                ?
              </button>
            )}
          </div>
          {(item.quantity || item.note || item.price) && (
            <p className="mt-1 text-sm text-gray-600">
              {[
                item.quantity,
                item.price ? `${item.price.toFixed(2)} €` : null,
                item.note
              ].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
    </motion.div>
  );
}
