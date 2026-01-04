"use client";

import Image from "next/image";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { useThemeMode } from "@/components/theme-provider";
import clsx from "clsx";

interface PersonAvatarProps {
  person: {
    name: string;
    emoji?: string | null;
    user?: { image?: string | null; emoji?: string | null } | null;
  };
  allNames?: string[];
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-4 w-4 text-[10px]",
  sm: "h-6 w-6 text-xs",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-xl",
  xl: "h-14 w-14 text-2xl",
};

/**
 * Reusable avatar component for displaying person avatars.
 * Handles both emoji and image avatars consistently.
 */
export function PersonAvatar({ person, allNames = [], size = "md", className }: PersonAvatarProps) {
  const { theme } = useThemeMode();
  const avatar = renderAvatar(person, allNames, theme);
  const displayName = getDisplayName(person);

  if (avatar.type === "image") {
    return (
      <div
        className={clsx("overflow-hidden rounded-full bg-gray-100", sizeClasses[size], className)}
      >
        <Image
          src={avatar.src}
          alt={displayName}
          width={
            size === "xl" ? 56 : size === "lg" ? 48 : size === "md" ? 40 : size === "sm" ? 24 : 16
          }
          height={
            size === "xl" ? 56 : size === "lg" ? 48 : size === "md" ? 40 : size === "sm" ? 24 : 16
          }
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full bg-accent/10",
        sizeClasses[size],
        className
      )}
    >
      {avatar.value}
    </div>
  );
}
