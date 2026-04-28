"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { compressImageIfNeeded } from "@/features/sortie/lib/compress-image-client";
import { getGenericImagesForVibe } from "@/features/sortie/lib/generic-event-images";
import type { Vibe } from "@/features/sortie/lib/vibe-config";
import type { FindEventResult } from "@/lib/gemini-search";

type Props = {
  // Champs courants du draft : la recherche d'image a besoin du titre
  // (et idéalement du venue) pour requêter, et la grille générique
  // dépend de la catégorie. Tous facultatifs : sans titre on désactive
  // simplement le bouton "Rechercher".
  title: string;
  venue: string;
  vibe: Vibe | null;
  // Callback déclenché quand l'utilisateur valide une image (peu importe
  // la source). Le parent met à jour `draft.heroImageUrl`.
  onPick: (url: string) => void;
  // Cache le placeholder "Pas d'image — choisis-en une" quand le
  // parent affiche déjà l'image courante au-dessus (cas EditOutingForm).
  // Le panneau ne montre alors que la barre d'actions + sous-flux,
  // sans répéter "Pas d'image" alors qu'une image est juste là.
  hidePlaceholder?: boolean;
};

type SubFlow = "none" | "generic";

/**
 * Panneau de récupération affiché quand l'image automatique est absente
 * ou cassée sur le confirm step. Trois options proposées, toutes
 * facultatives : l'utilisateur peut aussi continuer sans image (le hero
 * de la sortie tombera sur le visuel par défaut côté détail).
 *
 * UX volontairement non-bloquante : tout se passe dans la même carte,
 * pas de modal plein écran. Les sous-flux (grille générique, upload) se
 * déploient inline et peuvent être refermés sans perdre l'état du
 * wizard.
 */
