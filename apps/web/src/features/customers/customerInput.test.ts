import { describe, expect, it } from 'vitest';
import {
  customerEvents,
  customerInputFrom,
  emptyCustomerInput,
  isValidPhone,
  NEW_HOUSEHOLD,
  validateCustomerInput,
  type CustomerInput,
} from './customerInput';

const existing = {
  id: 'c1', name: 'রহিম উদ্দিন', nameAlt: 'Rahim Uddin', phone: '01712345678', householdId: null,
  gender: 'male' as const, notes: '', createdAt: '', version: 3,
};

let n = 0;
const newId = () => `id-${++n}`;

describe('isValidPhone', () => {
  it('accepts an empty phone or an 11-digit mobile number in either script', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('01712345678')).toBe(true);
    expect(isValidPhone('০১৭১২-৩৪৫৬৭৮')).toBe(true);
    expect(isValidPhone('+880 1712 345678')).toBe(true);
    expect(isValidPhone('1712345678')).toBe(false);
    expect(isValidPhone('0171234')).toBe(false);
  });
});

describe('validateCustomerInput', () => {
  it('needs a name, a readable phone and a label for a new household', () => {
    const input: CustomerInput = { ...emptyCustomerInput(), phone: '123', householdId: NEW_HOUSEHOLD };
    expect(validateCustomerInput(input)).toEqual({ name: 'required', phone: 'invalid', newHousehold: 'required' });
    expect(validateCustomerInput({ ...emptyCustomerInput(), name: 'করিম' })).toEqual({});
  });
});

describe('customerEvents', () => {
  it('creates a customer with a new household, storing the phone in plain digits', () => {
    n = 0;
    const input: CustomerInput = {
      ...emptyCustomerInput(),
      name: ' সুমি ',
      phone: '০১৮১১ ০০০০০০',
      gender: 'female',
      householdId: NEW_HOUSEHOLD,
      newHousehold: ' রহমান পরিবার ',
    };
    expect(customerEvents(input, { existing: null, baseVersion: null, newId })).toEqual({
      customerId: 'id-2',
      events: [
        { type: 'household.created', household: { id: 'id-1', label: 'রহমান পরিবার' } },
        {
          type: 'customer.created',
          customer: { id: 'id-2', name: 'সুমি', nameAlt: null, phone: '01811000000', householdId: 'id-1', gender: 'female', notes: '' },
        },
      ],
    });
  });

  it('sends only changed fields, based on the version the form was opened with', () => {
    const input = { ...customerInputFrom(existing), phone: '01799999999', notes: 'ঢিলা পছন্দ করেন' };
    expect(customerEvents(input, { existing, baseVersion: 2, newId }).events).toEqual([
      { type: 'customer.updated', customerId: 'c1', baseVersion: 2, changes: { phone: '01799999999', notes: 'ঢিলা পছন্দ করেন' } },
    ]);
  });

  it('sends nothing when nothing changed', () => {
    expect(customerEvents(customerInputFrom(existing), { existing, baseVersion: 3, newId }).events).toEqual([]);
  });

  it('can clear optional fields', () => {
    const input = { ...customerInputFrom(existing), nameAlt: ' ', phone: '' };
    expect(customerEvents(input, { existing, baseVersion: 3, newId }).events[0]).toMatchObject({
      changes: { nameAlt: null, phone: null },
    });
  });
});
