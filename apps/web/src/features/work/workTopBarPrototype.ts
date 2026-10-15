// PROTOTYPE (throwaway): five layouts for the desktop Work page's own top bar (inside the card, not the app header).
// Switch with ?variant=0|1|2|3|4|5 on the desktop Work page.
//   1 laid out like Orders: title, the worker tiles, then a filter row with a new search box, group and stage on the
//     left and the list/board switch and print on the right
//   2 two rows: title and summary with every control on the right (group, stage, list/board, print), then the tiles
//   3 two slim rows: title, summary, list/board and print; then the workers as one-line pills with group and stage
//   4 one row: title and summary, then a worker dropdown, group, stage, list/board and a print icon
//   5 title beside the list/board switch with a print icon at the end; the tiles share their row with group and stage
import type { Language } from '@darzikhata/domain';

export const TOP_VARIANTS = {
  '0': 'Current',
  '1': 'Like Orders: tiles, then search and filters',
  '2': 'Controls on the title row, tiles below',
  '3': 'Slim: worker pills with group and stage',
  '4': 'One row with a worker dropdown',
  '5': 'Switch by the title, filters beside the tiles',
} as const;
export const TOP_KEYS = Object.keys(TOP_VARIANTS);

const SEARCH = { bn: 'অর্ডার, কাস্টমার বা পোশাক খুঁজুন', en: 'Search Order, Customer or Garment' };
export const searchWords = (language: Language) => (language === 'bn' ? SEARCH.bn : SEARCH.en);
