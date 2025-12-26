"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { BottomSheet } from "../ui/bottom-sheet";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { updateUserAction, deleteUserAction } from "@/app/actions/user-actions";
import { Loader2, User, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync state with session when drawer opens
  useEffect(() => {
    if (session?.user && open) {
      setName(session.user.name || "");
      setError(null);
      setSuccess(false);
      setShowDeleteConfirm(false);
    }
  }, [session, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUserAction({ name });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la mise à jour.");
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
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression du compte.");
      setIsDeleting(false);
    }
  };

  if (sessionPending || !session) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={showDeleteConfirm ? "Supprimer mon compte" : "Paramètres du profil"}
    >
      {!showDeleteConfirm ? (
        <form onSubmit={handleSubmit} className="space-y-6 px-1 pb-12">
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {session.user.email}
              </p>
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
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-2">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-xs font-bold text-green-600 animate-in fade-in slide-in-from-top-2">
              <p>Profil mis à jour ! ✨</p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-2xl bg-black text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-black/10 transition-all hover:bg-zinc-800 active:scale-[0.98]"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Enregistrer"}
            </Button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors hover:text-red-600"
            >
              Supprimer mon compte
            </button>
          </div>
        </form>
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

          <div className="space-y-3">
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-red-500/10 transition-all hover:bg-red-600 active:scale-[0.98]"
            >
              {isDeleting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={18} />
                  <span>Confirmer la suppression</span>
                </>
              )}
            </Button>

            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-50 py-4 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
