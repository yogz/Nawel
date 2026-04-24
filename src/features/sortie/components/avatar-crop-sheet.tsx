"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Target output size for the cropped avatar. 512×512 covers retina
// profile displays at 256 CSS px and keeps the exported JPEG small —
// typically ~60–120 kB at quality 0.9.
const OUTPUT_SIZE = 512;

type Props = {
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
};

/**
 * Square avatar crop flow. Opens a bottom sheet with a circular
 * `react-easy-crop` viewport over the uploaded image, a zoom slider,
 * and two actions (Annuler / Utiliser cette photo). Commit draws the
 * selected region onto a `<canvas>` and returns a JPEG blob through
 * `onCropped` so the caller can upload it to the avatar action.
 *
 * The Cropper handles drag + pinch-to-zoom natively on mobile. We
 * manage the file-object URL + revoke it on unmount to avoid the
 * memory leak pattern these lifecycles are famous for.
 */
export function AvatarCropSheet({ file, onCancel, onCropped }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  async function commit() {
    if (!imageSrc || !areaPixels) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const blob = await cropToBlob(imageSrc, areaPixels);
      onCropped(blob);
    } catch {
      setError("Impossible de préparer la photo. Essaie une autre image.");
    } finally {
      setPending(false);
    }
  }

  const open = file !== null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="theme-sortie flex max-h-[92dvh] flex-col gap-5 overflow-hidden"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-serif text-2xl text-encre-700">Cadre ta photo</SheetTitle>
          <p className="text-sm text-encre-400">Déplace avec le doigt, pince pour zoomer.</p>
        </SheetHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-encre-700">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-xs font-semibold text-encre-400">
            −
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-bordeaux-600"
          />
          <span aria-hidden="true" className="text-xs font-semibold text-encre-400">
            +
          </span>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="button" onClick={commit} disabled={pending || !areaPixels}>
            {pending ? "On prépare…" : "Utiliser cette photo"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Draws the selected region onto an offscreen canvas and returns a
 * JPEG blob. Output is normalised to `OUTPUT_SIZE` square — keeps
 * the upload small regardless of the source resolution and
 * guarantees consistent avatar quality across devices.
 */
async function cropToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no-canvas-context");
  }
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas-empty"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
