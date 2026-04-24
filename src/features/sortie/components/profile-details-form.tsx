"use client";

import { useActionState, useState } from "react";
import { Check, Instagram, MessageSquareQuote, Music2 } from "lucide-react";
import { updateProfileDetailsAction } from "@/features/sortie/actions/profile-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  bio: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
};

/**
 * Bio + social handles block on /moi. Unified visual vocabulary: each
 * field is a rounded-2xl card with an icon-labeled header and a
 * borderless input inside. Matches the app's card language (ring-1
 * ring-encre-700/5 + bg-ivoire-50) rather than the old form-heavy
 * 2px borders.
 *
 * Single "Enregistrer" button commits all three text fields in one
 * action call.
 */
export function ProfileDetailsForm({ bio, instagramHandle, tiktokHandle }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    updateProfileDetailsAction,
    {} as FormActionState
  );
  const [bioValue, setBioValue] = useState(bio ?? "");

  const bioCount = bioValue.length;
  const bioAtLimit = bioCount >= 160;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Bio card. Icon + label in the header row, textarea transparent
          inside. Character counter floats at bottom-right. */}
      <div className="flex flex-col gap-2 rounded-2xl bg-ivoire-50 p-4 ring-1 ring-encre-700/5 transition-shadow focus-within:ring-2 focus-within:ring-bordeaux-600/30">
        <label
          htmlFor="bio"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-encre-500"
        >
          <MessageSquareQuote size={14} strokeWidth={2.2} className="text-bordeaux-600" />
          Ta bio
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value.slice(0, 160))}
          maxLength={160}
          rows={3}
          placeholder="En une ligne, tu sors où&nbsp;?"
          className="w-full resize-none bg-transparent text-sm text-encre-700 placeholder:text-encre-300 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <p className={`text-xs ${bioAtLimit ? "text-destructive" : "text-encre-300"}`}>
            {bioCount}/160
          </p>
          {state.errors?.bio?.[0] && (
            <p className="text-xs text-destructive">{state.errors.bio[0]}</p>
          )}
        </div>
      </div>

      <SocialField
        id="instagramHandle"
        icon={<Instagram size={16} strokeWidth={2.2} />}
        label="Instagram"
        placeholder="tonpseudo"
        defaultValue={instagramHandle ?? ""}
        error={state.errors?.instagramHandle?.[0]}
      />
      <SocialField
        id="tiktokHandle"
        icon={<Music2 size={16} strokeWidth={2.2} />}
        label="TikTok"
        placeholder="tonpseudo"
        defaultValue={tiktokHandle ?? ""}
        error={state.errors?.tiktokHandle?.[0]}
      />

      {state.message && !state.errors && (
        <p className="inline-flex items-center gap-1 text-xs font-semibold text-bordeaux-700">
          <Check size={12} strokeWidth={3} />
          {state.message}
        </p>
      )}
      {state.message && state.errors && <p className="text-xs text-destructive">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-bordeaux-600 px-5 text-sm font-semibold text-ivoire-50 transition-colors hover:bg-bordeaux-700 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

/**
 * Social handle card — icon + label header on top, borderless input
 * below prefixed with `@`. Same card treatment as the bio so the
 * three form fields read as a family.
 */
function SocialField({
  id,
  icon,
  label,
  placeholder,
  defaultValue,
  error,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  defaultValue: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-ivoire-50 p-4 ring-1 ring-encre-700/5 transition-shadow focus-within:ring-2 focus-within:ring-bordeaux-600/30">
      <label
        htmlFor={id}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-encre-500"
      >
        <span className="text-bordeaux-600">{icon}</span>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-encre-300">@</span>
        <input
          id={id}
          name={id}
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={30}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-sm text-encre-700 placeholder:text-encre-300 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
