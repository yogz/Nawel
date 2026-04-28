"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import {
  updateAvatarAction,
  type AvatarActionState,
} from "@/features/sortie/actions/profile-actions";
import { AvatarCropSheet } from "./avatar-crop-sheet";
import { UserAvatar } from "./user-avatar";

type Props = {
  name: string | null;
  image: string | null;
  /** Render size in px. The camera badge scales proportionally. */
  size?: number;
};

/**
 * Standalone tap-to-change avatar. The avatar itself is the click
 * target (wrapped in a `<label>`); a small Camera badge in the
 * bottom-right corner signals the interaction. On file pick, opens
 * an `AvatarCropSheet` for 1:1 round cropping, then uploads the
 * result through `updateAvatarAction`.
 *
 * Previously lived inside `ProfileDetailsForm` alongside the bio +
 * socials fields. Extracted so the /moi page can promote the avatar
 * to the top of the page without double-rendering it in the form
 * block below.
 */
export function AvatarPicker({ name, image, size = 80 }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<AvatarActionState, FormData>(
    updateAvatarAction,
    {} as AvatarActionState
  );
  // The file the user just picked — opens the crop sheet when set.
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  // Optimistic preview. Holds either a `blob:` URL (immediately after
  // the user crops, before the server has replied) or the canonical
  // Vercel Blob URL (after the action returns it). The blob: form is
  // swapped + revoked on success so it doesn't leak across uploads.
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setPickedFile(file);
    // Reset so picking the same file again re-triggers onChange.
    e.currentTarget.value = "";
  }

  function handleCropped(blob: Blob) {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const nextPreview = URL.createObjectURL(blob);
    setPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return nextPreview;
    });
    setPickedFile(null);

    const fd = new FormData();
    fd.set("file", file);
    formAction(fd);
  }

  // On successful upload: swap the blob: preview for the canonical
  // Vercel Blob URL the action just returned, revoke the blob URL so
  // we don't leak it, and refresh so other surfaces (home nav, public
  // profile) pick up the new value too. Tracked via a ref so we only
  // fire once per pending → idle transition.
  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && state.imageUrl) {
      const nextUrl = state.imageUrl;
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return nextUrl;
      });
      router.refresh();
    }
  }, [pending, state.imageUrl, router]);

  const shown = preview ?? image;
  // Scale the badge and its ring against the avatar size so it stays
  // balanced whether the caller asks for 56px or 128px. These values
  // give a badge ≈ 1/3 of the avatar diameter, matching the
  // Instagram / WhatsApp proportion.
  const badgeSize = Math.max(20, Math.round(size * 0.3));
  const iconSize = Math.max(10, Math.round(badgeSize * 0.48));
  const ringOffset = Math.max(2, Math.round(size * 0.03));

  return (
    <>
      <label
        className="relative inline-block shrink-0 cursor-pointer motion-safe:active:scale-[0.98]"
        aria-label={shown ? "Changer la photo" : "Ajouter une photo"}
      >
        <UserAvatar name={name} image={shown} size={size} />
        {pending && (
          // Real progress feedback during upload — the previous
          // implementation just dimmed the label to 50% opacity, which
          // reads as "disabled" rather than "in progress". An overlaid
          // spinner over a translucent scrim says "I'm doing something
          // with your photo" unambiguously.
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center rounded-full bg-ink-700/40 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-motion-standard"
          >
            <Loader2
              size={Math.round(size * 0.4)}
              strokeWidth={2.5}
              className="text-surface-50 motion-safe:animate-spin"
            />
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute grid place-items-center rounded-full bg-acid-600 text-surface-50 shadow-[var(--shadow-md)] ring-2 ring-surface-100"
          style={{
            width: badgeSize,
            height: badgeSize,
            right: -ringOffset,
            bottom: -ringOffset,
          }}
        >
          <Camera size={iconSize} strokeWidth={2.4} />
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleChange}
          disabled={pending}
          className="sr-only"
        />
      </label>
      {state.message && state.message !== "Photo mise à jour." && (
        <p className="mt-2 text-xs text-destructive">{state.message}</p>
      )}
      <AvatarCropSheet
        file={pickedFile}
        onCancel={() => setPickedFile(null)}
        onCropped={handleCropped}
      />
    </>
  );
}
