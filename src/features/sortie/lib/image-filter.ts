/**
 * Filtre CSS appliqué à toutes les images d'événement (poster, hero,
 * thumbnail). Donne une cohérence visuelle malgré les sources hétérogènes
 * (Ticketmaster, Fnac, AllOcc, uploads users), chacune avec sa propre
 * balance colorimétrique. Centralisé pour qu'un tweak global se fasse
 * en un endroit.
 *
 * Pas appliqué aux past quand un grayscale est posé : le grayscale prend
 * le dessus et l'effet du saturate est perdu.
 *
 * Default à 1.05 : volontairement subtil pour ne pas cannibaliser la
 * colorimétrie native de l'affiche (un opéra pastel n'a pas à être tiré
 * vers du criard pour entrer dans le registre acide de l'app). Le
 * `_FULLBLEED` à 1.15 est réservé au hero page event où le scrim 95%
 * en pied absorbe le pump et où l'image doit "vendre" l'event à un
 * visiteur qui arrive par lien WhatsApp froid.
 */
export const OUTING_IMAGE_FILTER = "saturate(1.05) contrast(1.05)";

export const OUTING_IMAGE_FILTER_FULLBLEED = "saturate(1.15) contrast(1.05)";
