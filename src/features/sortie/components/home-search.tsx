"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer as DrawerPrimitive } from "vaul";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import type { SearchedOuting } from "@/features/sortie/queries/search-my-outings";

const RECENTS_KEY = "sortie:recent-searches";
const RECENTS_MAX = 5;
const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; outings: SearchedOuting[]; query: string }
  | { status: "error" };

// Composant unique trigger + drawer fusionnés. La fusion est nécessaire
// pour partager `inputRef` entre le bouton (focus synchrone iOS) et
// l'input de la sheet, sans prop drilling absurde.
//
// On utilise Vaul (`vaul` lib) plutôt que Radix Dialog (notre Sheet)
// pour deux raisons iOS-critiques :
//   - `repositionInputs={true}` : le drawer se repositionne au-dessus
//     du clavier iOS quand l'input prend le focus (vs Radix qui laisse
//     le clavier mâcher la moitié inférieure).
//   - Scroll lock iOS-aware : Vaul n'utilise pas le hack
//     `position: fixed; top: -scrollY` de `react-remove-scroll` (utilisé
//     par Radix Dialog) qui faisait sauter la page sous-jacente.
//   - `autoFocus={true}` : Vaul focus le 1er input dans la fenêtre
//     user-gesture iOS, là où un `setTimeout` casse le geste.
export function HomeSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [query, setQuery] = React.useState("");
  const [state, setState] = React.useState<FetchState>({ status: "idle" });
  const [recents, setRecents] = React.useState<string[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Charge les recents à chaque ouverture (sinon copie stale si une autre
  // instance a écrit). Cheap.
  React.useEffect(() => {
    if (!open) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(RECENTS_KEY);
      if (!raw) {
        setRecents([]);
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecents(parsed.filter((v): v is string => typeof v === "string").slice(0, RECENTS_MAX));
      }
    } catch {
      setRecents([]);
    }
  }, [open]);

  // Reset à la fermeture pour ne pas réafficher un vieux résultat.
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setState({ status: "idle" });
      setActiveIndex(0);
    }
  }, [open]);

  // Cmd+K / Ctrl+K — desktop. Inerte sur mobile (pas de combo clavier).
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounce + AbortController : cancel les requêtes en vol pour éviter
  // qu'une vieille réponse écrase une plus récente sur réseau lent.
  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/sortie/search-home?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error("http");
          }
          const data = (await res.json()) as { outings: SearchedOuting[] };
          setState({ status: "ready", outings: data.outings, query: trimmed });
          setActiveIndex(0);
        })
        .catch((err) => {
          if ((err as { name?: string }).name === "AbortError") {
            return;
          }
          setState({ status: "error" });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function pushRecent(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      return;
    }
    const next = [trimmed, ...recents.filter((r) => r !== trimmed)].slice(0, RECENTS_MAX);
    setRecents(next);
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // localStorage indispo : feature confort, pas critique.
    }
  }

  function handlePick(outing: SearchedOuting) {
    pushRecent(query);
    setOpen(false);
    // Pas de préfixe `/sortie/` : `proxy.ts` rewrite `sortie.colist.fr/X`
    // → `/sortie/X`. La route détail attend `<slug>-<shortId>`.
    router.push(`/${canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId })}`);
  }

  function handleRecentClick(value: string) {
    setQuery(value);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (state.status !== "ready" || state.outings.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % state.outings.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + state.outings.length) % state.outings.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = state.outings[activeIndex];
      if (picked) {
        handlePick(picked);
      }
    }
  }

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      direction="top"
      // Vaul focus le 1er focusable au mount de l'animation, dans la
      // fenêtre où iOS Safari accepte de monter le clavier.
      autoFocus
      // Repositionne le drawer pour rester au-dessus du clavier iOS.
      // Defaut true depuis vaul 0.9, on l'explicite pour la clarté.
      repositionInputs
      // Pattern éditorial — pas le zoom-out iOS-natif sur le background.
      shouldScaleBackground={false}
      // Restore le focus sur le trigger à la fermeture (Radix-like).
      onClose={() => triggerRef.current?.focus()}
    >
      <DrawerPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Rechercher une sortie"
          className="group flex h-11 min-w-0 flex-1 touch-manipulation items-center gap-2 border-b border-surface-400 px-2 text-left transition-colors duration-300 hover:border-acid-600 focus-visible:border-acid-600 focus-visible:outline-none active:border-acid-600"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 transition-colors duration-300 group-hover:text-acid-600 group-focus-visible:text-acid-600">
            ─ trouve
          </span>
          <span
            aria-hidden="true"
            className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 md:inline"
          >
            ⌘K
          </span>
        </button>
      </DrawerPrimitive.Trigger>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          // direction=top : le drawer descend depuis le haut, max 92dvh
          // pour laisser un peu de fond visible (signal de modalité).
          // Vaul applique automatiquement les transforms via
          // data-vaul-drawer-direction="top".
          className="fixed inset-x-0 top-0 z-[200] flex max-h-[92dvh] flex-col rounded-b-3xl border-b border-surface-300 bg-surface-50 outline-none"
        >
          <DrawerPrimitive.Title className="sr-only">Recherche de sorties</DrawerPrimitive.Title>
          <DrawerPrimitive.Description className="sr-only">
            Tape un titre ou un lieu pour retrouver une sortie.
          </DrawerPrimitive.Description>

          <div className="mx-auto w-full max-w-2xl px-6 pt-6">
            <label htmlFor="sortie-search-input" className="sr-only">
              Rechercher une sortie
            </label>
            <div className="flex items-baseline gap-3 border-b border-acid-600 pb-2">
              <span
                aria-hidden="true"
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid-600"
              >
                ─ trouve
              </span>
              <input
                ref={inputRef}
                id="sortie-search-input"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="titre, lieu…"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                // text-base (16px+) évite le zoom auto iOS sur focus.
                className="flex-1 bg-transparent text-base text-ink-700 placeholder:text-ink-400 focus:outline-none sm:text-lg"
                aria-controls="sortie-search-results"
                aria-autocomplete="list"
              />
            </div>
          </div>

          <div
            id="sortie-search-results"
            // overflow-y-auto + overscroll-contain : la liste scrolle en
            // interne sans déclencher de scroll de la page sous-jacente.
            // Vaul gère le scroll lock du body, pas besoin du hook
            // useKeyboardInset (repositionInputs s'occupe du clavier).
            className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-6"
            aria-live="polite"
          >
            {state.status === "idle" && query.trim().length < MIN_QUERY_LENGTH ? (
              <RecentsBlock recents={recents} onPick={handleRecentClick} />
            ) : state.status === "loading" ? (
              <LoadingBlock />
            ) : state.status === "error" ? (
              <ErrorBlock />
            ) : state.status === "ready" && state.outings.length === 0 ? (
              <NoResultsBlock query={state.query} onClose={() => setOpen(false)} />
            ) : state.status === "ready" ? (
              <ResultsList
                outings={state.outings}
                query={state.query}
                activeIndex={activeIndex}
                onPick={handlePick}
                onHover={setActiveIndex}
              />
            ) : null}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

