"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Instagram, Music2 } from "lucide-react";
import {
  updateAvatarAction,
  updateProfileDetailsAction,
} from "@/features/sortie/actions/profile-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { UserAvatar } from "./user-avatar";

type Props = {
  name: string | null;
  image: string | null;
  bio: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
};

/**
 * Settings-page form for the three "public persona" fields: avatar
 * (uploaded photo), short bio, and two social handles (Instagram /
 * TikTok). The avatar sits in its own sub-form because it posts a
 * multipart payload to a different server action — the rest is a
 * plain text form.
 */
export function ProfileDetailsForm({ name, image, bio, instagramHandle, tiktokHandle }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <AvatarPicker name={name} image={image} />
      <DetailsForm bio={bio} instagramHandle={instagramHandle} tiktokHandle={tiktokHandle} />
    </div>
  );
}

function AvatarPicker({ name, image }: { name: string | null; image: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    updateAvatarAction,
    {} as FormActionState
  );
  // Optimistic preview: set immediately on file pick, replaced by the
  // real URL after the server responds + router.refresh() drops the
  // new image URL into props.
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setPreview(URL.createObjectURL(file));
    // Submit the form immediately — no "save" button, the file-picker
    // tap IS the commit gesture.
    e.currentTarget.form?.requestSubmit();
  }

  // Trigger a refresh after a successful upload so the new `image` URL
  // propagates from server → page props → UserAvatar elsewhere. Tracked
  // via a ref so we only refresh on the pending→idle *transition*, not
  // on every re-render that happens to see idle + success message.
  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && state.message === "Photo mise à jour.") {
      router.refresh();
    }
  }, [pending, state.message, router]);

  const shown = preview ?? image;

  return (
    <form action={formAction} className="flex items-center gap-4">
      <div className="shrink-0">
        <UserAvatar name={name} image={shown} size={72} />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <label
          className={`inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full border-2 border-encre-100 bg-white px-3 py-1.5 text-sm font-semibold text-encre-700 transition-colors hover:border-encre-700 ${
            pending ? "opacity-50" : ""
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleChange}
            disabled={pending}
            className="sr-only"
          />
          {pending ? "Envoi…" : shown ? "Changer la photo" : "Ajouter une photo"}
        </label>
        <p className="text-xs text-encre-400">JPEG, PNG, WebP ou HEIC. 2 Mo max.</p>
        {state.message && state.message !== "Photo mise à jour." && (
          <p className="text-xs text-destructive">{state.message}</p>
        )}
        {state.message === "Photo mise à jour." && !pending && (
          <p className="inline-flex items-center gap-1 text-xs text-bordeaux-700">
            <Check size={12} strokeWidth={3} />
            Photo mise à jour.
          </p>
        )}
      </div>
    </form>
  );
}

function DetailsForm({
  bio,
  instagramHandle,
  tiktokHandle,
}: {
  bio: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
}) {
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
