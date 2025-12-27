import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Share, ChevronDown, CheckCircle } from "lucide-react";
import clsx from "clsx";
import { getPersonEmoji } from "@/lib/utils";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

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
            slug={slug}
            writeKey={writeKey}
            readOnly={readOnly}
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
  slug: string;
  writeKey?: string;
  readOnly: boolean;
}

function PlanningFilters({
  plan,
  planningFilter,
  setPlanningFilter,
  setSheet,
  sheet,
  unassignedItemsCount,
  slug,
  writeKey,
  readOnly,
}: PlanningFiltersProps) {
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
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
        <Button
          variant="premium"
          size="premium"
          active={planningFilter.type === "all"}
          onClick={() => setPlanningFilter({ type: "all" })}
          icon={<span>🌟</span>}
          iconClassName="h-7 w-7"
        >
          <span
            className={cn(
              "whitespace-nowrap text-[10px] font-black uppercase tracking-wider sm:text-xs",
              planningFilter.type === "all" ? "text-accent" : "text-gray-400"
            )}
          >
            Tout le monde
          </span>
        </Button>

        <Button
          variant="premium"
          size="premium"
          active={planningFilter.type === "unassigned"}
          onClick={() => setPlanningFilter({ type: "unassigned" })}
          icon={<span>🥘</span>}
          iconClassName="h-7 w-7"
        >
          <span
            className={cn(
              "whitespace-nowrap text-[10px] font-black uppercase tracking-wider sm:text-xs",
              planningFilter.type === "unassigned" ? "text-accent" : "text-gray-400"
            )}
          >
            À prévoir ({unassignedItemsCount})
          </span>
        </Button>
      </div>

      {!readOnly && (
        <Button
          variant="premium"
          size="premium"
          shine
          onClick={handleShare}
          icon={copied ? <CheckCircle size={14} /> : <Share size={14} />}
          iconClassName={cn("h-7 w-7", copied && "bg-green-500 text-white")}
          title="Partager l'accès"
        >
          <span className="truncate text-[10px] font-black uppercase tracking-wider text-gray-700 sm:text-xs">
            {copied ? "Copié !" : "Partager"}
          </span>
        </Button>
      )}
    </div>
  );
}
