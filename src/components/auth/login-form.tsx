"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "./google-icon";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isUserMode = mode === "user";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (authMode === "signin") {
        const { error } = await signIn.email({
          email,
          password,
          callbackURL: isUserMode ? "/" : "/admin",
        });
        if (error) {
          setError(error.message || "Erreur de connexion");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await signUp.email({
          email,
          password,
          name: email.split("@")[0],
          callbackURL: "/",
        });
        if (error) {
          setError(error.message || "Erreur d'inscription");
          setLoading(false);
          return;
        }
      }

      router.push(isUserMode ? "/" : "/admin");
      router.refresh();
    } catch {
      setError("Une erreur est survenue");
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center px-4">
      <div className="relative z-10 w-full">
        {/* Animated Aura Background */}
        <div className="pointer-events-none absolute -inset-20 -z-10 overflow-visible">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-tr from-purple-600 via-accent to-red-500 opacity-60 blur-[60px]"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-bl from-accent via-purple-500 to-blue-400 opacity-50 blur-[80px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute inset-0 transform-gpu rounded-full bg-purple-500/40 blur-[100px]"
          />
        </div>

        <div className="relative z-20 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl transition-all">
          <div className="relative z-10">
            <h1 className="mb-2 text-center text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              {isUserMode
                ? authMode === "signin"
                  ? "Ravi de vous revoir !"
                  : "Bienvenue à bord !"
                : "Administration"}
            </h1>
            <p className="mb-8 text-center text-sm font-medium text-gray-500">
              {isUserMode
                ? authMode === "signin"
                  ? "Connectez-vous pour continuer"
                  : "Créez votre compte en un instant"
                : "Espace réservé aux administrateurs"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={loading}
                  className="h-12 border-gray-100 bg-white/50 px-4 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="h-12 border-gray-100 bg-white/50 px-4 focus:bg-white"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-500"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-gray-900 font-bold text-white shadow-xl shadow-gray-900/10 transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
                disabled={loading}
              >
                {loading
                  ? authMode === "signin"
                    ? "Connexion..."
                    : "Création..."
                  : authMode === "signin"
                    ? "Se connecter"
                    : "S'inscrire"}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-transparent px-3 text-gray-400">Ou continuer avec</span>
              </div>
            </div>

            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await signIn.social({
                    provider: "google",
                    callbackURL: isUserMode ? "/" : "/admin",
                  });
                } catch (err) {
                  console.error(err);
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#747775] bg-white text-sm font-medium text-[#1f1f1f] transition-all hover:bg-gray-50 active:scale-95"
            >
              <GoogleIcon className="h-5 w-5" />
              S&apos;identifier avec Google
            </button>

            {isUserMode && (
              <p className="mt-8 text-center text-xs font-semibold text-gray-500">
                {authMode === "signin" ? (
                  <>
                    Pas encore de compte ?{" "}
                    <button
                      onClick={() => setAuthMode("signup")}
                      className="font-bold text-accent hover:underline"
                    >
                      S&apos;inscrire
                    </button>
                  </>
                ) : (
                  <>
                    Déjà un compte ?{" "}
                    <button
                      onClick={() => setAuthMode("signin")}
                      className="font-bold text-accent hover:underline"
                    >
                      Se connecter
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {isUserMode && (
        <div className="relative z-20 mt-12 text-center">
          <Link
            href="/create-event"
            className="rounded-full bg-white/40 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 backdrop-blur-sm transition-all hover:bg-white/60 hover:text-gray-700"
          >
            Continuer sans s&apos;identifier
          </Link>
        </div>
      )}
    </div>
  );
}
