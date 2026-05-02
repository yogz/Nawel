/**
 * Filtre CSS appliqué à toutes les images d'événement (poster, hero,
 * thumbnail). Donne une cohérence visuelle malgré les sources hétérogènes
 * (Ticketmaster, Fnac, AllOcc, uploads users), chacune avec sa propre
 * balance colorimétrique. Centralisé pour qu'un tweak global se fasse
 * en un endroit.
 *
 * Pas appliqué aux past quand un grayscale est posé : le grayscale prend
 * le dessus et l'effet du saturate est perdu.
 */
export const OUTING_IMAGE_FILTER = "saturate(1.15) contrast(1.05)";