function RecentsBlock({ recents, onPick }: { recents: string[]; onPick: (value: string) => void }) {
  if (recents.length === 0) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
        ─ tape un titre ou un lieu
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">─ récents</p>
      <ul className="flex flex-wrap gap-2">
        {recents.map((value) => (
          <li key={value}>
            <button
              type="button"
              onClick={() => onPick(value)}
              className="touch-manipulation rounded-full border border-surface-300 px-4 py-2 text-sm text-ink-700 transition-colors duration-150 hover:border-acid-600 hover:text-acid-600 active:border-acid-600 active:text-acid-600"
            >
              {value}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingBlock() {
  return (
    <p aria-label="Chargement" className="font-mono text-base text-acid-600">
      <span className="inline-block animate-pulse [animation-delay:0ms]">─</span>{" "}
      <span className="inline-block animate-pulse [animation-delay:150ms]">─</span>{" "}
      <span className="inline-block animate-pulse [animation-delay:300ms]">─</span>
    </p>
  );
}

function ErrorBlock() {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-hot-500">─ réseau down</p>
  );
}

function NoResultsBlock({ query, onClose }: { query: string; onClose: () => void }) {
  const trimmed = query.trim();
  const href = trimmed ? `/nouvelle?title=${encodeURIComponent(trimmed)}` : "/nouvelle";
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
        ─ rien sur ce fil
      </p>
      <Link
        href={href}
        onClick={onClose}
        className="touch-manipulation inline-flex min-h-[44px] items-center self-start rounded-full border border-acid-600 px-5 py-2.5 text-sm font-medium text-acid-600 transition-colors duration-150 hover:bg-acid-600 hover:text-surface-50 active:bg-acid-600 active:text-surface-50"
      >
        {trimmed ? `crée « ${trimmed} »` : "organise une sortie"}
      </Link>
    </div>
  );
}

function ResultsList({
  outings,
  query,
  activeIndex,
  onPick,
  onHover,
}: {
  outings: SearchedOuting[];
  query: string;
  activeIndex: number;
  onPick: (outing: SearchedOuting) => void;
  onHover: (index: number) => void;
}) {
  return (
    <ul role="listbox" className="flex flex-col gap-1">
      {outings.map((outing, index) => {
        const active = index === activeIndex;
        return (
          <li key={outing.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(outing)}
              className={`flex min-h-[56px] w-full touch-manipulation items-baseline gap-3 rounded-md px-3 py-4 text-left transition-colors duration-150 active:bg-surface-100 ${
                active ? "bg-surface-100" : "hover:bg-surface-100"
              }`}
            >
              <span className="flex-1 truncate text-base text-ink-700">
                <Highlight text={outing.title} query={query} />
                {outing.location ? (
                  <span className="ml-2 text-sm text-ink-400">
                    · <Highlight text={outing.location} query={query} />
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                {formatStartsAt(outing.fixedDatetime)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) {
    return <>{text}</>;
  }
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-transparent text-acid-600">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
});

// La valeur arrive sérialisée en string via JSON.parse — `Date` n'existe
// pas en JSON, donc côté client on reçoit `string | null`. Sans
// normalisation, `Intl.DateTimeFormat.format(string)` throw RangeError.
function formatStartsAt(value: Date | string | null): string {
  if (!value) {
    return "à voter";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "à voter";
  }
  return dateFormatter.format(date);
}
