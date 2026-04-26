"use server";

import { uploadEventImage } from "@/features/sortie/lib/event-image-upload";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";
import type { FormActionState } from "./outing-actions";

/**
 * Upload action state. Carries the canonical Vercel Blob URL on success
 * pour que le wizard puisse remplacer immédiatement le draft sans
 * attendre un round-trip supplémentaire.
 */
export type EventImageActionState = FormActionState & {
  imageUrl?: string;
};

/**
 * Upload une image de couverture pendant la création d'une sortie.
 * Volontairement anonymous-friendly : le wizard supporte les créateurs
 * non connectés, donc on s'appuie uniquement sur le rate-limit IP comme
 * barrière anti-abus (10 uploads / heure / IP). Le payload est validé
 * en MIME + magic bytes par `uploadEventImage`.
 *
 * L'image n'est rattachée à aucune sortie tant que le wizard n'aboutit
 * pas — un orphelin par session abandonnée. Cleanup différé : un
 * script de purge des blobs `/sortie/events/` non référencés dans
 * `outings.heroImageUrl` peut tourner périodiquement si le coût grimpe.
 */
export async function uploadEventImageAction(
  _prev: EventImageActionState,
  formData: FormData
): Promise<EventImageActionState> {
  const ip = await getClientIp();
  const gate = await rateLimit({
    key: `event-image:${ip}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { message: "Aucun fichier reçu." };
  }

  const result = await uploadEventImage(file);
  if (!result.ok) {
    return { message: result.message };
  }

  return { imageUrl: result.url };
}
