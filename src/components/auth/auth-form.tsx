"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, signUp, authClient, requestPasswordReset, useSession } from "@/lib/auth-client";
import { useRouter, getPathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "./google-icon";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { sendGAEvent } from "@next/third-parties/google";
import { toast } from "sonner";

interface AuthFormProps {
  initialMode?: "signin" | "signup";
  onSuccess?: () => void;
  isUserMode?: boolean;
}

export function AuthForm({ initialMode, onSuccess, isUserMode = true }: AuthFormProps) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { refetch } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isReturningUser = localStorage.getItem("nawel_returning_user") === "true";
    const preferMagicLink = localStorage.getItem("nawel_prefer_magic_link");

    if (token) {
      const verifyMagicLink = async () => {
        setLoading(true);
        try {
          const { error } = await authClient.magicLink.verify({
            query: {
              token,
              callbackURL: getPathname({ href: "/", locale }),
            },
          });

          if (error) {
            setError(error.message || t("errorDefault"));
            toast.error(error.message || t("errorDefault"));
          } else {
            toast.success(t("successSignin"));
            localStorage.setItem("nawel_returning_user", "true");
            await refetch();
            sendGAEvent("event", "login", { method: "magic_link" });
            if (onSuccess) {
              onSuccess();
            } else {
              router.push("/");
              router.refresh();
            }
          }
        } catch (err) {
          console.error("Magic link verification failed:", err);
          setError(t("errorDefault"));
        } finally {
          setLoading(false);
        }
      };
      verifyMagicLink();
      return;
    }

    // Handle initialMode (forced by parent or URL)
    if (initialMode) {
      setAuthMode(initialMode);
    } else if (isReturningUser) {
      setAuthMode("signin");
    }

    // Handle showMagicLink preference
    if (preferMagicLink !== null) {
      setShowMagicLink(preferMagicLink === "true");
    } else {
      // Default for new users or if no preference saved
      setShowMagicLink(false);
    }
  }, [initialMode, token, locale, isUserMode, onSuccess, router, t, refetch]);

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
          sendGAEvent("event", "auth_error", {
            error_message: error.message || t("errorSignin"),
            auth_mode: "signin",
            auth_method: "email",
          });
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
          sendGAEvent("event", "auth_error", {
            error_message: error.message || t("errorSignup"),
            auth_mode: "signup",
            auth_method: "email",
          });
          setLoading(false);
          return;
        }
        sendGAEvent("event", "sign_up", { method: "email" });
      }

      sendGAEvent("event", "login", { method: "email" });
      localStorage.setItem("nawel_returning_user", "true");

      // Refetch session to ensure client-side state is synced before navigation
      await refetch();

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
        router.push(isUserMode ? "/" : "/admin");
      }
    } catch {
      setError(t("errorDefault"));
      sendGAEvent("event", "auth_error", {
        error_message: "caught_exception",
        auth_mode: authMode,
        auth_method: showMagicLink ? "magic_link" : "email",
      });
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
      sendGAEvent("event", "auth_error", {
        error_message: "google_auth_exception",
        auth_mode: authMode,
        auth_method: "google",
      });
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError(t("errorEmailRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const callbackURL = getPathname({ href: "/", locale });

      const { error } = await signIn.magicLink({
        email,
        callbackURL,
      });

      if (error) {
        setError(error.message || t("errorDefault"));
        toast.error(error.message || t("errorDefault"));
      } else {
        setMagicLinkSent(true);
        toast.success(t("successMagicLinkEmail"));
        sendGAEvent("event", "magic_link_request", { success: true });
      }
    } catch {
      setError(t("errorDefault"));
      toast.error(t("errorDefault"));
      sendGAEvent("event", "auth_error", {
        error_message: "magic_link_exception",
        auth_mode: "signin",
        auth_method: "magic_link",
      });
    } finally {
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
        sendGAEvent("event", "forgot_password_request", { success: true });
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
      <div className="mb-6 flex justify-center">
        <div className="relative flex w-full max-w-[280px] rounded-full bg-gray-100 p-1.5">
          <motion.div
            className="absolute inset-y-1.5 rounded-full bg-white shadow-sm"
            initial={false}
            animate={{
              x: authMode === "signin" ? 0 : "100%",
              width: "50%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => {
              setAuthMode("signin");
              sendGAEvent("event", "auth_mode_toggle", { target_mode: "signin" });
            }}
            className={`relative z-10 w-1/2 py-3 text-sm font-bold transition-colors ${
              authMode === "signin" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            {t("signinButton")}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("signup");
              sendGAEvent("event", "auth_mode_toggle", { target_mode: "signup" });
            }}
            className={`relative z-10 w-1/2 py-3 text-sm font-bold transition-colors ${
              authMode === "signup" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            {t("signupButton")}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={
            token
              ? "verifying"
              : magicLinkSent
                ? "sent"
                : authMode + (showMagicLink ? "-magic" : "")
          }
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {token ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <h1 className="text-xl font-bold">{t("verifyingMagicLink")}</h1>
              <p className="text-sm text-gray-500">{t("pleaseWait")}</p>
            </div>
          ) : magicLinkSent ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
                <Sparkles size={32} />
              </div>
              <h1 className="mb-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                {t("magicLinkSentTitle")}
              </h1>
              <p className="mb-8 text-sm font-medium text-gray-500">
                {t("magicLinkSentDescription", { email })}
              </p>
              <Button
                variant="outline"
                onClick={() => setMagicLinkSent(false)}
                className="h-11 rounded-2xl border-gray-100 text-sm font-bold"
              >
                {t("backToSignin")}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-center text-[28px] font-black tracking-tight text-[#1a1a1a] sm:text-3xl text-balance">
                {authMode === "signin"
                  ? showMagicLink
                    ? t("signinMagicTitle")
                    : t("signinTitle")
                  : t("signupTitle")}
              </h1>
              <p className="mb-4 text-center text-sm font-medium text-gray-500">
                {authMode === "signin"
                  ? showMagicLink
                    ? t("signinMagicDescription")
                    : t("signinDescription")
                  : t("signupDescription")}
              </p>

              {(authMode === "signup" || !showMagicLink) && (
                <>
                  <Button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    variant="outline"
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white text-[15px] font-bold text-[#1f1f1f] shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow active:scale-[0.98]"
                    shine
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    {authMode === "signin" ? t("googleButton") : t("googleSignupButton")}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-100" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                      <span className="bg-white px-3 text-gray-400 font-bold">
                        {t("orContinueWith")}
                      </span>
                    </div>
                  </div>
                </>
              )}

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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !showMagicLink) {
                        e.preventDefault();
                        passwordRef.current?.focus();
                      }
                    }}
                    placeholder={t("emailPlaceholder")}
                    required
                    disabled={loading}
                    autoComplete="email"
                    enterKeyHint="next"
                    className="h-12 rounded-2xl border-0 bg-gray-50 px-5 text-base font-medium text-gray-900 shadow-inner transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                {(authMode === "signup" || !showMagicLink) && (
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
                        ref={passwordRef}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("passwordPlaceholder")}
                        required
                        disabled={loading}
                        autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                        enterKeyHint="done"
                        className="h-12 rounded-2xl border-0 bg-gray-50 px-5 pr-12 text-base font-medium text-gray-900 shadow-inner transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
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
                )}

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
                  onClick={(e) => {
                    if (authMode === "signin" && showMagicLink) {
                      e.preventDefault();
                      handleMagicLink();
                    }
                  }}
                  className="h-12 w-full rounded-2xl bg-[#0f172a] text-[15px] font-bold text-white shadow-lg shadow-purple-900/20 transition-all hover:bg-black hover:shadow-xl hover:shadow-purple-900/30 active:scale-[0.98] disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      {authMode === "signin"
                        ? showMagicLink
                          ? t("sendingMagicLink")
                          : t("signingIn")
                        : t("signingUp")}
                    </span>
                  ) : authMode === "signin" ? (
                    showMagicLink ? (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles size={16} className="text-accent" />
                        {t("signinMagicButton")}
                      </span>
                    ) : (
                      t("signinButton")
                    )
                  ) : (
                    t("signupButton")
                  )}
                </Button>

                {authMode === "signin" && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = !showMagicLink;
                        setShowMagicLink(newMode);
                        localStorage.setItem("nawel_prefer_magic_link", String(newMode));
                        sendGAEvent("event", "auth_method_toggle", {
                          target_method: newMode ? "magic_link" : "password",
                        });
                      }}
                      className="text-xs font-bold text-gray-400 transition-colors hover:text-gray-600"
                    >
                      {showMagicLink ? t("usePassword") : t("useMagicLink")}
                    </button>
                  </div>
                )}
              </form>

              <div className="mt-6 text-center" />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
