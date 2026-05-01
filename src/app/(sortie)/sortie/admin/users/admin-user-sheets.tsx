"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  adminCreateUserAction,
  adminUpdateUserAction,
  type AdminUserActionState,
} from "@/features/sortie/actions/admin-user-actions";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
};

const ROLE_OPTIONS: { value: "user" | "admin"; label: string }[] = [
  { value: "user", label: "user — par défaut" },
  { value: "admin", label: "admin — accès console" },
];

/**
 * Bouton "+ Nouveau" en tête de page : ouvre un Sheet pour créer un
 * user de toutes pièces (pré-provision avant assignation, sortie avec
 * email manuel, etc.).
 */
export function CreateUserButton() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-700 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-surface-50 transition-colors hover:bg-acid-600"
      >
        <Plus size={14} strokeWidth={2.4} />
        nouveau user
      </button>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t-0 bg-surface-50 px-6 pb-10 pt-6"
      >
        <SheetHeader className="text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            ─ création ─
          </p>
          <SheetTitle className="font-display text-3xl font-black uppercase tracking-tight text-ink-700">
            Nouveau user
          </SheetTitle>
        </SheetHeader>
        <UserForm mode="create" onSuccess={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Bouton "Éditer" sur chaque row de user : ouvre un Sheet préfilled
 * pour modifier un user existant (typiquement un compte silencieux
 * dont on veut humaniser le nom / vérifier l'email).
 */
export function EditUserButton({ user }: { user: EditableUser }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1 rounded-full border border-surface-300 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-acid-600 hover:text-acid-600"
        aria-label={`Éditer ${user.name}`}
      >
        <Pencil size={12} strokeWidth={2.2} />
        éditer
      </button>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t-0 bg-surface-50 px-6 pb-10 pt-6"
      >
        <SheetHeader className="text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            ─ édition ─
          </p>
          <SheetTitle className="font-display text-3xl font-black uppercase tracking-tight text-ink-700">
            {user.name}
          </SheetTitle>
        </SheetHeader>
        <UserForm mode="edit" initial={user} onSuccess={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

type FormProps =
  | { mode: "create"; onSuccess: () => void; initial?: undefined }
  | { mode: "edit"; onSuccess: () => void; initial: EditableUser };

function UserForm({ mode, initial, onSuccess }: FormProps) {
  const action = mode === "create" ? adminCreateUserAction : adminUpdateUserAction;
  const [state, formAction, pending] = useActionState<AdminUserActionState, FormData>(action, {});

  // On laisse le user voir le message de succès ~800 ms avant de fermer
  // le Sheet. Le Sheet (via Radix Dialog Portal) unmount le form à la
  // fermeture, donc l'état useActionState repart vide à la prochaine
  // ouverture — pas de stale `state.ok` qui re-déclenche le close.
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(onSuccess, 800);
      return () => clearTimeout(t);
    }
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {mode === "edit" ? <input type="hidden" name="id" value={initial.id} /> : null}

      <Field label="nom">
        <input
          type="text"
          name="name"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={initial?.name ?? ""}
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-100 px-4 text-[14px] text-ink-700 placeholder:text-ink-400 focus:border-acid-600 focus:outline-none"
          placeholder="Éric Devaure"
        />
      </Field>

      <Field label="email">
        <input
          type="email"
          name="email"
          required
          maxLength={255}
          autoComplete="off"
          defaultValue={initial?.email ?? ""}
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-100 px-4 text-[14px] text-ink-700 placeholder:text-ink-400 focus:border-acid-600 focus:outline-none"
          placeholder="ericdevaure@hotmail.fr"
        />
      </Field>

      <Field label="username (optionnel)" hint="a-z, 0-9, - et _ — affiché en /@username.">
        <input
          type="text"
          name="username"
          maxLength={30}
          autoComplete="off"
          defaultValue={initial?.username ?? ""}
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-100 px-4 font-mono text-[14px] text-ink-700 placeholder:text-ink-400 focus:border-acid-600 focus:outline-none"
          placeholder="eric"
        />
      </Field>

      <Field label="rôle">
        <select
          name="role"
          required
          defaultValue={initial?.role ?? "user"}
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-100 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-surface-300 bg-surface-100 px-4 py-3">
        <input
          type="checkbox"
          name="emailVerified"
          defaultChecked={initial?.emailVerified ?? false}
          className="h-4 w-4 accent-acid-600"
        />
        <span className="text-[13px] text-ink-700">
          email vérifié
          <span className="ml-1 text-ink-400">— décoché = compte silencieux (anonyme)</span>
        </span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          role="status"
          className="rounded-xl border border-acid-200 bg-acid-50 px-4 py-3 text-[13px] text-acid-700"
        >
          ✓ {state.ok}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink-700 px-6 font-mono text-[12px] uppercase tracking-[0.18em] text-surface-50 transition-colors hover:bg-acid-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "envoi…" : mode === "create" ? "créer" : "enregistrer"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-ink-400">{hint}</span> : null}
    </label>
  );
}
