"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchTicketmasterAdminAction } from "@/features/sortie/actions/admin-ticketmaster-actions";
import type { TicketmasterAdminEvent } from "@/features/sortie/lib/ticketmaster-admin";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return DATE_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TicketmasterAdminSearchPanel() {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<TicketmasterAdminEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    startTransition(async () => {
      setError(null);
      const result = await searchTicketmasterAdminAction({ query });
      if (result.ok) {
        setResults(result.results);
        setSelectedId(result.results[0]?.id ?? null);
      } else {
        setResults([]);
        setError(result.message);
      }
    });
  }

  const selected = results?.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="q"
          placeholder="ex: Roland Garros, Pene Pati, Stromae…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="flex-1"
        />
        <Button type="submit" disabled={pending || query.trim().length < 2}>
          <Search size={16} strokeWidth={2.2} className="mr-2" />
          {pending ? "Recherche…" : "Chercher"}
        </Button>
      </form>

      {error && (
        <p className="rounded-md border border-erreur-500/40 bg-erreur-50 p-3 text-sm text-erreur-700">
          {error}
        </p>
      )}

      {results !== null && results.length === 0 && !error && (
        <p className="rounded-md border border-dashed border-surface-400 bg-surface-50 p-4 text-sm text-ink-500">
          Aucun résultat.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <ResultsList results={results} selectedId={selectedId} onSelect={setSelectedId} />
          {selected && <EventDetail event={selected} />}
        </div>
      )}
    </div>
  );
}

