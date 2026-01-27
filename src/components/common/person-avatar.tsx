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
  rounded?: "full" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-5 w-5 text-xs",
  sm: "h-6 w-6 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-xl",
  xl: "h-14 w-14 text-2xl",
};

const roundedClasses = {
  full: "rounded-full",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

/**
 * Reusable avatar component for displaying person avatars.
 * Handles both emoji and image avatars consistently.
 *
 * @param person - Person object with name, emoji, and optional user data
 * @param allNames - All people names for consistent emoji generation
 * @param size - Avatar size: xs (20px), sm (24px), md (40px), lg (48px), xl (56px)
 * @param rounded - Border radius: full, lg, xl, 2xl
 * @param className - Additional CSS classes
 */
export function PersonAvatar({
  person,
  allNames = [],
  size = "md",
  rounded = "full",
  className,
}: PersonAvatarProps) {
  const { resolvedTheme } = useThemeMode();
  const avatar = renderAvatar(person, allNames, resolvedTheme);
  const displayName = getDisplayName(person);

  const imageSizes = { xs: 20, sm: 24, md: 40, lg: 48, xl: 56 };

  if (avatar.type === "image") {
    return (
      <div
        className={clsx(
          "overflow-hidden bg-gray-100",
          sizeClasses[size],
          roundedClasses[rounded],
          className
        )}
      >
        <Image
          src={avatar.src}
          alt={displayName}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center bg-accent/10",
        sizeClasses[size],
        roundedClasses[rounded],
        className
      )}
    >
      {avatar.value}
    </div>
  );
}
