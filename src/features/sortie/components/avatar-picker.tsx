"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { updateAvatarAction } from "@/features/sortie/actions/profile-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
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
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    updateAvatarAction,
    {} as FormActionState
  );
  // The file the user just picked — opens the crop sheet when set.
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  // Optimistic preview from the cropped blob. Replaced by the real
  // `image` prop once `router.refresh()` propagates the new server URL.
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

  // Refresh server data the moment the action resolves successfully,
  // so the parent page picks up the new image URL and the optimistic
  // preview can be dropped. Tracked via a ref so we only fire once
  // per pending → idle transition.
  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && state.message === "Photo mise à jour.") {
      router.refresh();
    }
  }, [pending, state.message, router]);

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
        className={`relative inline-block shrink-0 cursor-pointer transition-opacity active:scale-[0.98] ${
          pending ? "opacity-50" : ""
        }`}
        aria-label={shown ? "Changer la photo" : "Ajouter une photo"}
      >
        <UserAvatar name={name} image={shown} size={size} />
        <span
          aria-hidden="true"
          className="absolute grid place-items-center rounded-full bg-bordeaux-600 text-ivoire-50 shadow-[var(--shadow-md)] ring-2 ring-ivoire-100"
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
