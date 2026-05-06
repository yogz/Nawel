"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  verifyTotpAction,
  verifyBackupCodeAction,
} from "@/features/admin/actions/two-factor-actions";

// Composant client du challenge step-up admin. Un mode TOTP (par défaut)
// et un mode backup code (lien "Utiliser un code de secours"). Au succès,
// la server action pose le cookie `admin_stepup` puis on full-reload sur
// `next` pour que le layout admin re-passe le gate avec le cookie en place.

export function TwoFactorChallenge({ next }: { next: string }) {
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "totp" ? await verifyTotpAction(code) : await verifyBackupCodeAction(code.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Full reload : la cible peut être server-rendered et lit le cookie
      // au prochain request. router.replace() re-utiliserait le RSC cache.
      window.location.href = next;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Vérification 2FA</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "totp"
            ? "Saisis le code à 6 chiffres généré par ton authenticator."
            : "Saisis l'un de tes 8 codes de secours (à usage unique)."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="challenge-code">{mode === "totp" ? "Code TOTP" : "Code de secours"}</Label>
        <Input
          id="challenge-code"
          type="text"
          inputMode={mode === "totp" ? "numeric" : "text"}
          autoComplete="one-time-code"
          autoFocus
          maxLength={mode === "totp" ? 6 : 32}
          value={code}
          onChange={(e) => {
            const next =
              mode === "totp" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value;
            setCode(next);
          }}
          className="font-mono tracking-widest text-lg"
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending || code.length === 0 || (mode === "totp" && code.length !== 6)}
        >
          {isPending ? "Vérification…" : "Valider"}
        </Button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          onClick={() => {
            setMode((m) => (m === "totp" ? "backup" : "totp"));
            setCode("");
            setError(null);
          }}
        >
          {mode === "totp" ? "Utiliser un code de secours" : "Revenir au TOTP"}
        </button>
      </div>
    </form>
  );
}
