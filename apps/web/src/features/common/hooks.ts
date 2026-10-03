import { can, canViewMeasurementsOf, todayInDhaka, type Capability } from '@darzikhata/domain';
import { useCurrentStaff, useSnapshot } from '../../data/StoreContext';

type CustomerGender = Parameters<typeof canViewMeasurementsOf>[1]['gender'];

/** Today's date in Dhaka as YYYY-MM-DD. */
export function useToday(): string {
  return todayInDhaka(new Date());
}

/** Whether the signed-in role holds a capability; false when nobody is signed in. */
export function useCan(): (capability: Capability) => boolean {
  const current = useCurrentStaff();
  return (capability) => (current ? can(current.role, capability) : false);
}

/** Whether the signed-in role may see a customer's measurements. */
export function useMeasurementAccess(): (customer: { gender: CustomerGender }) => boolean {
  const current = useCurrentStaff();
  const { config } = useSnapshot();
  const restrict = config?.settings.restrictFemaleMeasurements ?? false;
  return (customer) => (current ? canViewMeasurementsOf(current.role, customer, restrict) : false);
}
