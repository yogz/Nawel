import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Share, ChevronDown, CheckCircle } from "lucide-react";
import clsx from "clsx";
import { getPersonEmoji } from "@/lib/utils";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { UserNav } from "@/components/auth/user-nav";

interface OrganizerHeaderProps {
  christmas: boolean;
  readOnly: boolean;
  tab: string;
  plan: PlanData;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  unassignedItemsCount: number;
  slug: string;
  writeKey?: string;
}

export function OrganizerHeader({
  christmas,
  readOnly,
  tab,
  plan,
  planningFilter,
  setPlanningFilter,
  setSheet,
  sheet,
  unassignedItemsCount,
  slug,
  writeKey,
}: OrganizerHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/event/${slug}${writeKey ? `?key=${writeKey}` : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Événement - ${plan.event?.name || slug}`,
          text: `Rejoins l'événement "${plan.event?.name || slug}" sur Nawel !`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {christmas && (
        <div className="christmas-garland">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="christmas-light" />
          ))}
        </div>
      )}

      {readOnly && (
        <div className="flex items-center gap-2 bg-amber-100 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert size={16} />
          🔒Mode lecture uniquement
        </div>
      )}

      <header className="bg-surface/80 sticky top-0 z-30 border-b border-black/[0.03] px-4 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="shrink-0 text-xl font-black italic tracking-tight text-accent transition-opacity hover:opacity-80 sm:text-2xl"
          >
            NAWEL ✨
          </Link>
          <div className="flex items-center gap-2">
            {readOnly && (
              <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:gap-1.5 sm:px-3 sm:text-[11px]">
                <ShieldAlert size={10} className="sm:h-3 sm:w-3" />
                <span className="xs:inline hidden">Miroir</span>
              </span>
            )}
            {!readOnly && (
              <button
                onClick={handleShare}
                className="btn-shine group flex h-10 items-center gap-2 rounded-full border border-transparent bg-white px-4 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-gray-300 active:scale-95"
                title="Partager l'accès"
              >
                {copied ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <Share size={16} className="text-accent" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Partager
                </span>
              </button>
            )}
            <UserNav />
          </div>
        </div>

        {tab === "planning" && (
          <PlanningFilters
            plan={plan}
            planningFilter={planningFilter}
            setPlanningFilter={setPlanningFilter}
            setSheet={setSheet}
            sheet={sheet}
            unassignedItemsCount={unassignedItemsCount}
          />
        )}
      </header>
    </>
  );
}

interface PlanningFiltersProps {
  plan: PlanData;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  unassignedItemsCount: number;
}

function PlanningFilters({
  plan,
  planningFilter,
  setPlanningFilter,
  setSheet,
  sheet,
  unassignedItemsCount,
}: PlanningFiltersProps) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
        <button
          onClick={() => setPlanningFilter({ type: "all" })}
          className={clsx(
            "whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all sm:px-4 sm:text-xs",
            planningFilter.type === "all"
              ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
              : "bg-white text-gray-400 hover:text-gray-600"
          )}
        >
          Tout le monde
        </button>
        <button
          onClick={() => setPlanningFilter({ type: "unassigned" })}
          className={clsx(
            "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all sm:px-4 sm:text-xs",
            planningFilter.type === "unassigned"
              ? "bg-zinc-900 text-white shadow-md ring-2 ring-zinc-900/20"
              : "bg-white text-gray-400 hover:text-zinc-600"
          )}
        >
          À prévoir ({unassignedItemsCount}) 🥘
        </button>

        {plan.people.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setSheet({ type: "person-select" })}
              className={clsx(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all sm:px-4 sm:text-xs",
                planningFilter.type === "person"
                  ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                  : "bg-white text-gray-400 hover:text-gray-600"
              )}
            >
              {planningFilter.type === "person" ? (
                <>
                  {getPersonEmoji(
                    plan.people.find((p) => p.id === planningFilter.personId)?.name || "",
                    plan.people.map((p) => p.name),
                    plan.people.find((p) => p.id === planningFilter.personId)?.emoji
                  )}{" "}
                  {plan.people.find((p) => p.id === planningFilter.personId)?.name}
                </>
              ) : (
                "Par personne"
              )}
              <ChevronDown
                size={14}
                className={clsx(
                  "transition-transform",
                  sheet?.type === "person-select" && "rotate-180"
                )}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