function ResultsList({
  results,
  selectedId,
  onSelect,
}: {
  results: TicketmasterAdminEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex max-h-[70vh] flex-col divide-y divide-surface-400 overflow-y-auto rounded-md border border-surface-400 bg-surface-50">
      {results.map((r) => {
        const isActive = r.id === selectedId;
        const venue = r.venues[0];
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className={`flex w-full flex-col gap-1 p-3 text-left transition-colors ${
                isActive ? "bg-acid-600/10" : "hover:bg-surface-100"
              }`}
            >
              <span className="truncate font-serif text-base text-ink-700">{r.title}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
                {fmtDate(r.startsAt)}
                {venue?.city ? ` · ${venue.city}` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EventDetail({ event }: { event: TicketmasterAdminEvent }) {
  return (
    <article className="flex flex-col gap-6">
      <Header event={event} />
      <ImagesGrid images={event.images} />
      <KeyMeta event={event} />
      <Venues venues={event.venues} />
      <Attractions attractions={event.attractions} />
      <Notes event={event} />
    </article>
  );
}

function Header({ event }: { event: TicketmasterAdminEvent }) {
  return (
    <header className="flex flex-col gap-2">
      <h2 className="text-2xl leading-tight font-black tracking-[-0.02em] text-ink-700">
        {event.title}
      </h2>
      <div className="flex flex-wrap items-center gap-3 text-[12px]">
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-acid-700 underline-offset-4 hover:underline"
        >
          ticketmaster.fr <ExternalLink size={12} strokeWidth={2.2} />
        </a>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
          id · {event.id}
        </span>
        {event.status && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-hot-600">
            status · {event.status}
          </span>
        )}
      </div>
    </header>
  );
}

function ImagesGrid({ images }: { images: TicketmasterAdminEvent["images"] }) {
  if (images.length === 0) {
    return <Section title={`Images (0)`}>Aucune image dans le payload.</Section>;
  }
  return (
    <Section title={`Images (${images.length})`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <li
            key={`${img.url}-${i}`}
            className="flex flex-col gap-1 overflow-hidden rounded-md border border-surface-400 bg-surface-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={`TM image ${img.ratio ?? "?"} ${img.width ?? "?"}×${img.height ?? "?"}`}
              loading="lazy"
              className="aspect-video w-full object-cover"
            />
            <div className="flex flex-col gap-1 p-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">
                {img.ratio ?? "?"} · {img.width ?? "?"}×{img.height ?? "?"}
                {img.fallback && " · fallback"}
              </span>
              <CopyButton value={img.url} label="copier URL" />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function KeyMeta({ event }: { event: TicketmasterAdminEvent }) {
  const dateLine = (() => {
    if (event.dateTBA) return "Date TBA";
    if (event.dateTBD) return "Date TBD";
    if (event.startsAt) return fmtDate(event.startsAt);
    if (event.startLocalDate)
      return `${event.startLocalDate}${event.startLocalTime ? ` ${event.startLocalTime}` : ""}`;
    return "—";
  })();
  return (
    <Section title="Dates & sales">
      <KV label="Date évent" value={dateLine} />
      <KV
        label="Sales (public)"
        value={
          event.salesPublicStart || event.salesPublicEnd
            ? `${fmtDate(event.salesPublicStart)} → ${fmtDate(event.salesPublicEnd)}`
            : "—"
        }
      />
      {event.presales.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
            Presales ({event.presales.length})
          </span>
          <ul className="flex flex-col gap-1 pl-3 text-[12px] text-ink-500">
            {event.presales.map((p, i) => (
              <li key={i}>
                <strong className="text-ink-700">{p.name ?? "presale"}</strong> ·{" "}
                {fmtDate(p.startDateTime)} → {fmtDate(p.endDateTime)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {event.classifications.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
            Classifications
          </span>
          <ul className="flex flex-col gap-1 pl-3 text-[12px] text-ink-500">
            {event.classifications.map((c, i) => (
              <li key={i}>{[c.segment, c.genre, c.subGenre].filter(Boolean).join(" › ") || "—"}</li>
            ))}
          </ul>
        </div>
      )}
      {event.priceRanges.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
            Prix
          </span>
          <ul className="flex flex-col gap-1 pl-3 text-[12px] text-ink-500">
            {event.priceRanges.map((p, i) => (
              <li key={i}>
                {p.type ?? "—"} · {p.min ?? "?"}–{p.max ?? "?"} {p.currency ?? ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function Venues({ venues }: { venues: TicketmasterAdminEvent["venues"] }) {
  if (venues.length === 0) return null;
  return (
    <Section title={`Venues (${venues.length})`}>
      <ul className="flex flex-col gap-3">
        {venues.map((v, i) => (
          <li
            key={i}
            className="flex flex-col gap-1 rounded-md border border-surface-400 bg-surface-50 p-3"
          >
            <span className="font-serif text-base text-ink-700">{v.name ?? "—"}</span>
            <span className="text-[12px] text-ink-500">
              {[v.address, v.postalCode, v.city, v.country].filter(Boolean).join(" · ") || "—"}
            </span>
            {v.timezone && (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
                tz · {v.timezone}
              </span>
            )}
            {v.url && (
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-[12px] text-acid-700 underline-offset-4 hover:underline"
              >
                page venue <ExternalLink size={12} strokeWidth={2.2} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Attractions({ attractions }: { attractions: TicketmasterAdminEvent["attractions"] }) {
  if (attractions.length === 0) return null;
  return (
    <Section title={`Attractions / artistes (${attractions.length})`}>
      <ul className="flex flex-wrap gap-2">
        {attractions.map((a) => (
          <li key={a.id}>
            <a
              href={a.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-surface-400 bg-surface-50 px-3 py-1.5 text-[12px] text-ink-700 transition-colors hover:border-acid-600"
            >
              {a.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={a.image}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                  loading="lazy"
                />
              )}
              {a.name}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Notes({ event }: { event: TicketmasterAdminEvent }) {
  if (!event.info && !event.pleaseNote) return null;
  return (
    <Section title="Notes">
      {event.info && <p className="text-[13px] text-ink-700">{event.info}</p>}
      {event.pleaseNote && (
        <p className="mt-2 rounded-md border border-hot-500/30 bg-hot-500/5 p-3 text-[13px] text-ink-700">
          <strong className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-hot-600">
            please note ·
          </strong>{" "}
          {event.pleaseNote}
        </p>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">─ {title}</h3>
      <div className="text-[13px] text-ink-700">{children}</div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="text-[13px] text-ink-700">{value}</span>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copie :", value);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex w-fit items-center gap-1 rounded-full border border-surface-400 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-acid-600 hover:text-acid-700"
    >
      <Copy size={11} strokeWidth={2.2} />
      {copied ? "copié" : label}
    </button>
  );
}
