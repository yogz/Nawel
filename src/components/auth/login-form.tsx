"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "./google-icon";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isUserMode = mode === "user";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await signIn.email({
        email,
        password,
        callbackURL: isUserMode ? "/" : "/admin",
      });

      if (error) {
        setError(error.message || "Erreur de connexion");
      } else {
        router.push(isUserMode ? "/" : "/admin");
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-white/20 bg-white/80 p-8 shadow-lg backdrop-blur-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-text">
          {isUserMode ? "Connexion" : "Administration"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={loading}
              className="bg-white/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="bg-white/50"
            />
          </div>

          {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 font-medium text-gray-400">Ou continuer avec</span>
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
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#747775] bg-white py-4 text-sm font-bold text-[#1f1f1f] transition-all hover:bg-gray-50 active:scale-95"
        >
          <GoogleIcon className="h-5 w-5" />
          Se connecter avec Google
        </button>

        {isUserMode && (
          <div className="mt-8 text-center">
            <Link
              href="/create-event"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-accent"
            >
              Continuer sans compte
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
