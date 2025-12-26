"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { AuthModal } from "./auth-modal";
import { LogOut, User as UserIcon, LogIn } from "lucide-react";

export function UserNav() {
  const { data: session, isPending } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

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
      <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white p-1 pr-4 shadow-sm">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "User avatar"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-gray-100"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
            <UserIcon size={16} />
          </div>
        )}
        <span className="max-w-[100px] truncate text-xs font-bold text-gray-700">{user.name}</span>
      </div>
      <button
        onClick={() => signOut()}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm transition-all hover:text-red-500 active:scale-95"
        title="Déconnexion"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
