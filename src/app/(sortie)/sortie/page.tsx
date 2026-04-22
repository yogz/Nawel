export default function SortieHome() {
  return (
    <main
      style={{
        padding: "4rem 1.5rem",
        maxWidth: "40rem",
        margin: "0 auto",
        fontFamily: "Georgia, serif",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#B8935A",
          marginBottom: "0.75rem",
        }}
      >
        Bientôt
      </p>
      <h1
        style={{
          fontSize: "2.5rem",
          lineHeight: 1.1,
          color: "#231E16",
          marginBottom: "1rem",
          fontWeight: 500,
        }}
      >
        Sortie
      </h1>
      <p style={{ fontSize: "1.125rem", color: "#4A4132", lineHeight: 1.6 }}>
        Organise tes sorties culturelles entre amis. Opéra, théâtre, cinéma, concerts, expos — un
        lien à partager, et tout le monde répond.
      </p>
    </main>
  );
}
