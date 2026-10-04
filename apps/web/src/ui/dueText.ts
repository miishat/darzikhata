export type Due =
  | { kind: 'late'; days: number }
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'left'; days: number };

function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/** Whole days between today and a date (YYYY-MM-DD), both in shop time. */
export function dueFrom(date: string, today: string): Due {
  const diff = Math.round(dayNumber(date) - dayNumber(today));
  if (diff < 0) return { kind: 'late', days: -diff };
  if (diff === 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'tomorrow' };
  return { kind: 'left', days: diff };
}
