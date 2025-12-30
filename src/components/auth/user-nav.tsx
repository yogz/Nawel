"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthModal } from "./auth-modal";
import { ProfileDrawer } from "./profile-drawer";
import { User as UserIcon, LogIn, Settings } from "lucide-react";
import { getPersonEmoji } from "@/lib/utils";
import { useThemeMode } from "../theme-provider";

export function UserNav() {
  const { theme } = useThemeMode();
  const { data: session, isPending } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  if (isPending) {
    return <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />;
  }

  if (!session) {
    return (
      <>
        <Button
          variant="premium"
          size="premium"
          onClick={() => setShowAuthModal(true)}
          icon={<LogIn size={16} />}
        >
          <span className="text-xs font-bold text-gray-700">Se connecter</span>
        </Button>
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const user = session.user;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowProfileDrawer(true)}
        className="group flex items-center gap-2 rounded-full border border-transparent bg-white p-1 pr-4 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-gray-300 active:scale-95"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "User avatar"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-gray-100 object-cover transition-colors group-hover:border-accent"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xl transition-all duration-300 group-hover:bg-accent group-hover:text-white">
            {getPersonEmoji(user.name || "User", [], (user as any).emoji, theme)}
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className="max-w-[100px] truncate text-xs font-bold leading-tight text-gray-700">
            {user.name}
          </span>
          <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase leading-tight tracking-widest text-gray-400 transition-colors group-hover:text-black">
            <Settings size={8} className="stroke-[3]" /> Profil
          </span>
        </div>
      </button>

      <ProfileDrawer open={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
    </div>
  );
}
