"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const t = useTranslations("ResetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(errorParam === "INVALID_TOKEN" ? t("error") : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token: token,
      });

      if (resetError) {
        setError(resetError.message || t("error"));
        toast.error(resetError.message || t("error"));
      } else {
        // Try to auto-login
        const email = searchParams.get("email");
        if (email) {
          try {
            await authClient.signIn.email({
              email,
              password,
              callbackURL: "/",
            });
          } catch (loginErr) {
            console.error("Auto-login after reset failed:", loginErr);
          }
        }

        setSuccess(true);
        toast.success(t("success"));
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 3000);
      }
    } catch {
      setError(t("error"));
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (!token && !errorParam) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertCircle size={24} />
        </div>
        <h1 className="text-xl font-bold">{t("error")}</h1>
        <Button onClick={() => router.push("/login")} variant="outline" className="rounded-2xl">
          {t("backToLogin")}
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-4 p-8 text-center"
      >
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">{t("success")}</h1>
        <p className="text-sm font-medium text-gray-500">
          Redirection vers la page de connexion...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="mb-2 text-center text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mb-8 text-center text-sm font-medium text-gray-500">{t("description")}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              autoComplete="new-password"
              enterKeyHint="done"
              className="h-12 border-gray-100 bg-gray-50/50 px-4 pr-12 transition-all focus:bg-white focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
          disabled={loading || !token}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Traitement...
            </span>
          ) : (
            t("button")
          )}
        </Button>
      </form>
    </div>
  );
}
