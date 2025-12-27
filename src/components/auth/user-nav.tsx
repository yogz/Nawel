"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { AuthModal } from "./auth-modal";
import { ProfileDrawer } from "./profile-drawer";
import { User as UserIcon, LogIn } from "lucide-react";

export function UserNav() {
  const { data: session, isPending } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  if (isPending) {
    return <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />;
  }

  if (!session) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          <LogIn size={16} />
          Se connecter
        </button>
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const user = session.user;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowProfileDrawer(true)}
        className="group relative h-9 w-9 overflow-hidden rounded-full border border-gray-200 shadow-sm transition-all hover:border-accent hover:shadow-md active:scale-95"
      >
        {user.image ? (
          <Image src={user.image} alt={user.name || "User avatar"} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-500 transition-colors group-hover:bg-accent/10 group-hover:text-accent">
            <UserIcon size={18} />
          </div>
        )}
      </button>

      <ProfileDrawer open={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
    </div>
  );
}
