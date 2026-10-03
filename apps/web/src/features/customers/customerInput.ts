import { normalizePhone, type Customer, type CustomerChanges, type EventBody, type Gender } from '@darzikhata/domain';

/** Select value meaning "create a new household with the typed label". */
export const NEW_HOUSEHOLD = '__new';

export interface CustomerInput {
  name: string;
  nameAlt: string;
  phone: string;
  gender: Gender | null;
  /** An existing household id, NEW_HOUSEHOLD, or null for none. */
  householdId: string | null;
  newHousehold: string;
  notes: string;
}

export type CustomerInputErrors = Partial<Record<'name' | 'phone' | 'newHousehold', 'required' | 'invalid'>>;

/** Empty is fine (the phone is optional); otherwise an 11-digit Bangladeshi mobile number in either script. */
export function isValidPhone(input: string): boolean {
  return !input.trim() || /^01\d{9}$/.test(normalizePhone(input));
}

export function emptyCustomerInput(): CustomerInput {
  return { name: '', nameAlt: '', phone: '', gender: null, householdId: null, newHousehold: '', notes: '' };
}

export function customerInputFrom(customer: Customer): CustomerInput {
  return {
    name: customer.name,
    nameAlt: customer.nameAlt ?? '',
    phone: customer.phone ?? '',
    gender: customer.gender,
    householdId: customer.householdId,
    newHousehold: '',
    notes: customer.notes,
  };
}

export function validateCustomerInput(input: CustomerInput): CustomerInputErrors {
  const errors: CustomerInputErrors = {};
  if (!input.name.trim()) errors.name = 'required';
  if (!isValidPhone(input.phone)) errors.phone = 'invalid';
  if (input.householdId === NEW_HOUSEHOLD && !input.newHousehold.trim()) errors.newHousehold = 'required';
  return errors;
}

/**
 * Events that save the form: an optional new household, then the customer. Editing sends only
 * the fields that changed, based on the version the form was opened with, so a change made
 * elsewhere in the meantime is detected instead of overwritten. No changes means no events.
 */
export function customerEvents(
  input: CustomerInput,
  ctx: { existing: Customer | null; baseVersion: number | null; newId(): string },
): { customerId: string; events: EventBody[] } {
  const events: EventBody[] = [];
  let householdId = input.householdId;
  if (householdId === NEW_HOUSEHOLD) {
    householdId = ctx.newId();
    events.push({ type: 'household.created', household: { id: householdId, label: input.newHousehold.trim() } });
  }
  const values = {
    name: input.name.trim(),
    nameAlt: input.nameAlt.trim() || null,
    phone: input.phone.trim() ? normalizePhone(input.phone) : null,
    householdId,
    gender: input.gender,
    notes: input.notes.trim(),
  };

  if (!ctx.existing) {
    const customerId = ctx.newId();
    events.push({ type: 'customer.created', customer: { id: customerId, ...values } });
    return { customerId, events };
  }

  const existing = ctx.existing;
  const changes: CustomerChanges = {};
  for (const key of Object.keys(values) as Array<keyof typeof values>) {
    if (values[key] !== existing[key]) (changes as Record<string, unknown>)[key] = values[key];
  }
  if (Object.keys(changes).length > 0) {
    events.push({ type: 'customer.updated', customerId: existing.id, baseVersion: ctx.baseVersion ?? existing.version, changes });
  }
  return { customerId: existing.id, events };
}
