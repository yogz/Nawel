"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { GoogleIcon } from "./google-icon";

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
          callbackURL: window.location.href,
        });
      } else {
        await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0], // Simple default name
          callbackURL: window.location.href,
        });
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue");
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsPending(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      console.error("Google auth error:", err);
      setError(message);
      setIsPending(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{mode === "signin" ? "Connexion" : "Inscription"}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none min-h-[60vh] flex-1 overflow-y-auto pb-40">
          <div className="space-y-4 py-2">
            <form onSubmit={handleCredentialsAuth} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="auth-email"
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Email
                </Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-2xl border-gray-100 bg-gray-50 px-4 text-base outline-none transition-all focus:border-accent focus:bg-white"
                  placeholder="votre@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="auth-password"
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Mot de passe
                </Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-2xl border-gray-100 bg-gray-50 px-4 text-base outline-none transition-all focus:border-accent focus:bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-semibold text-red-500">
                  {error}
                </p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="premium"
                  className="w-full py-6 pr-8 shadow-md"
                  disabled={isPending}
                >
                  <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                    {isPending ? (
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    ) : mode === "signin" ? (
                      "Se connecter"
                    ) : (
                      "S'inscrire"
                    )}
                  </span>
                </Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 font-medium text-gray-400">Ou continuer avec</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleAuth}
              disabled={isPending}
              variant="outline"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#747775] bg-white text-sm font-medium text-[#1f1f1f] transition-all hover:bg-gray-50 hover:text-[#1f1f1f] active:scale-95"
              shine
            >
              <GoogleIcon className="h-5 w-5" />
              {mode === "signin" ? "S'identifier avec Google" : "S'inscrire avec Google"}
            </Button>

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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
