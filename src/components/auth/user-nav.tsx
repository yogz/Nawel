"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthModal } from "./auth-modal";
import { ProfileDrawer } from "./profile-drawer";
import { LogIn } from "lucide-react";
import { renderAvatar } from "@/lib/utils";
import { useThemeMode } from "../theme-provider";

export function UserNav() {
  const { theme } = useThemeMode();
  const { data: session, isPending } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  if (isPending) {
    return <div className="h-full w-full animate-pulse bg-gray-100" />;
  }

  if (!session) {
    return (
      <>
        <Button
          variant="premium"
          size="premium"
          onClick={() => setShowAuthModal(true)}
          icon={<LogIn size={16} />}
          className="h-10 w-10 rounded-full p-0"
        />
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const user = session.user;

  return (
    <>
      <button
        onClick={() => setShowProfileDrawer(true)}
        className="group relative h-full w-full overflow-hidden transition-all hover:opacity-90 active:scale-95"
      >
        {(() => {
          const avatar = renderAvatar(
            {
              name: user.name || "User",
              emoji: (user as any).emoji || null,
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
                className="object-cover transition-transform group-hover:scale-110"
              />
            );
          }

          return (
            <div className="flex h-full w-full items-center justify-center bg-accent/10 text-xl text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-white">
              {avatar.value}
            </div>
          );
        })()}
      </button>

      <ProfileDrawer open={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
    </>
  );
}
