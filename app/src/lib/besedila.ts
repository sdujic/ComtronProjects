// Slovensko sklanjanje "prosto mesto" po številu (1 = ednina, 2 = dvojina,
// 3-4 = množina, 5+ = rodilnik množine) - client-safe (brez server uvozov).
export function besedilaProstaMesta(n: number): string {
  if (n <= 0) return "Ni prostih mest";
  if (n === 1) return "Le še eno prosto mesto!";
  if (n === 2) return "Še 2 prosti mesti";
  if (n === 3 || n === 4) return `Še ${n} prosta mesta`;
  return `Še ${n} prostih mest`;
}
