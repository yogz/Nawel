"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Composant d'enrôlement TOTP partagé Sortie + CoList. Texte FR hardcodé :
// les pages admin sont déjà FR-only des deux côtés (cf. existing pages).
//
// Flow en 3 temps :
//   1. (optionnel) password → authClient.twoFactor.enable({ password }) → { totpURI, backupCodes }
//   2. QR + backup codes affichés une fois (copy unique)
//   3. premier code TOTP → authClient.twoFactor.verifyTotp({ code }) → twoFactorEnabled flip à true
//
// Comptes Google-only (`hasPassword=false`) : le plugin Better Auth est
// configuré avec `allowPasswordless: true`, donc `enable()` accepte un
// appel sans password. On skip l'étape 1 et on call directement enable()
// — la session OAuth active fait office d'auth (statu-quo pré-2FA).

type EnrollState =
  | { kind: "idle" }
  | { kind: "ready"; qrDataUrl: string; backupCodes: string[] }
  | { kind: "done" };

export function TwoFactorEnroll({
  redirectAfter = "/",
  hasPassword,
}: {
  redirectAfter?: string;
  hasPassword: boolean;
}) {
  const [state, setState] = useState<EnrollState>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedAck, setSavedAck] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleEnable() {
    setError(null);
    startTransition(async () => {
      // Comptes credential (email+password) → password obligatoire.
      // Comptes OAuth-only → enable() sans password (allowPasswordless).
      const body = hasPassword ? { password } : { password: "" };
      const { data, error: enableErr } = await authClient.twoFactor.enable(body);
      if (enableErr || !data) {
        setError(
          enableErr?.message ??
            (hasPassword
              ? "Activation impossible. Vérifie le mot de passe."
              : "Activation impossible. Réessaie ou contacte un autre admin.")
        );
        return;
      }
      const qrDataUrl = await QRCode.toDataURL(data.totpURI, { width: 220, margin: 1 });
      setState({ kind: "ready", qrDataUrl, backupCodes: data.backupCodes });
    });
  }

  async function handleVerify() {
    setError(null);
    startTransition(async () => {
      const { error: verifyErr } = await authClient.twoFactor.verifyTotp({ code });
      if (verifyErr) {
        setError(verifyErr.message ?? "Code invalide. Réessaie.");
        return;
      }
      setState({ kind: "done" });
      // Petit délai pour laisser voir le succès, puis redirect.
      setTimeout(() => {
        window.location.href = redirectAfter;
      }, 800);
    });
  }

  if (state.kind === "idle") {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleEnable();
        }}
      >
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Activer la 2FA</h1>
          {hasPassword ? (
            <p className="text-muted-foreground text-sm">
              Étape 1/3 — confirme ton mot de passe pour générer le secret TOTP.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Compte connecté via Google — pas de mot de passe à confirmer. Clique sur
              «&nbsp;Générer&nbsp;» pour créer ton secret TOTP.
            </p>
          )}
        </div>
        {hasPassword && (
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={isPending || (hasPassword && password.length === 0)}>
          {isPending ? "Génération…" : hasPassword ? "Continuer" : "Générer"}
        </Button>
      </form>
    );
  }

  if (state.kind === "ready") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Activer la 2FA</h1>
          <p className="text-muted-foreground text-sm">
            Étape 2/3 — scanne le QR avec ton authenticator (1Password, Google Authenticator,
            Authy…) puis sauvegarde les codes de secours.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <div className="bg-white p-3 rounded-md border self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.qrDataUrl} alt="QR code TOTP" width={220} height={220} />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">Codes de secours (8)</p>
              <p className="text-muted-foreground text-xs">
                Affichés une seule fois. Copie-les et range-les en lieu sûr — chaque code n&apos;est
                utilisable qu&apos;une fois et remplace le TOTP en cas de perte du device.
              </p>
            </div>
            <pre className="bg-muted rounded-md p-3 text-xs leading-relaxed font-mono">
              {state.backupCodes.join("\n")}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(state.backupCodes.join("\n"))}
            >
              Copier les codes
            </Button>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={savedAck}
            onChange={(e) => setSavedAck(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>J&apos;ai sauvegardé les codes de secours en lieu sûr.</span>
        </label>

        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1">
            <Label htmlFor="totp-code">Étape 3/3 — code à 6 chiffres</Label>
            <p className="text-muted-foreground text-xs">
              Saisis le code généré par ton authenticator pour confirmer l&apos;activation.
            </p>
          </div>
          <Input
            id="totp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-mono tracking-widest text-center text-lg"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            type="button"
            onClick={handleVerify}
            disabled={isPending || code.length !== 6 || !savedAck}
          >
            {isPending ? "Vérification…" : "Activer"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">2FA activée</h1>
      <p className="text-muted-foreground text-sm">Redirection en cours…</p>
    </div>
  );
}
