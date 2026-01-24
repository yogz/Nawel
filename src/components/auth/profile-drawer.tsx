"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { updateUserAction, deleteUserAction } from "@/app/actions/user-actions";
import { Loader2, User, Check, LogOut, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useThemeMode } from "../theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { THEME_EMOJIS, renderAvatar } from "@/lib/utils";
import { LanguageSelector } from "../common/language-selector";
import { DangerZoneTrigger, DangerZoneContent } from "../common/destructive-actions";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Extended user type with custom emoji field from Better Auth */
interface UserWithEmoji {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emoji?: string | null;
}

/**
 * Profile settings drawer - Compact version.
 * Features: Avatar emoji picker, 2-theme toggle, compact language selector.
 */
export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  // All hooks must be called unconditionally and in the same order
  const router = useRouter();
  const { data: session, isPending: sessionPending, refetch } = useSession();
  const { theme, setTheme } = useThemeMode();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("Profile");
  const t = useTranslations("Translations");
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
      const user = session.user as UserWithEmoji;
      setName(user.name || "");
      setSelectedEmoji(user.emoji || null);
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
    const user = session.user as UserWithEmoji;
    const hasChanged = finalName !== (user.name || "") || finalEmoji !== (user.emoji || null);

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
      router.push("/login");
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

  const currentEmojis = THEME_EMOJIS[theme] || THEME_EMOJIS.classic;

  // Early return after all hooks - but only if drawer is not open
  // This prevents rendering when session is not ready, but keeps hooks consistent
  if (!open || sessionPending || !session) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 pb-3 text-left">
          <DrawerTitle className="sr-only">{tProfile("settings")}</DrawerTitle>
        </DrawerHeader>

        <div className="scrollbar-none min-h-[60vh] flex-1 overflow-y-auto pb-40">
          <div className="space-y-6">
            {/* Centered Header Section matching ShareModal */}
            <div className="text-center pt-2">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="relative mx-auto mb-4"
              >
                {/* Clickable Avatar with Popover */}
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <button
                      className="group relative mx-auto flex h-20 w-20 cursor-pointer items-center justify-center rounded-[22px] bg-gradient-to-br from-accent to-accent/80 transition-transform active:scale-95 shadow-xl shadow-accent/20"
                      aria-label={t("profile.changeEmoji")}
                    >
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] text-3xl text-white">
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
                            <div className="flex h-full w-full items-center justify-center text-4xl">
                              {avatar.value}
                            </div>
                          );
                        })()}
                      </div>
                      {/* Edit indicator - darker text for contrast if needed, but white on accent is fine */}
                      <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white text-[12px] shadow-md transition-transform group-hover:scale-110">
                        ✏️
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="center" sideOffset={8}>
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase tracking-widest text-gray-500">
                        {t("profile.chooseEmoji")}
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
                          aria-label={t("profile.autoAvatar")}
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
                        {currentEmojis.slice(0, 17).map((emoji) => (
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
                  </PopoverContent>
                </Popover>
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-xl font-black leading-none tracking-tight text-foreground/90">
                  {tProfile("settings")}
                </h3>
                <p className="mx-auto mt-3 max-w-[280px] text-sm font-medium leading-relaxed text-muted-foreground">
                  {session.user.email}
                </p>

                <div className="mt-2 h-4">
                  {isSubmitting && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-accent">
                      <Loader2 size={12} className="animate-spin" />
                      <span>{t("profile.updateLoading")}</span>
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-green-500">
                      <Check size={12} />
                      <span>{t("profile.synchronized")}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Content Sections */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {/* Name Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="profile-name"
                  className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-500"
                >
                  {t("profile.fullName")}
                </Label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60 transition-colors group-focus-within:text-accent">
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
                    placeholder={t("profile.exampleName")}
                    className="h-14 rounded-2xl border-black/5 bg-black/5 pl-10 text-lg font-bold text-foreground placeholder:text-muted-foreground/50 transition-all focus:bg-white focus:ring-accent/20 focus:border-accent/30"
                    required
                  />
                </div>
                {name !== (session.user.name || "") && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                    <Button
                      className="h-14 w-full rounded-2xl bg-accent text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 active:scale-95"
                      onClick={() => handleSaveProfile()}
                      disabled={isSubmitting || !name.trim()}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 animate-spin" />
                      ) : (
                        <Check className="mr-2" size={20} />
                      )}
                      <span className="text-lg font-black text-white">
                        {tCommon("save") || "Enregistrer"}
                      </span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <div className="space-y-2">
                <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-500">
                  {t("profile.theme")}
                </Label>
                <div className="flex gap-2 rounded-2xl bg-black/5 p-1.5 ring-1 ring-black/5">
                  <button
                    onClick={() => setTheme("aurora")}
                    className={clsx(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all",
                      theme === "aurora"
                        ? "bg-white text-accent shadow-sm"
                        : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    )}
                  >
                    <span>✨</span>
                    <span>Aurore</span>
                  </button>
                  <button
                    onClick={() => setTheme("none")}
                    className={clsx(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all",
                      theme === "none"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    )}
                  >
                    <span>⚫️</span>
                    <span>Classique</span>
                  </button>
                </div>
              </div>

              {/* Language Selector */}
              <div className="space-y-2">
                <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-500">
                  {t("profile.language")}
                </Label>
                <div className="flex h-14 items-center justify-between rounded-2xl bg-black/5 px-4 ring-1 ring-black/5 transition-colors focus-within:bg-white focus-within:ring-accent/20">
                  <LanguageSelector variant="bottomSheet" showSearch />
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 pt-4"
            >
              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400 animate-in fade-in slide-in-from-top-2 text-center">
                  <p>{error}</p>
                </div>
              )}

              <Button
                variant="outline"
                className="h-14 w-full rounded-2xl border-black/5 bg-white transition-all hover:bg-red-50 hover:border-red-100 hover:text-red-600 active:scale-95 shadow-sm"
                onClick={async () => {
                  await signOut();
                  onClose();
                  router.push("/login");
                  router.refresh();
                }}
              >
                <LogOut className="mr-3 text-muted-foreground/70" size={20} />
                <span className="text-lg font-black text-muted-foreground">
                  {t("profile.logout")}
                </span>
              </Button>

              <Button
                variant="ghost"
                className="h-14 w-full rounded-[20px] font-bold text-muted-foreground hover:bg-black/5 hover:text-foreground"
                onClick={onClose}
              >
                {tCommon("close") || "Fermer"}
              </Button>

              {/* Danger Zone */}
              <div className="pt-8">
                <div className="relative mb-6 flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-black/5" />
                  <span className="relative bg-surface px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    Propriétés Avancées
                  </span>
                </div>

                {!showAdvanced ? (
                  <button
                    onClick={() => setShowAdvanced(true)}
                    className="flex w-full items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest text-red-500/60 transition-all hover:text-red-500"
                  >
                    {tProfile("dangerZone") || "Zone de danger"}
                  </button>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <DangerZoneContent
                      onDelete={handleDeleteAccount}
                      onCancel={() => setShowAdvanced(false)}
                      isDeleting={isDeleting}
                      title={tProfile("dangerZone")}
                      warningMessage={t("profile.deleteAccountWarning")}
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
            </motion.div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
