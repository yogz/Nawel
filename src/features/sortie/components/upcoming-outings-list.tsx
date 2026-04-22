import Link from "next/link";
import { formatOutingDateShort } from "@/features/sortie/lib/date-fr";

type Outing = {
  id: string;
  shortId: string;
  slug: string;
  title: string;
  location: string | null;
  startsAt: Date | null;
};

export function UpcomingOutingsList({ outings }: { outings: Outing[] }) {
  return (
    <ul className="flex flex-col divide-y divide-ivoire-400">
      {outings.map((outing) => (
        <li key={outing.id}>
          <Link
            href={`/${outing.slug ? `${outing.slug}-${outing.shortId}` : outing.shortId}`}
            className="group flex flex-col gap-1 py-4 transition-colors hover:text-bordeaux-700"
          >
            <span className="font-serif text-lg text-encre-700 group-hover:text-bordeaux-700">
              {outing.title}
            </span>
            <span className="text-sm text-encre-400">
              {outing.startsAt ? formatOutingDateShort(outing.startsAt) : "À confirmer"}
              {outing.location ? ` · ${outing.location}` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
