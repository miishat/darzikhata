// PROTOTYPE (throwaway): five versions of "warn only when it matters" for the no-tailor warning on the desktop orders
// list. In all five the red warning stays only on orders that are late or due within three days. They differ in how
// the other, calm orders still show that nobody is on them. The work list opens by stage while nobody has work.
//   A  a count of the urgent ones above the table, with a link that filters to them
//   B  calm rows say "not yet" in grey instead of a dash
//   C  two levels: late in red, due soon in orange, calm rows in grey
//   D  the tailor filter shows how many have nobody, with a choice for them
//   E  the warning moves next to the delivery date; the tailor column never warns
import type { Language } from '@darzikhata/domain';

export const UNASSIGNED_VARIANTS = {
  '0': 'Current',
  A: 'Urgent count above the table',
  B: 'Calm rows say "not yet" in grey',
  C: 'Late red, due soon orange, calm grey',
  D: 'Count on the tailor filter',
  E: 'Warning beside the delivery date',
} as const;
export type UnassignedVariant = keyof typeof UNASSIGNED_VARIANTS;
export const UNASSIGNED_KEYS = Object.keys(UNASSIGNED_VARIANTS) as UnassignedVariant[];

/** Worker filter values: nobody on it, and nobody on it while late or due within three days. */
export const NOBODY = 'none';
export const NOBODY_SOON = 'none-soon';

/** The last day that counts as "due soon": three days from today. */
export function soonDay(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toISOString().slice(0, 10);
}

const TEXT = {
  bannerSoon: { bn: '{n}টি জরুরি অর্ডারে কারিগর নেই', en: '{n} urgent orders have no tailor' },
  show: { bn: 'দেখুন', en: 'Show them' },
  notYet: { bn: 'এখনো ঠিক হয়নি', en: 'Not yet' },
  filterCount: { bn: '{n}টি বাকি', en: '{n} without' },
  noTailor: { bn: 'কারিগর নেই', en: 'No tailor' },
  urgentChip: { bn: 'জরুরি, কারিগর নেই', en: 'Urgent, no tailor' },
} as const;

export function protoText(key: keyof typeof TEXT, language: Language, n?: string): string {
  const s: string = TEXT[key][language === 'bn' ? 'bn' : 'en'];
  return n === undefined ? s : s.replace('{n}', n);
}
