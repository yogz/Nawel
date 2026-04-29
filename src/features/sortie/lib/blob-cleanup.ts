import { del } from "@vercel/blob";

// Garde paranoïaque : on ne supprime que les blobs qu'on est CERTAIN
// d'avoir nous-même créés. Une URL hand-pasted depuis un CDN tiers
// (Google avatar, Ticketmaster image, etc.) ne doit jamais déclencher
// un del() — sinon on viole l'API d'un autre service avec un token
// qui ne nous appartient pas.
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * Best-effort delete d'un blob Vercel sous un chemin attendu (`/sortie/events/`,
 * `/sortie/avatars/`, etc.). Validations :
 *   - URL parseable
 *   - hostname termine par `.public.blob.vercel-storage.com`
 *   - pathname démarre par le `pathPrefix` fourni
 *
 * Tout échec (URL invalide, blob 404, réseau down) est loggé en warn et
 * absorbé : le blob laissé orphelin ne casse pas le flux appelant
 * (la nouvelle ressource est déjà sauvegardée). Un audit périodique des
 * orphelins peut les rattraper plus tard.
 */
export async function deleteBlobIfOurs(
  url: string | null,
  pathPrefix: string,
  scope: string
): Promise<void> {
  if (!url) {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn(`[${scope}] previous URL is not valid, skipping delete`, { url });
    return;
  }
  const isOurs =
    parsed.hostname.endsWith(BLOB_HOST_SUFFIX) && parsed.pathname.startsWith(pathPrefix);
  if (!isOurs) {
    return;
  }
  try {
    await del(url);
  } catch (err) {
    console.warn(`[${scope}] previous blob cleanup failed (orphaned)`, { err, url });
  }
}
