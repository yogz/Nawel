"use client";

import { useActionState, useState } from "react";
import { Check, Instagram, Music2 } from "lucide-react";
import { updateProfileDetailsAction } from "@/features/sortie/actions/profile-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  bio: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
};

/**
 * Bio + social handles block on /moi. The avatar lives in the page
 * header as a standalone `AvatarPicker` — this form is only about
 * the text fields, which makes the single "Enregistrer" button
 * unambiguous (it commits exactly what's in these three inputs).
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-[13px] font-medium text-encre-500">
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
          className="rounded-lg border-2 border-encre-100 bg-white px-3 py-2 text-sm text-encre-700 placeholder:text-encre-300 focus:border-bordeaux-600 focus:outline-none"
        />
        <p className={`text-xs ${bioAtLimit ? "text-destructive" : "text-encre-400"}`}>
          {bioCount}/160
        </p>
        {state.errors?.bio?.[0] && (
          <p className="text-xs text-destructive">{state.errors.bio[0]}</p>
        )}
      </div>

      <SocialInput
        id="instagramHandle"
        icon={<Instagram size={14} strokeWidth={2.2} />}
        label="Instagram"
        placeholder="tonpseudo"
        defaultValue={instagramHandle ?? ""}
        error={state.errors?.instagramHandle?.[0]}
      />
      <SocialInput
        id="tiktokHandle"
        icon={<Music2 size={14} strokeWidth={2.2} />}
        label="TikTok"
        placeholder="tonpseudo"
        defaultValue={tiktokHandle ?? ""}
        error={state.errors?.tiktokHandle?.[0]}
      />

      {state.message && !state.errors && (
        <p className="inline-flex items-center gap-1 text-xs text-bordeaux-700">
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

function SocialInput({
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-encre-500">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-encre-400">{icon}</span>
        <span className="absolute left-8 text-sm font-semibold text-encre-400">@</span>
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
          className="h-11 w-full rounded-lg border-2 border-encre-100 bg-white pr-3 pl-12 text-sm text-encre-700 placeholder:text-encre-300 focus:border-bordeaux-600 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
