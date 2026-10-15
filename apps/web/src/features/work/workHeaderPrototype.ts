// PROTOTYPE (throwaway): the phone Work page without its own title, to match Orders and Customers. Switch with
// ?variant=0|1|2|3|4|5 on the phone Work page.
//   1 the three step tabs and the print button share one row, pinned under the header
//   2 a search box and print button pinned like Orders and Customers, the step tabs under it; the header search goes there
//   3 the step tabs pinned alone; the garment count and print sit on a quiet line under them that scrolls away
//   4 the steps become chips like the Orders status chips, with print at the end, pinned
//   5 the Orders layout exactly: search and print, then step chips, all pinned; the header search goes there
import type { Language } from '@darzikhata/domain';

export const WORK_VARIANTS = {
  '0': 'Current',
  '1': 'Step tabs and print in one pinned row',
  '2': 'Search and print, step tabs below, pinned',
  '3': 'Pinned step tabs, count and print below',
  '4': 'Step chips and print, pinned',
  '5': 'Search and print, step chips, pinned',
} as const;
export const WORK_KEYS = Object.keys(WORK_VARIANTS);

const SEARCH = { bn: 'অর্ডার, কাস্টমার বা পোশাক খুঁজুন', en: 'Search Order, Customer or Garment' };
export const searchWords = (language: Language) => (language === 'bn' ? SEARCH.bn : SEARCH.en);
