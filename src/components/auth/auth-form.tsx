"use client";

import { useState, useEffect } from "react";
import { signIn, signUp, authClient, requestPasswordReset } from "@/lib/auth-client";
import { useRouter, getPathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "./google-icon";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { toast } from "sonner";

interface AuthFormProps {
  initialMode?: "signin" | "signup";
  onSuccess?: () => void;
  isUserMode?: boolean;
}

export function AuthForm({ initialMode = "signin", onSuccess, isUserMode = true }: AuthFormProps) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup"); // Default to signup for new users
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isReturningUser = localStorage.getItem("nawel_returning_user") === "true";
    if (initialMode) {
      setAuthMode(initialMode);
    } else if (isReturningUser) {
      setAuthMode("signin");
    }
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const callbackPath = isUserMode ? "/" : "/admin";
      const callbackURL = getPathname({ href: callbackPath, locale });

      if (authMode === "signin") {
        const { error } = await signIn.email({
          email,
          password,
          callbackURL,
        });
        if (error) {
          setError(error.message || t("errorSignin"));
          setLoading(false);
          return;
        }
      } else {
        const { error } = await signUp.email({
          email,
          password,
          name: email.split("@")[0],
          callbackURL,
        });
        if (error) {
          setError(error.message || t("errorSignup"));
          setLoading(false);
          return;
        }
        sendGAEvent("event", "sign_up", { method: "email" });
      }

      sendGAEvent("event", "login", { method: "email" });
      localStorage.setItem("nawel_returning_user", "true");

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(isUserMode ? "/" : "/admin");
        router.refresh();
      }
    } catch {
      setError(t("errorDefault"));
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      const callbackPath = isUserMode ? "/" : "/admin";
      const callbackURL = getPathname({ href: callbackPath, locale });
      await signIn.social({
        provider: "google",
        callbackURL,
      });
      sendGAEvent("event", "login", { method: "google" });
      localStorage.setItem("nawel_returning_user", "true");
    } catch (err) {
      console.error(err);
      setError(t("errorDefault"));
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t("errorEmailRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error } = await requestPasswordReset({
        email,
        redirectTo:
          getPathname({ href: "/reset-password", locale }) + `?email=${encodeURIComponent(email)}`,
      });

      if (error) {
        setError(error.message || t("errorDefault"));
        toast.error(error.message || t("errorDefault"));
      } else {
        toast.success(t("successResetEmail"));
      }
    } catch {
      setError(t("errorDefault"));
      toast.error(t("errorDefault"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Mode Toggle */}
      <div className="mb-8 flex justify-center">
        <div className="relative flex w-full max-w-[240px] rounded-2xl bg-gray-100 p-1">
          <motion.div
            className="absolute inset-y-1 rounded-xl bg-white shadow-sm"
            initial={false}
            animate={{
              x: authMode === "signin" ? 0 : "100%",
              width: "50%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => setAuthMode("signin")}
            className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-colors ${
              authMode === "signin" ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {t("signinButton")}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-colors ${
              authMode === "signup" ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {t("signupButton")}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={authMode}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="mb-2 text-center text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            {authMode === "signin" ? t("signinTitle") : t("signupTitle")}
          </h1>
          <p className="mb-8 text-center text-sm font-medium text-gray-500">
            {authMode === "signin" ? t("signinDescription") : t("signupDescription")}
          </p>

          <Button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            variant="outline"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#747775] bg-white text-sm font-medium text-[#1f1f1f] transition-all hover:bg-gray-50 active:scale-95"
            shine
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            {t("googleButton")}
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white px-3 text-gray-400">{t("orContinueWith")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {t("emailLabel")}
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                disabled={loading}
                autoComplete="email"
                enterKeyHint="next"
                className="h-12 border-gray-100 bg-gray-50/50 px-4 transition-all focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {t("passwordLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  required
                  disabled={loading}
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  enterKeyHint="done"
                  className="h-12 border-gray-100 bg-gray-50/50 px-4 pr-12 transition-all focus:bg-white focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {authMode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-bold text-accent hover:underline"
                  >
                    {t("forgotPassword")}
                  </button>
                </div>
              )}
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
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {authMode === "signin" ? t("signingIn") : t("signingUp")}
                </span>
              ) : authMode === "signin" ? (
                t("signinButton")
              ) : (
                t("signupButton")
              )}
            </Button>
          </form>

          <div className="mt-8 text-center" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
