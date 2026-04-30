import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Tile = {
  href: string;
  label: string;
  blurb: string;
  Icon: LucideIcon;
};

const TILES: Tile[] = [
  {
    href: "/sortie/admin/stat",
    label: "Stats",
    blurb: "Parser, services externes, wizard funnel, sorties / jour.",
    Icon: BarChart3,
  },
  {
    href: "/sortie/admin/outings",
    label: "Sorties",
    blurb: "Liste, statuts, créateurs, lien direct.",
    Icon: CalendarRange,
  },
  {
    href: "/sortie/admin/users",
    label: "Utilisateurs",
    blurb: "Recherche par email ou pseudo, activité.",
    Icon: Users,
  },
];

export default function SortieAdminHome() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/sortie"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          accueil
        </Link>
      </nav>

      <header className="mb-12">
        <Eyebrow glow className="mb-3">
          ─ admin ─
        </Eyebrow>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl">
          Console
        </h1>
        <p className="mt-4 text-[15px] text-ink-500">
          Outils de supervision et de modération réservés aux admins.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {TILES.map(({ href, label, blurb, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-surface-300 bg-surface-50 p-5 transition-all hover:border-acid-600 hover:bg-surface-100"
            >
              <div className="flex items-center justify-between">
                <Icon size={20} strokeWidth={2} className="text-acid-600" />
                <ArrowUpRight
                  size={16}
                  strokeWidth={2.2}
                  className="text-ink-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-acid-600"
                />
              </div>
              <div>
                <h2 className="text-[18px] font-black leading-tight tracking-[-0.02em] text-ink-700">
                  {label}
                </h2>
                <p className="mt-1 text-[13px] leading-[1.4] text-ink-500">{blurb}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
