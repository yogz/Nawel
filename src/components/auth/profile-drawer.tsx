"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../ui/drawer";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { updateUserAction, deleteUserAction } from "@/app/actions/user-actions";
import { Loader2, User, Check, LogOut, X } from "lucide-react";
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
 * Profile settings drawer - Compact version.
 * Features: Avatar emoji picker, 2-theme toggle, compact language selector.
 */
export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending, refetch } = useSession();
  const { theme, setTheme } = useThemeMode();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("Profile");
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
      setShowEmojiPicker(false);
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

  const handleEmojiSelect = (emoji: string | null) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
    handleSaveProfile(name, emoji);
  };

  if (sessionPending || !session) {
    return null;
  }

  const currentEmojis = THEME_EMOJIS[theme] || THEME_EMOJIS.classic;

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

        <div className="scrollbar-none overflow-y-auto pb-8">
          <div className="space-y-5">
            {/* Avatar with Emoji Picker */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {/* Clickable Avatar */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="group relative h-20 w-20 cursor-pointer transition-transform active:scale-95"
                  aria-label="Changer l'emoji"
                >
                  <div className="h-full w-full overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-xl ring-1 ring-gray-100 transition-all group-hover:ring-4 group-hover:ring-accent/20">
                    {(() => {
                      const avatar = renderAvatar(
                        {
                          name: name || session.user.name || "User",
                          emoji: null,
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
                  {/* Edit indicator */}
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-accent text-xs text-white shadow-md transition-transform group-hover:scale-110">
                    ✏️
                  </div>
                </button>

                {/* Emoji Picker - Mobile-friendly bottom sheet style */}
                {showEmojiPicker && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                      onClick={() => setShowEmojiPicker(false)}
                    />
                    {/* Picker */}
                    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4">
                      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                            Choisir un emoji
                          </span>
                          <button
                            onClick={() => setShowEmojiPicker(false)}
                            className="rounded-full bg-gray-100 p-1.5 text-gray-500 transition-colors hover:bg-gray-200 active:scale-95"
                            aria-label="Fermer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {/* Auto/Default option */}
                          <button
                            onClick={() => handleEmojiSelect(null)}
                            className={clsx(
                              "relative flex aspect-square items-center justify-center overflow-hidden rounded-xl text-[9px] font-black uppercase transition-all active:scale-95",
                              selectedEmoji === null
                                ? "bg-accent text-white ring-2 ring-accent/30"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            )}
                            aria-label="Avatar automatique"
                          >
                            {session.user.image ? (
                              <Image
                                src={session.user.image}
                                alt="Photo"
                                fill
                                className={clsx(
                                  "object-cover",
                                  selectedEmoji !== null && "opacity-50 grayscale"
                                )}
                              />
                            ) : (
                              "Auto"
                            )}
                            {selectedEmoji === null && (
                              <div className="absolute inset-0 flex items-center justify-center bg-accent/30">
                                <Check size={14} className="text-white drop-shadow" />
                              </div>
                            )}
                          </button>
                          {/* Emoji options */}
                          {currentEmojis.slice(0, 11).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className={clsx(
                                "flex aspect-square items-center justify-center rounded-xl text-2xl transition-all active:scale-95",
                                selectedEmoji === emoji
                                  ? "bg-accent shadow-md ring-2 ring-accent/30"
                                  : "bg-gray-50 hover:bg-gray-100"
                              )}
                              aria-label={`Sélectionner ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Email & Status */}
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {session.user.email}
                </p>
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
                <div className="pt-1 animate-in fade-in slide-in-from-top-2">
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
            </div>

            {/* Theme Toggle - Compact Segment Control */}
            <div className="flex items-center justify-between rounded-xl bg-gray-50/50 p-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Thème
              </Label>
              <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                <button
                  onClick={() => setTheme("aurora")}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    theme === "aurora"
                      ? "bg-white text-accent shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <span>✨</span>
                  <span>Aurore</span>
                </button>
                <button
                  onClick={() => setTheme("none")}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    theme === "none"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <span>⚫️</span>
                  <span>Classique</span>
                </button>
              </div>
            </div>

            {/* Language Selector - Compact Inline */}
            <div className="flex items-center justify-between rounded-xl bg-gray-50/50 p-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Langue
              </Label>
              <LanguageSelector variant="compact" showSearch={true} />
            </div>

            {/* Status Messages */}
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-2">
                <p>{error}</p>
              </div>
            )}

            {/* Actions */}
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

              {/* Danger Zone - In-Place Reveal */}
              <div className="pt-2">
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
      </DrawerContent>
    </Drawer>
  );
}
