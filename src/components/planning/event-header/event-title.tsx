"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoSizeText } from "@/components/common/auto-size-text";
import { AutoSizeInput } from "@/components/common/auto-size-input";

interface EventTitleProps {
  name: string;
  defaultName: string;
  isScrolled: boolean;
  readOnly: boolean;
  onUpdate: (newName: string) => void;
}

/**
 * EventTitle
 * ----------
 * Editable event title with auto-sizing.
 *
 * Features:
 * - Click to edit (when not readOnly)
 * - Auto-sizes text to fit container
 * - Different max sizes based on scroll state
 * - Pencil icon appears on hover
 *
 * Styling:
 * - White text when not scrolled (over gradient)
 * - Gray text when scrolled (over white header)
 */
export function EventTitle({ name, defaultName, isScrolled, readOnly, onUpdate }: EventTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(name);

  // Sync with external name changes
  useEffect(() => {
    setEditedTitle(name);
  }, [name]);

  const handleSubmit = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== name) {
      onUpdate(trimmedTitle);
    }
    setIsEditing(false);
  };

  const displayName = name || defaultName;
  const maxSize = isScrolled ? 34 : 48;
  const minSize = isScrolled ? 14 : 20;

  // Always use dark text for better contrast on pastel gradient
  const textColorClass = "text-gray-900";

  if (!readOnly && isEditing) {
    return (
      <AutoSizeInput
        autoFocus
        value={editedTitle}
        onChange={(e) => setEditedTitle(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        maxSize={maxSize}
        minSize={14}
        className={cn(
          "bg-transparent font-black tracking-tighter border-none focus-visible:ring-0 transition-colors",
          textColorClass,
          "caret-gray-900"
        )}
      />
    );
  }

  if (!readOnly) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="group flex flex-1 items-center gap-2 text-left"
      >
        <AutoSizeText
          maxSize={maxSize}
          minSize={minSize}
          className={cn("font-black tracking-tighter transition-colors", textColorClass)}
        >
          {displayName}
        </AutoSizeText>
        <Pencil
          size={18}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-400"
        />
      </button>
    );
  }

  return (
    <AutoSizeText
      maxSize={maxSize}
      minSize={minSize}
      className={cn("font-black tracking-tighter transition-colors", textColorClass)}
    >
      {displayName}
    </AutoSizeText>
  );
}
