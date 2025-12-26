"use client";

import { useSession } from "@/lib/auth-client";
import { BottomSheet } from "../ui/bottom-sheet";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { updateUserAction } from "@/app/actions/user-actions";
import { Loader2, User, Mail, Link as LinkIcon, Camera } from "lucide-react";
import Image from "next/image";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Profile settings drawer.
 * Allows users to edit their name, email and avatar URL.
 * Uses BottomSheet for mobile-first consistency.
 */
export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync state with session when drawer opens
  useEffect(() => {
    if (session?.user && open) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setImage(session.user.image || "");
      setError(null);
      setSuccess(false);
    }
  }, [session, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUserAction({
        name,
        email,
        image: image || null,
      });
      setSuccess(true);
      // Auto-close after success with a small delay for feedback
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionPending || !session) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Paramètres du profil">
      <form onSubmit={handleSubmit} className="space-y-6 px-1 pb-12">
        <div className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="group relative">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-xl ring-1 ring-gray-100 transition-transform hover:scale-105 active:scale-95">
                {image ? (
                  <Image
                    src={image}
                    alt={name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                    onError={() => setImage("")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
                    <User size={48} />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 rounded-full bg-black p-1.5 text-white shadow-lg">
                <Camera size={14} />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Aperçu de votre photo
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

            {/* Email Field */}
            <div className="space-y-2">
              <div className="mr-1 flex items-end justify-between">
                <Label
                  htmlFor="profile-email"
                  className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Adresse Email
                </Label>
                {session.user.emailVerified && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-green-600">
                    Vérifié
                  </span>
                )}
              </div>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 transition-colors group-focus-within:text-black">
                  <Mail size={18} />
                </div>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@exemple.com"
                  className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10 font-medium transition-all focus:bg-white"
                  required
                />
              </div>
              <p className="ml-1 text-[10px] text-gray-400">
                Note: changer votre email peut nécessiter une nouvelle vérification.
              </p>
            </div>

            {/* Avatar URL Field */}
            <div className="space-y-2">
              <Label
                htmlFor="profile-image"
                className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                URL de votre photo
              </Label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 transition-colors group-focus-within:text-black">
                  <LinkIcon size={18} />
                </div>
                <Input
                  id="profile-image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://votre-image.jpg"
                  className="h-12 rounded-xl border-gray-100 bg-gray-50/50 pl-10 font-medium transition-all focus:bg-white"
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
            <p>Profil mis à jour avec succès ! ✨</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-14 w-full rounded-2xl bg-black text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-black/10 transition-all hover:bg-zinc-800 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Enregistrement...</span>
              </div>
            ) : (
              "Enregistrer mon profil"
            )}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
