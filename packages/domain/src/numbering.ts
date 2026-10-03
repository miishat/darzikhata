import { toEnglishDigits } from './digits';

/**
 * Each device has its own series letter(s), so numbers issued offline are final:
 * device A issues A-0001, A-0002...; device B issues B-0001... They never collide.
 */
export function isValidSeries(series: string): boolean {
  return /^[A-Z]{1,2}$/.test(series);
}

export function formatOrderNumber(series: string, n: number): string {
  return `${series}-${String(n).padStart(4, '0')}`;
}

export function parseOrderNumber(value: string): { series: string; n: number } | null {
  const match = /^([A-Z]{1,2})-?(\d+)$/.exec(toEnglishDigits(value).trim().toUpperCase());
  return match ? { series: match[1]!, n: Number(match[2]) } : null;
}

export function nextOrderNumber(existing: Iterable<string>, series: string): string {
  if (!isValidSeries(series)) throw new Error(`Invalid series: ${series}`);
  let highest = 0;
  for (const number of existing) {
    const parsed = parseOrderNumber(number);
    if (parsed && parsed.series === series) highest = Math.max(highest, parsed.n);
  }
  return formatOrderNumber(series, highest + 1);
}

/** Matches "A-0142" for queries like "A-0142", "a-142", "a142", "142" or "১৪২". */
export function orderNumberMatches(number: string, query: string): boolean {
  const q = toEnglishDigits(query).trim().toUpperCase();
  if (!q) return false;
  const target = parseOrderNumber(number);
  if (!target) return number.toUpperCase().includes(q);
  if (/^\d+$/.test(q)) return target.n === Number(q);
  const parsed = parseOrderNumber(q);
  return parsed !== null && parsed.series === target.series && parsed.n === target.n;
}
