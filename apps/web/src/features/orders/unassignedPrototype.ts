// PROTOTYPE (throwaway): five ways to quiet the "no tailor assigned" warning on the desktop orders list, and to group
// the work list by stage until somebody has been given work. The same ?variant= switches both pages.
//   1 one banner above the orders table, the column goes quiet
//   2 a "no tailor" tile next to the status tiles, the column goes quiet
//   3 a "no tailor yet" choice in the tailor filter, the column hidden while nobody has a tailor
//   4 the column warns only when the order is late or due within three days
//   5 no column: a quiet line under the order number, and the work list says why it is grouped by stage
import type { Language } from '@darzikhata/domain';

export const UNASSIGNED_VARIANTS = {
  '0': 'Current',
  '1': 'One banner above the table',
  '2': 'A "no tailor" tile beside the status tiles',
  '3': 'A choice in the tailor filter, column hidden until used',
  '4': 'Warn only when late or due within 3 days',
  '5': 'Quiet line under the order number, work list explains',
} as const;
export type UnassignedVariant = keyof typeof UNASSIGNED_VARIANTS;
export const UNASSIGNED_KEYS = Object.keys(UNASSIGNED_VARIANTS) as UnassignedVariant[];

/** The worker filter value for "nobody yet". */
export const NOBODY = 'none';

const TEXT = {
  banner: { bn: '{n}টি অর্ডারে কারিগর ঠিক হয়নি', en: '{n} orders have no tailor yet' },
  show: { bn: 'দেখুন', en: 'Show them' },
  tile: { bn: 'কারিগর বাকি', en: 'No tailor' },
  line: { bn: 'কারিগর বাকি', en: 'No tailor yet' },
  hint: {
    bn: 'এখনো কাউকে কাজ দেওয়া হয়নি, তাই ধাপ অনুযায়ী সাজানো। কারিগর ঠিক করলে কারিগর অনুযায়ী দেখাবে।',
    en: 'Nobody has been given work yet, so this is grouped by stage. It groups by tailor once tailors are assigned.',
  },
} as const;

export function protoText(key: keyof typeof TEXT, language: Language, n?: string): string {
  const s: string = TEXT[key][language === 'bn' ? 'bn' : 'en'];
  return n === undefined ? s : s.replace('{n}', n);
}