export function MissingImagePicker({ title, venue, vibe, onPick, hidePlaceholder = false }: Props) {
  const [subFlow, setSubFlow] = useState<SubFlow>("none");
  const [searchPending, setSearchPending] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedAndEmpty, setSearchedAndEmpty] = useState(false);
  // Garde la trace de la dernière URL retournée par la recherche pour
  // exclure de futures suggestions identiques (en pratique : le cache
  // bypass + une seconde tentative). Permet aussi à la grille générique
  // de signaler "déjà essayée".
  const triedUrlsRef = useRef<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Upload via fetch sur la route handler `/api/sortie/event-image-upload`,
  // pas via `useActionState` : le picker est rendu dans le `<form>` parent
  // de l'edit page, et un dispatch action enfant n'y déclenchait pas le
  // server action proprement (silencieux côté client). Le route handler
  // découple complètement du contexte form, network tab visible pour
  // debug, même validation côté serveur.
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const canSearch = trimmedTitle.length >= 3 && !searchPending;

  async function runSearch() {
    if (!canSearch) {
      return;
    }
    setSearchError(null);
    setSearchedAndEmpty(false);
    setSearchPending(true);
    try {
      // On compose la query avec le venue si dispo : ça aide Gemini à
      // distinguer deux événements homonymes (ex. "Roméo et Juliette" à
      // l'Opéra de Paris vs. en tournée). `noCache` force un nouveau
      // round-trip pour ne pas re-servir l'image rejetée.
      const queryParts = [trimmedTitle, venue.trim()].filter(Boolean);
      const res = await fetch("/api/sortie/find-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryParts.join(" "), noCache: true }),
      });
      if (res.status === 429) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setSearchError(data?.message ?? "Trop de tentatives — réessaie plus tard.");
        return;
      }
      if (!res.ok) {
        setSearchError("La recherche a échoué — réessaie dans un instant.");
        return;
      }
      const data = (await res.json()) as FindEventResult;
      const newUrl = data.found ? data.data.heroImageUrl : "";
      if (newUrl && !triedUrlsRef.current.has(newUrl)) {
        triedUrlsRef.current.add(newUrl);
        onPick(newUrl);
        return;
      }
      // Soit Gemini n'a rien retourné, soit il propose la même URL
      // qu'au tour précédent (cache HTTP côté Gemini). On le signale
      // sans crier au feu : l'utilisateur peut basculer sur la grille
      // ou l'upload.
      setSearchedAndEmpty(true);
    } catch (err) {
      console.error("[missing-image-picker] search failed", err);
      setSearchError("Connexion perdue — vérifie ta connexion.");
    } finally {
      setSearchPending(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) {
      return;
    }
    setUploadError(null);
    setUploadPending(true);
    try {
      // Compresse côté client avant l'upload : Vercel rejette les
      // fonctions serverless > 4.5 MB au niveau gateway, et les photos
      // iPhone JPEG dépassent régulièrement (5-8 MB). Sans cette étape,
      // on se prend un FUNCTION_PAYLOAD_TOO_LARGE muet (HTML, pas JSON)
      // après ~20s d'upload sur le réseau mobile.
      const optimized = await compressImageIfNeeded(file);
      const fd = new FormData();
      fd.set("file", optimized);
      const res = await fetch("/api/sortie/event-image-upload", {
        method: "POST",
        body: fd,
      });
      if (res.status === 429) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setUploadError(data?.message ?? "Trop d'uploads — réessaie plus tard.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        // Vercel gateway 413 : le payload a passé la compression mais
        // dépasse encore la limite d'infra (cas extrême : photo gigapixel
        // qu'on n'a pas pu décoder côté client). Message explicite pour
        // que l'utilisateur sache qu'il faut réduire la résolution.
        const fallback =
          res.status === 413
            ? "Image trop lourde — réduis sa résolution avant de réessayer."
            : "L'upload a échoué — réessaie dans un instant.";
        setUploadError(data?.message ?? fallback);
        return;
      }
      const data = (await res.json()) as { url: string; ogUrl: string | null };
      onPick(data.url);
    } catch (err) {
      console.error("[missing-image-picker] upload failed", err);
      setUploadError("Connexion perdue — vérifie ta connexion.");
    } finally {
      setUploadPending(false);
    }
  }

  const genericImages = getGenericImagesForVibe(vibe);

  return (
    <div className="flex flex-col border-b border-ink-200">
      {/* Empty-state hero — préserve le rythme visuel de la carte (16:10
          comme la vraie image) pour que l'absence d'image n'écrase pas
          la composition. Le pattern radial discret évite l'effet "trou
          gris" d'un placeholder plat. Skip quand le parent a déjà rendu
          l'image au-dessus (mode édit). */}
      {!hidePlaceholder && (
        <div
          className="relative aspect-[16/10] w-full overflow-hidden bg-surface-100"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(143,82,69,0.08) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(199,255,60,0.10) 0%, transparent 50%)",
          }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-2 text-ink-400">
              <div className="grid size-14 place-items-center rounded-full bg-surface-200/80 ring-1 ring-ink-200">
                <ImageIcon size={26} strokeWidth={1.6} />
              </div>
              <p className="px-6 text-center text-xs font-medium text-ink-500">
                Pas d&rsquo;image — choisis-en une ou continue sans.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'actions au pied du placeholder. 3 colonnes égales,
          touch targets ≥ 44px, label sur 2 lignes possible. */}
      <div className="grid grid-cols-3 gap-2 bg-surface-50 p-3">
        <PickerButton
          icon={
            searchPending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />
          }
          label="Rechercher"
          sublabel="une autre"
          onClick={runSearch}
          disabled={!canSearch}
          active={false}
        />
        <PickerButton
          icon={<ImageIcon size={18} />}
          label="Choisir"
          sublabel="une image"
          onClick={() => setSubFlow((s) => (s === "generic" ? "none" : "generic"))}
          disabled={false}
          active={subFlow === "generic"}
        />
        <PickerButton
          icon={
            uploadPending ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />
          }
          label="Importer"
          sublabel="la mienne"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPending}
          active={false}
        />
      </div>

      {(searchError || (searchedAndEmpty && !searchError) || uploadError) && (
        <div className="bg-surface-50 px-3 pb-2">
          {searchError && (
            <p className="text-xs text-destructive" role="alert">
              {searchError}
            </p>
          )}
          {searchedAndEmpty && !searchError && (
            <p className="text-xs text-ink-500" role="status">
              Aucune autre image — essaie une image proposée ou importe la tienne.
            </p>
          )}
          {uploadError && (
            <p className="text-xs text-destructive" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {subFlow === "generic" && (
          <motion.div
            key="generic-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden bg-surface-50"
          >
            <div className="px-3 pb-3">
              <GenericImageGrid
                images={genericImages}
                onPick={(url) => {
                  triedUrlsRef.current.add(url);
                  onPick(url);
                  setSubFlow("none");
                }}
                onClose={() => setSubFlow("none")}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileChange}
        disabled={uploadPending}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
}

function PickerButton({
  icon,
  label,
  sublabel,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled: boolean;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center leading-tight transition-colors duration-300",
        active
          ? "border-acid-600 bg-acid-50 text-acid-700"
          : "border-ink-200 bg-surface-100 text-ink-700 hover:border-acid-300 hover:bg-acid-50/60",
        "disabled:opacity-50 disabled:hover:border-ink-200 disabled:hover:bg-surface-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-300",
      ].join(" ")}
    >
      <span aria-hidden="true" className="mb-0.5">
        {icon}
      </span>
      <span className="text-[12px] font-bold">{label}</span>
      {sublabel && <span className="text-[10px] font-medium text-ink-400">{sublabel}</span>}
    </button>
  );
}

function GenericImageGrid({
  images,
  onPick,
  onClose,
}: {
  images: ReadonlyArray<{ url: string; credit: string }>;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl border border-ink-200 bg-surface-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">
          Images proposées
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la sélection"
          className="grid size-6 place-items-center rounded-full text-ink-400 hover:bg-surface-200 hover:text-ink-700 transition-colors duration-300"
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <button
            key={img.url}
            type="button"
            onClick={() => onPick(img.url)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-ink-200 transition-shadow duration-300 hover:border-acid-400 hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-300"
            aria-label={`Choisir l'image — photo de ${img.credit}`}
          >
            <Image
              src={img.url}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
