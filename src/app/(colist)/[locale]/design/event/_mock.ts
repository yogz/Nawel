// Fausses données pour le labo de design de la page d'événement.
// Aucune connexion ni base : on itère uniquement sur le visuel.
// Quand une variante est validée, on remplacera ce mock par les vraies données.

export type MockPerson = {
  initial: string;
  name: string;
  bg: string;
  fg: string;
};

export type MockItem = {
  name: string;
  by: MockPerson | null; // null = personne ne l'apporte encore (libre)
};

export type MockSection = {
  emoji: string;
  name: string;
  items: MockItem[];
};

const claire: MockPerson = { initial: "C", name: "Claire", bg: "#FDE68A", fg: "#92400E" };
const delphine: MockPerson = { initial: "D", name: "Delphine", bg: "#A7F3D0", fg: "#065F46" };
const jay: MockPerson = { initial: "J", name: "Jay", bg: "#BFDBFE", fg: "#1E40AF" };
const magmax: MockPerson = { initial: "M", name: "MagMax", bg: "#FBCFE8", fg: "#9D174D" };
const vero: MockPerson = { initial: "V", name: "Véro", bg: "#DDD6FE", fg: "#5B21B6" };

export const mockEvent = {
  title: "BBQ chez Marie",
  date: "sam. 20 juin",
  time: "19h00",
  place: "Jardin de Marie",
  countdown: "Dans 3 jours",
  guestCount: 9,
  guests: [claire, delphine, jay, magmax, vero],
  missing: "du pain et des boissons sans alcool",
  sections: [
    {
      emoji: "🍢",
      name: "Plat",
      items: [
        { name: "Côtes de porc marinées", by: jay },
        { name: "Salade de courgettes", by: null },
      ],
    },
    {
      emoji: "🥑",
      name: "Apéro",
      items: [
        { name: "Chips & guacamole", by: claire },
        { name: "Pastèque 🍉", by: null },
      ],
    },
  ] satisfies MockSection[],
};
