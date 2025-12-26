"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { BottomSheet } from "../ui/bottom-sheet";
import { Globe, Loader2 } from "lucide-react";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      if (mode === "signin") {
        await authClient.signIn.email({
          email,
          password,
          callbackURL: "/",
        });
      } else {
        await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0], // Simple default name
          callbackURL: "/",
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogleAuth = async () => {
    console.log("GOOGLE_AUTH_CLICKED: Starting process...");
    setIsPending(true);
    setError(null);
    try {
      console.log("GOOGLE_AUTH_CALLING_SIGN_IN: Calling authClient.signIn.social...");
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      console.log("GOOGLE_AUTH_RESPONSE: Response received:", res);
    } catch (err: any) {
      console.error("GOOGLE_AUTH_ERROR: Caught error:", err);
      setError(err.message || "Une erreur est survenue");
      setIsPending(false);
    } finally {
      console.log("GOOGLE_AUTH_FINISHED: Setting pending to false if error");
      // Note: redirection usually happens before this if successful
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={mode === "signin" ? "Connexion" : "Inscription"}
    >
      <div className="space-y-6 py-4">
        <form onSubmit={handleCredentialsAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base outline-none transition-all focus:border-accent focus:bg-white"
              placeholder="votre@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base outline-none transition-all focus:border-accent focus:bg-white"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-2xl bg-accent py-4 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : mode === "signin" ? (
              "Se connecter"
            ) : (
              "S'inscrire"
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 font-medium text-gray-400">Ou continuer avec</span>
          </div>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-100 bg-white py-4 text-sm font-bold text-gray-700 transition-all hover:border-gray-200 active:scale-95"
        >
          <Globe size={18} className="text-gray-400" />
          Google
        </button>

        <p className="text-center text-sm text-gray-500">
          {mode === "signin" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                onClick={() => setMode("signup")}
                className="font-bold text-accent hover:underline"
              >
                S&apos;inscrire
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                onClick={() => setMode("signin")}
                className="font-bold text-accent hover:underline"
              >
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </BottomSheet>
  );
}
