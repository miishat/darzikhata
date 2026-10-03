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
 * Move a form onto the current customer after a conflict: fields the person edited keep their
 * typed value, untouched fields take the current value, and the current values become the new
 * starting point that later edits are diffed against.
 */
export function rebaseCustomerInput(
  input: CustomerInput,
  start: CustomerInput,
  current: Customer,
): { input: CustomerInput; start: CustomerInput } {
  const newStart = customerInputFrom(current);
  const next = { ...newStart } as Record<string, unknown>;
  for (const key of Object.keys(input) as Array<keyof CustomerInput>) {
    if (input[key] !== start[key]) next[key] = input[key];
  }
  return { input: next as unknown as CustomerInput, start: newStart };
}

function savedValues(input: CustomerInput, householdId: string | null) {
  return {
    name: input.name.trim(),
    nameAlt: input.nameAlt.trim() || null,
    phone: input.phone.trim() ? normalizePhone(input.phone) : null,
    householdId,
    gender: input.gender,
    notes: input.notes.trim(),
  };
}

/**
 * Events that save the form: an optional new household, then the customer. Editing sends only
 * the fields that changed from the form's starting values, based on the version the form was opened with, so a change made
 * elsewhere in the meantime is detected instead of overwritten. No changes means no events.
 */
export function customerEvents(
  input: CustomerInput,
  ctx: { existing: Customer | null; start: CustomerInput | null; baseVersion: number | null; newId(): string },
): { customerId: string; events: EventBody[] } {
  const events: EventBody[] = [];
  let householdId = input.householdId;
  if (householdId === NEW_HOUSEHOLD) {
    householdId = ctx.newId();
    events.push({ type: 'household.created', household: { id: householdId, label: input.newHousehold.trim() } });
  }
  const values = savedValues(input, householdId);

  if (!ctx.existing) {
    const customerId = ctx.newId();
    events.push({ type: 'customer.created', customer: { id: customerId, ...values } });
    return { customerId, events };
  }

  const existing = ctx.existing;
  const before = savedValues(ctx.start ?? customerInputFrom(existing), (ctx.start ?? customerInputFrom(existing)).householdId);
  const changes: CustomerChanges = {};
  for (const key of Object.keys(values) as Array<keyof typeof values>) {
    if (values[key] !== before[key]) (changes as Record<string, unknown>)[key] = values[key];
  }
  if (Object.keys(changes).length > 0) {
    events.push({ type: 'customer.updated', customerId: existing.id, baseVersion: ctx.baseVersion ?? existing.version, changes });
  }
  return { customerId: existing.id, events };
}
