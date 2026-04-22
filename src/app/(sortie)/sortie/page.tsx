export default function SortieHome() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-6 py-20">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
        Bientôt
      </p>

      <h1 className="mb-4 font-serif text-5xl leading-[1.05] text-encre-700 sm:text-6xl">Sortie</h1>

      <div className="sortie-filet my-6 self-start">
        <span className="sortie-filet-diamond" />
      </div>

      <p className="max-w-md text-lg leading-relaxed text-encre-500">
        Organise tes sorties culturelles entre amis. Opéra, théâtre, cinéma, concerts, expos — un
        lien à partager, et tout le monde répond.
      </p>
    </main>
  );
}
