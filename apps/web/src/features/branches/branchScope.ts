import { can, canAccessBranch, type Branch, type Role, type ShopConfig, type ShopState, type Staff } from '@darzikhata/domain';

/** Which branch the lists show: one branch's id, or 'all' the person may see. */
export type BranchChoice = 'all' | string;

/** Branches this person may see: every branch with 'branches.view.all', otherwise the ones they work in. */
export function allowedBranches(config: ShopConfig, staff: Staff, role: Role): Branch[] {
  if (can(role, 'branches.view.all')) return config.branches;
  return config.branches.filter((b) => canAccessBranch(staff, b.id));
}

/** The saved choice while it is still allowed; otherwise all branches when there are several, or the only one. */
export function resolveChoice(saved: string | null, allowed: Branch[]): BranchChoice {
  if (allowed.length === 1) return allowed[0]!.id;
  if (saved && allowed.some((b) => b.id === saved)) return saved;
  return 'all';
}

export function branchIdsFor(choice: BranchChoice, allowed: Branch[]): string[] {
  return choice === 'all' ? allowed.map((b) => b.id) : allowed.filter((b) => b.id === choice).map((b) => b.id);
}

/** The state with only these branches' orders. Customers belong to the whole shop and stay. */
export function scopeState(state: ShopState, branchIds: readonly string[]): ShopState {
  const orders = Object.values(state.orders);
  if (orders.every((o) => branchIds.includes(o.branchId))) return state;
  return { ...state, orders: Object.fromEntries(orders.filter((o) => branchIds.includes(o.branchId)).map((o) => [o.id, o])) };
}
