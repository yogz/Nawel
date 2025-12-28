import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Share, ChevronDown, CheckCircle, CircleHelp, Stars } from "lucide-react";
import clsx from "clsx";
import { getPersonEmoji } from "@/lib/utils";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <div className="flex items-center gap-2">
        <Tabs
          value={planningFilter.type}
          onValueChange={(val) => setPlanningFilter({ type: val as "all" | "unassigned" })}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-10 w-full rounded-full bg-zinc-100/80 p-1 sm:w-auto">
            <TabsTrigger
              value="all"
              className="flex-1 gap-1.5 rounded-full px-4 text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm sm:flex-none sm:text-xs"
            >
              <Stars size={14} className="shrink-0" />
              <span className="truncate">Tout afficher</span>
            </TabsTrigger>
            <TabsTrigger
              value="unassigned"
              className="flex-1 gap-1.5 rounded-full px-4 text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm sm:flex-none sm:text-xs"
            >
              <CircleHelp size={14} className="shrink-0" />
              <span className="truncate">À prendre ({unassignedItemsCount})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
