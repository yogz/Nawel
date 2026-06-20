import Link from "next/link";

// Index du labo de design de la page d'événement.
// Chaque variante est une refonte autonome, sur fausses données.
const variants = [
  { slug: "a", name: "A — Convivial", desc: "Fil social, bouton « Je prends », orienté invités." },
];

export default function DesignEventIndex() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] px-5 py-16">
      <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">Labo design</p>
      <h1 className="mt-1 text-2xl font-bold">Page d&apos;événement</h1>
      <p className="mt-2 text-sm text-gray-500">
        Maquettes navigables sur fausses données. Le code de prod n&apos;est pas touché.
      </p>
      <div className="mt-6 space-y-3">
        {variants.map((v) => (
          <Link
            key={v.slug}
            href={`/design/event/${v.slug}`}
            className="block rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
          >
            <div className="text-base font-bold">{v.name}</div>
            <div className="mt-1 text-sm text-gray-500">{v.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
