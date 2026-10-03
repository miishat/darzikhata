/**
 * A short, stable key for a new record, made from its English name: "Back neck" becomes
 * "back-neck". Falls back when the name gives nothing usable (for example, a Bangla-only
 * name), and adds -2, -3, ... when the key is taken.
 */
export function slugKey(text: string, taken: Iterable<string>, fallback: string): string {
  const used = new Set(taken);
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback;
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
