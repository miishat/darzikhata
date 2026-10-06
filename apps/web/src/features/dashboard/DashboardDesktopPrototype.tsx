// PROTOTYPE (throwaway): desktop Home looks, switched with ?variant=. Lives on prototype/dashboard-desktop only.
// Every variant is the current Home (A) with its four lists styled differently.

export const DASHBOARD_VARIANTS = {
  A: 'Current',
  B: 'A + icons, tinted headers, 8 rows',
  C: 'C with D headers, rows that fit + more',
  D: 'C with colour band headers, slimmer top',
  E: 'A + icons, accent edge, 7 rows + more',
} as const;

export interface Look {
  /** How the list headers stand out. */
  header: 'tint' | 'band' | 'accent';
  /** Rows shown per list; ignored when the lists fill the screen. */
  limit: number;
  /** The page fits the screen and each list scrolls inside its card, showing every row. */
  fill?: boolean;
  /** Shorter today panel and money card, for more list room. */
  slimTop?: boolean;
  /** A "+N more" footer under a cut-off list. */
  more?: boolean;
  /** Show only the rows that fit the card, with a "+N more" footer; nothing scrolls. */
  fit?: boolean;
}

export const LOOKS: Record<string, Look> = {
  B: { header: 'tint', limit: 8 },
  C: { header: 'band', limit: 99, fill: true, fit: true },
  D: { header: 'band', limit: 99, fill: true, slimTop: true },
  E: { header: 'accent', limit: 7, more: true },
};
