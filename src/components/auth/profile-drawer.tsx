"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { BottomSheet } from "../ui/bottom-sheet";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { updateUserAction, deleteUserAction } from "@/app/actions/user-actions";
import {
  Loader2,
  User,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Check,
  LogOut,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useThemeMode } from "../theme-provider";
import clsx from "clsx";

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
  const { data: session, isPending: sessionPending } = useSession();
  const { theme, setTheme, themes } = useThemeMode();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state with session when drawer opens
  useEffect(() => {
    if (session?.user && open) {
      setName(session.user.name || "");
      setError(null);
      setSuccess(false);
      setShowDeleteConfirm(false);
      setShowAdvanced(false);
    }
  }, [session, open]);

  // Auto-save logic for name
  useEffect(() => {
    if (!open || !session?.user || name === (session.user.name || "")) {
      return;
    }

    const saveChanges = async () => {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      try {
        await updateUserAction({ name });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } catch (err) {
        const error = err as Error;
        setError(error.message || "Une erreur est survenue lors de la mise à jour.");
      } finally {
        setIsSubmitting(false);
      }
    };

    const timeoutId = setTimeout(saveChanges, 1000);
    return () => clearTimeout(timeoutId);
  }, [name, open, session?.user]);

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
    <BottomSheet
      open={open}
      onClose={onClose}
      title={showDeleteConfirm ? "Supprimer mon compte" : "Paramètres du profil"}
    >
      {!showDeleteConfirm ? (
        <div className="space-y-6 px-1 pb-12">
          <div className="space-y-6">
            {/* Avatar Display (Read Only) */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-xl ring-1 ring-gray-100">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
                    <User size={48} />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {session.user.email}
                </p>
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
                    placeholder="Ex: Jean Dupont"
                    className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10 font-medium transition-all focus:bg-white"
                    required
                  />
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
                          "flex items-center justify-between rounded-2xl border-2 p-3.5 transition-all active:scale-[0.98]",
                          isSelected
                            ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                            : "border-gray-50 bg-white hover:border-gray-200"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={clsx(
                              "flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-all duration-300",
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

            {/* Advanced Options Section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="group flex w-full items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-200">
                  <ChevronDown
                    size={10}
                    className={clsx("transition-transform", showAdvanced && "rotate-180")}
                  />
                </div>
                Options avancées
              </button>

              {showAdvanced && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <Button
                    variant="premium"
                    className="w-full border-red-100 bg-red-50/30"
                    icon={<Trash2 size={14} />}
                    iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <span className="text-xs font-black uppercase tracking-widest text-red-400 group-hover:text-red-600">
                      Supprimer mon compte
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 px-1 pb-12 animate-in fade-in slide-in-from-right-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black leading-tight text-gray-900">Zone de danger</h4>
              <p className="px-4 text-xs font-medium text-gray-500">
                Cette action est irréversible. Toutes vos données, ainsi que les événements que vous
                avez créés, seront définitivement supprimés.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-500">
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <Button
              variant="premium"
              className="w-full border-red-100 bg-red-50/30 py-7 pr-8 shadow-xl shadow-red-500/10"
              icon={
                isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />
              }
              iconClassName="bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              shine
            >
              <span className="text-xs font-black uppercase tracking-widest text-red-600 group-hover:text-white">
                Confirmer la suppression
              </span>
            </Button>

            <Button
              variant="premium"
              className="w-full border-gray-100 bg-gray-50/50"
              icon={<ArrowLeft size={16} />}
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-600">
                Retour
              </span>
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
