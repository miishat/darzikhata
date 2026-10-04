import { isOrderClosed, overdueItems, type ShopState } from '@darzikhata/domain';

export interface NavCounts {
  /** Orders with a garment not yet delivered or cancelled. */
  openOrders: number;
  /** Unfinished garments past their delivery date. */
  lateGarments: number;
}

/** The sidebar's two counts, over the state it is given (already scoped to the chosen branches). */
export function navCounts(state: ShopState, today: string): NavCounts {
  const orders = Object.values(state.orders);
  return {
    openOrders: orders.filter((o) => !isOrderClosed(o)).length,
    lateGarments: overdueItems(orders, today).length,
  };
}
