import { NextResponse, type NextRequest } from "next/server";
import { uploadEventImage } from "@/features/sortie/lib/event-image-upload";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload de la cover d'événement. Anciennement un server action invoqué
 * via `useActionState` depuis le `MissingImagePicker`, mais le picker est
 * rendu à l'intérieur du `<form action={updateOutingAction}>` de l'edit
 * page — et un dispatch `useActionState` enfant ne s'y comportait pas
 * proprement (l'upload restait silencieux côté client). Repassé en route
 * handler classique appelé en `fetch` : pas de contexte form parent,
 * network tab visible pour debug, même validation côté serveur.
 *
 * Anonymous-friendly : le wizard de création supporte les créateurs non
 * connectés, donc on s'appuie uniquement sur le rate-limit IP comme
 * barrière anti-abus (10 uploads / heure / IP). Le payload est validé en
 * MIME + magic bytes par `uploadEventImage`.
 *
 * Réponses :
 *   200 { url, ogUrl }              — succès
 *   400 { error: "no_file" | "bad_request" }
 *   413 { error: "..." } — taille / format / contenu refusé
 *   429 { error: "rate_limited", message }
 *   500 { error: "upload_failed", message }
 */
export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const gate = await rateLimit({
    key: `event-image:${ip}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: gate.message },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "no_file", message: "Aucun fichier reçu." },
      { status: 400 }
    );
  }

  const result = await uploadEventImage(file);
  if (!result.ok) {
    // 413 (Payload Too Large) couvre la majorité des refus côté serveur
    // (taille/format/contenu) ; reste 500 pour les vrais plantages
    // d'infrastructure (blob put down, sharp choke imprévu).
    const isInfra = result.message.startsWith("L'upload a échoué");
    return NextResponse.json(
      { error: isInfra ? "upload_failed" : "rejected", message: result.message },
      { status: isInfra ? 500 : 413 }
    );
  }

  return NextResponse.json({ url: result.url, ogUrl: result.ogUrl });
}
