// Escape les wildcards LIKE/ILIKE Postgres (`%`, `_`, `\`) avant
// interpolation dans un pattern user-supplied. Sans ça, taper "100%"
// match tout, et "_" match n'importe quel caractère unique. La
// protection injection SQL reste assurée par Drizzle (paramètres
// liés) — on ne traite ici que la sémantique du pattern.
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}
