import type { Vibe } from "./vibe-config";

// Banque d'images génériques par catégorie. Servies depuis le CDN Unsplash
// (le hotlink direct est explicitement autorisé par leur licence) avec un
// crop 1200x800 — taille suffisante pour le hero d'une sortie sans peser
// sur la bande passante. Le `credit` est conservé pour pouvoir afficher
// l'attribution côté UI à terme (Unsplash recommande sans l'imposer).
//
// Comment remplacer un set : ouvrir l'URL Unsplash de la photo, prendre
// l'identifiant (segment après /photos/) et construire l'URL via
// `https://images.unsplash.com/photo-{id}?w=1200&h=800&fit=crop&q=80`.
//
// Volume : 6 images par catégorie. Assez pour que deux sorties
// consécutives dans la même catégorie n'aient pas la même tuile, sans
// alourdir le bundle (ce module est pure data, ~3 Ko gzippé).

export type GenericEventImage = {
  url: string;
  credit: string;
};

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&h=800&fit=crop&q=80`;

const THEATRE: ReadonlyArray<GenericEventImage> = [
  { url: IMG("1503095396549-807759245b35"), credit: "Rob Laughter" },
  { url: IMG("1507924538820-ede94a04019d"), credit: "Kilyan Sockalingum" },
  { url: IMG("1514306191717-452ec28c7814"), credit: "Gwen Ong" },
  { url: IMG("1499364615650-ec38552f4f34"), credit: "Erik Mclean" },
  { url: IMG("1460723237483-7a6dc9d0b212"), credit: "Kyle Head" },
  { url: IMG("1542644096-8ea71b0e4a2e"), credit: "Marc Schaefer" },
];

const OPERA: ReadonlyArray<GenericEventImage> = [
  { url: IMG("1580237072617-771c3ecc4a24"), credit: "Quino Al" },
  { url: IMG("1465847899084-d164df4dedc6"), credit: "Manuel Nägeli" },
  { url: IMG("1571974599782-87624638275e"), credit: "Charles De Luvio" },
  { url: IMG("1578774204375-cce2ee338219"), credit: "Hieu Vu Minh" },
  { url: IMG("1499415479124-43c32433a620"), credit: "Mick Haupt" },
  { url: IMG("1519682337058-a94d519337bc"), credit: "Carlos Quintero" },
];

const CONCERT: ReadonlyArray<GenericEventImage> = [
  { url: IMG("1501386761578-eac5c94b800a"), credit: "Aditya Chinchure" },
  { url: IMG("1470229722913-7c0e2dbbafd3"), credit: "Vishnu R Nair" },
  { url: IMG("1429962714451-bb934ecdc4ec"), credit: "Anthony Delanoix" },
  { url: IMG("1493225457124-a3eb161ffa5f"), credit: "Hanny Naibaho" },
  { url: IMG("1459749411175-04bf5292ceea"), credit: "Yvette de Wit" },
  { url: IMG("1516450360452-9312f5e86fc7"), credit: "Marcela Laskoski" },
];

const CINE: ReadonlyArray<GenericEventImage> = [
  { url: IMG("1489599849927-2ee91cede3ba"), credit: "Felix Mooneeram" },
  { url: IMG("1517604931442-7e0c8ed2963c"), credit: "Krists Luhaers" },
  { url: IMG("1485095329183-d0797cdc5676"), credit: "Karen Zhao" },
  { url: IMG("1542204165-65bf26472b9b"), credit: "Geoffrey Moe" },
  { url: IMG("1440404653325-ab127d49abc1"), credit: "Roman Kraft" },
  { url: IMG("1478720568477-152d9b164e26"), credit: "Myke Simon" },
];

const EXPO: ReadonlyArray<GenericEventImage> = [
  { url: IMG("1545987796-200677ee1011"), credit: "Antenna" },
  { url: IMG("1565060169187-5284992c5fe7"), credit: "Cesira Alvarado" },
  { url: IMG("1503454537195-1dcabb73ffb9"), credit: "Stéphan Valentin" },
  { url: IMG("1499209974431-9dddcece7f88"), credit: "Christian Fregnan" },
  { url: IMG("1577720580479-7d839d829c73"), credit: "Karina Tess" },
  { url: IMG("1501286353178-1ec881214838"), credit: "Yusuf Onuk" },
];

// "autre" : un mix volontairement neutre (cocktail, place, terrasse) pour
// les sorties hors catégorie culturelle. On évite tout visuel trop typé
// (sport, mariage…) qui surprendrait sur une sortie culturelle mal
// catégorisée.
const AUTRE: ReadonlyArray<GenericEventImage> = [
  { url: IMG("1543007630-9710e4a00a20"), credit: "Aleksandr Popov" },
  { url: IMG("1470337458703-46ad1756a187"), credit: "Bence Boros" },
  { url: IMG("1414235077428-338989a2e8c0"), credit: "Patrick Tomasso" },
  { url: IMG("1517457373958-b7bdd4587205"), credit: "Yutacar" },
  { url: IMG("1475518112798-86d72b9e92b1"), credit: "Quentin Dr" },
  { url: IMG("1530103862676-de8c9debad1d"), credit: "Aleksandr Popov" },
];

const BY_VIBE: Record<Vibe, ReadonlyArray<GenericEventImage>> = {
  theatre: THEATRE,
  opera: OPERA,
  concert: CONCERT,
  cine: CINE,
  expo: EXPO,
  autre: AUTRE,
};

/**
 * Renvoie la banque d'images correspondant à la catégorie demandée. Quand
 * la catégorie est nulle (l'utilisateur n'a pas encore choisi), on tombe
 * sur "autre" plutôt que de renvoyer un tableau vide — l'UX du picker
 * doit toujours avoir quelque chose à afficher.
 */
export function getGenericImagesForVibe(vibe: Vibe | null): ReadonlyArray<GenericEventImage> {
  return BY_VIBE[vibe ?? "autre"];
}
