"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../ui/drawer";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { updateUserAction, deleteUserAction } from "@/app/actions/user-actions";
import { Loader2, User, Sparkles, Check, LogOut, Globe, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useThemeMode } from "../theme-provider";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { THEME_EMOJIS, renderAvatar } from "@/lib/utils";
import { LanguageSelector } from "../common/language-selector";
import { DangerZoneTrigger, DangerZoneContent } from "../common/danger-zone";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Profile settings drawer.
 * Restricted to name editing and account deletion (RGPD).
 */
export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending, refetch } = useSession();
  const { theme, setTheme, themes } = useThemeMode();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("Profile");
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state with session when drawer opens
  useEffect(() => {
    if (session?.user && open) {
      setName(session.user.name || "");
      setSelectedEmoji((session.user as any).emoji || null);
      setError(null);
      setSuccess(false);
      setShowAdvanced(false);
    }
  }, [session, open]);

  const handleSaveProfile = async (newName?: string, newEmoji?: string | null) => {
    if (!session?.user) {
      return;
    }

    const finalName = newName ?? name;
    const finalEmoji = newEmoji !== undefined ? newEmoji : selectedEmoji;

    if (!finalName.trim()) {
      return;
    }

    // Check if anything actually changed
    const hasChanged =
      finalName !== (session.user.name || "") ||
      finalEmoji !== ((session.user as any).emoji || null);

    if (!hasChanged) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUserAction({
        name: finalName,
        emoji: finalEmoji,
      });
      await refetch();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteUserAction({ confirm: true });
      // Sign out and redirect to home
      await signOut();
      onClose();
      router.push("/");
      router.refresh();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erreur lors de la suppression du compte.");
      setIsDeleting(false);
    }
  };

  if (sessionPending || !session) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle>{tProfile("settings")}</DrawerTitle>
            <DrawerClose asChild>
              <button
                className="rounded-full bg-gray-50 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 active:scale-95"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="scrollbar-none h-full overflow-y-auto">
          <div className="space-y-4 pb-8 pt-4">
            <div className="space-y-4">
              {/* Avatar Display (Read Only) */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative h-20 w-20">
                  <div className="h-full w-full overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-xl ring-1 ring-gray-100">
                    {(() => {
                      const avatar = renderAvatar(
                        {
                          name: name || session.user.name || "User",
                          emoji: null, // We want the user-level emoji/image
                          user: { ...session.user, emoji: selectedEmoji },
                        },
                        [],
                        theme
                      );

                      if (avatar.type === "image") {
                        return (
                          <Image
                            src={avatar.src}
                            alt={name}
                            width={80}
                            height={80}
                            className="h-full w-full object-cover"
                          />
                        );
                      }
                      return (
                        <div className="flex h-full w-full items-center justify-center bg-accent/10 text-4xl">
                          {avatar.value}
                        </div>
                      );
                    })()}
                  </div>
                  {session.user.image && (
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-green-500 text-[10px] shadow-sm">
                      📸
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {session.user.email}
                  </p>
                  {!session.user.image && (
                    <p className="mt-2 flex items-center justify-center gap-1.5 px-4 text-center text-[9px] font-medium leading-relaxed text-gray-500">
                      <Sparkles size={10} className="shrink-0 text-accent" />
                      <span>
                        {selectedEmoji
                          ? "Personnalisé avec votre emoji."
                          : session.user.image
                            ? "Utilisation de votre photo Google."
                            : "Connectez-vous avec Google pour récupérer votre photo de profil."}
                      </span>
                    </p>
                  )}
                  {/* Auto-save status indicator */}
                  <div className="mt-1 h-4">
                    {isSubmitting && (
                      <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-accent">
                        <Loader2 size={10} className="animate-spin" />
                        <span>Enregistrement...</span>
                      </div>
                    )}
                    {success && (
                      <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-green-500">
                        <Check size={10} />
                        <span>Synchronisé</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="profile-name"
                    className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
                  >
                    Nom complet
                  </Label>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 transition-colors group-focus-within:text-black">
                      <User size={18} />
                    </div>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveProfile();
                        }
                      }}
                      placeholder="Ex: Jean Dupont"
                      className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10 font-medium transition-all focus:bg-white"
                      required
                    />
                  </div>
                  {name !== (session.user.name || "") && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <Button
                        variant="premium"
                        className="h-10 w-full"
                        onClick={() => handleSaveProfile()}
                        disabled={isSubmitting || !name.trim()}
                        icon={isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
                        shine
                      >
                        <span className="text-xs font-black uppercase tracking-widest text-gray-700">
                          {tCommon("save") || "Enregistrer"}
                        </span>
                      </Button>
                    </div>
                  )}
                  {/* Emoji Selection */}
                  <div className="space-y-3">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Votre Emoji
                    </Label>
                    <div className="no-scrollbar grid max-h-40 grid-cols-6 gap-1.5 overflow-y-auto rounded-2xl border border-gray-100/50 bg-gray-50/50 p-2">
                      <button
                        onClick={() => {
                          setSelectedEmoji(null);
                          handleSaveProfile(name, null);
                        }}
                        className={clsx(
                          "relative flex aspect-square items-center justify-center overflow-hidden rounded-xl text-[9px] font-black uppercase tracking-tight transition-all",
                          selectedEmoji === null
                            ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                            : "bg-white text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {session.user.image ? (
                          <Image
                            src={session.user.image}
                            alt="Profile"
                            fill
                            className={clsx(
                              "object-cover",
                              selectedEmoji !== null && "opacity-40 grayscale"
                            )}
                          />
                        ) : (
                          "Auto"
                        )}
                        {selectedEmoji === null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-accent/20">
                            <Check size={16} className="text-white drop-shadow-md" />
                          </div>
                        )}
                      </button>
                      {(THEME_EMOJIS[theme] || THEME_EMOJIS.classic).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setSelectedEmoji(emoji);
                            handleSaveProfile(name, emoji);
                          }}
                          className={clsx(
                            "flex aspect-square items-center justify-center rounded-xl text-lg transition-all",
                            selectedEmoji === emoji
                              ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                              : "bg-white shadow-sm hover:bg-gray-100"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {session.user.image && (
                      <p className="px-1 text-[9px] italic text-gray-400">
                        Note: Sélectionnez votre photo ou un emoji pour votre profil.
                      </p>
                    )}
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="space-y-3">
                  <Label className="ml-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Sparkles size={12} />
                    Ambiance
                  </Label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {themes.map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={clsx(
                            "flex items-center justify-between rounded-xl border-2 p-2.5 transition-all active:scale-[0.98]",
                            isSelected
                              ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                              : "border-gray-50 bg-white hover:border-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={clsx(
                                "flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-all duration-300",
                                isSelected
                                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                                  : "bg-gray-100"
                              )}
                            >
                              {t.emoji}
                            </div>
                            <div className="text-left">
                              <p
                                className={clsx(
                                  "text-xs font-black uppercase tracking-widest",
                                  isSelected ? "text-accent" : "text-gray-700"
                                )}
                              >
                                {t.label}
                              </p>
                              <p className="mt-0.5 text-[10px] font-bold text-gray-400">
                                {t.description}
                              </p>
                            </div>
                          </div>
                          <div
                            className={clsx(
                              "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                              isSelected ? "border-accent bg-accent" : "border-gray-200 bg-white"
                            )}
                          >
                            {isSelected && (
                              <div className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selection */}
                <div className="space-y-3">
                  <Label className="ml-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Globe size={12} />
                    {tCommon("languages.fr") ? "Langue" : "Language"}
                  </Label>
                  <LanguageSelector variant="grid" showSearch={true} />
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-2">
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  variant="premium"
                  className="w-full border-gray-100 bg-gray-50/50"
                  icon={<LogOut size={16} />}
                  iconClassName="bg-gray-200 text-gray-500 group-hover:bg-red-500 group-hover:text-white"
                  onClick={async () => {
                    await signOut();
                    onClose();
                    router.refresh();
                  }}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-600">
                    Se déconnecter
                  </span>
                </Button>

                {/* Danger Zone / Advanced View - In-Place Reveal */}
                <div className="pt-4">
                  {!showAdvanced ? (
                    <DangerZoneTrigger
                      onClick={() => setShowAdvanced(true)}
                      className="bg-transparent opacity-60 hover:bg-red-50 hover:opacity-100"
                    />
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                      <DangerZoneContent
                        onDelete={handleDeleteAccount}
                        onCancel={() => setShowAdvanced(false)}
                        isDeleting={isDeleting}
                        title={tProfile("dangerZone")}
                        warningMessage="Attention : Cette action est irréversible. Toutes vos données seront supprimées."
                        deleteButtonLabel={tProfile("confirmDelete")}
                        cancelButtonLabel={tCommon("cancel") || "Annuler"}
                        confirmationConfig={{
                          title: tProfile("deleteAccount"),
                          description: tProfile("deleteWarning"),
                          confirmLabel: tProfile("confirmDelete"),
                          cancelLabel: tCommon("cancel") || "Annuler",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
