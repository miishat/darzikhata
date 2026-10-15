// PROTOTYPE (throwaway): the phone Orders page without its "Orders" heading, the sort beside the search box, and what
// to do about the header search there. Switch with ?variant=0|1|2|3|4|5 on the phone Orders page.
//   1 sort as a round icon beside the search; the header search stays
//   2 as 1, but the header search is hidden on Orders, so the page has one search
//   3 sort as a pill that names the order ("Newest First") beside a shorter search; header search hidden
//   4 as 2, and the search, sort and status chips stay pinned under the header while the list scrolls
//   5 as 1, but the header search icon on Orders jumps to the page's own search box instead of opening a new screen
export const ORDERS_VARIANTS = {
  '0': 'Current',
  '1': 'Sort icon beside search, header search stays',
  '2': 'Sort icon beside search, no header search here',
  '3': 'Sort pill beside search, no header search here',
  '4': 'Pinned search, sort and chips, no header search here',
  '5': 'Header search jumps to the page search',
} as const;
export const ORDERS_KEYS = Object.keys(ORDERS_VARIANTS);
/** The id of the Orders page search box, for variant 5. */
export const ORDERS_SEARCH_ID = 'prototype-orders-search';
