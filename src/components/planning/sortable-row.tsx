"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode } from "react";

export function SortableRow({
  id,
  children,
}: {
  id: number;
  children: (attributes: any, listeners: any) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="touch-pan-y">
      {children(attributes, listeners)}
    </div>
  );
}
