import { applied, rejected, stale, type DomainEvent, type Step } from './events';
import { profileKey } from './measurements';
import type { ShopState } from './model';

type CustomerEvent = Extract<
  DomainEvent,
  { type: 'customer.created' | 'customer.updated' | 'household.created' | 'measurement.recorded' }
>;

export function reduceCustomerEvent(state: ShopState, event: CustomerEvent): Step {
  switch (event.type) {
    case 'customer.created': {
      const { customer } = event;
      if (state.customers[customer.id]) return rejected('customer-exists');
      if (!customer.name.trim()) return rejected('name-required');
      if (customer.householdId && !state.households[customer.householdId]) return rejected('unknown-household');
      return applied({
        ...state,
        customers: { ...state.customers, [customer.id]: { ...customer, createdAt: event.at, version: 1 } },
      });
    }

    case 'customer.updated': {
      const current = state.customers[event.customerId];
      if (!current) return rejected('unknown-customer');
      if (current.version !== event.baseVersion) return stale(current.version);
      if (event.changes.name !== undefined && !event.changes.name.trim()) return rejected('name-required');
      if (event.changes.householdId && !state.households[event.changes.householdId]) {
        return rejected('unknown-household');
      }
      return applied({
        ...state,
        customers: {
          ...state.customers,
          [current.id]: { ...current, ...event.changes, version: current.version + 1 },
        },
      });
    }

    case 'household.created': {
      const { household } = event;
      if (state.households[household.id]) return rejected('household-exists');
      if (!household.label.trim()) return rejected('label-required');
      return applied({
        ...state,
        households: { ...state.households, [household.id]: { ...household, createdAt: event.at } },
      });
    }

    case 'measurement.recorded': {
      if (!state.customers[event.customerId]) return rejected('unknown-customer');
      const values = Object.values(event.version.values);
      if (values.some((v) => !Number.isFinite(v.value) || v.value <= 0)) return rejected('invalid-measurement');
      const key = profileKey(event.customerId, event.templateId);
      const profile = state.profiles[key] ?? { customerId: event.customerId, templateId: event.templateId, versions: [] };
      if (profile.versions.some((v) => v.id === event.version.id)) return rejected('version-exists');
      return applied({
        ...state,
        profiles: { ...state.profiles, [key]: { ...profile, versions: [...profile.versions, event.version] } },
      });
    }
  }
}
