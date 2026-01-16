"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthModal } from "./auth-modal";
import { ProfileDrawer } from "./profile-drawer";
import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { renderAvatar, cn } from "@/lib/utils";
import { useThemeMode } from "../theme-provider";

interface UserNavProps {
  showLabel?: boolean;
}

export function UserNav({ showLabel }: UserNavProps) {
  const { theme } = useThemeMode();
  const { data: session, isPending } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Login");
  const tDashboard = useTranslations("Dashboard.TabBar");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <div className="h-full w-full animate-pulse bg-gray-100" />;
  }

  if (!session) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className={cn(
            "group flex h-10 items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95",
            showLabel
              ? "rounded-full bg-white/60 pl-1 pr-4 shadow-lg shadow-accent/10 sm:pr-5"
              : "w-10 rounded-full"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-md transition-all group-hover:scale-110">
            <LogIn size={14} />
          </div>
          {showLabel && (
            <span className="text-xs font-black uppercase tracking-widest text-accent">
              {t("signinButton")}
            </span>
          )}
        </button>
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const user = session.user;

  return (
    <>
      <button
        id="user-nav-avatar"
        onClick={() => setShowProfileDrawer(true)}
        className={cn(
          "group flex h-10 items-center gap-2 transition-all hover:opacity-90 active:scale-95",
          showLabel ? "rounded-full pl-1 pr-4 shadow-lg shadow-accent/10 sm:pr-5" : "w-10"
        )}
        style={
          showLabel
            ? {
                background: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }
            : undefined
        }
      >
        <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/50 shadow-sm transition-all group-hover:scale-110">
          {(() => {
            const avatar = renderAvatar(
              {
                name: user.name || "User",
                emoji: (user as { emoji?: string | null }).emoji || null,
                user: user,
              },
              [],
              theme
            );

            if (avatar.type === "image") {
              return (
                <Image
                  src={avatar.src}
                  alt={user.name || "User avatar"}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              );
            }

            return (
              <div className="flex h-full w-full items-center justify-center bg-accent/10 text-lg text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-white">
                {avatar.value}
              </div>
            );
          })()}
        </div>
        {showLabel && (
          <span className="max-w-[100px] truncate text-[11px] font-black uppercase tracking-wider text-accent sm:max-w-[150px]">
            {user.name || "Profil"}
          </span>
        )}
      </button>

      <ProfileDrawer open={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
    </>
  );
}
