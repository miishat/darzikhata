import { describe, expect, it } from 'vitest';
import { customerName } from './customerName';

describe('customerName', () => {
  it('uses the English name in English when there is one, otherwise the main name', () => {
    expect(customerName({ name: 'আয়েশা সিদ্দিকা', nameAlt: 'Ayesha Siddika' }, 'en')).toBe('Ayesha Siddika');
    expect(customerName({ name: 'আয়েশা সিদ্দিকা', nameAlt: 'Ayesha Siddika' }, 'bn')).toBe('আয়েশা সিদ্দিকা');
    expect(customerName({ name: 'আয়েশা সিদ্দিকা', nameAlt: null }, 'en')).toBe('আয়েশা সিদ্দিকা');
    expect(customerName({ name: 'আয়েশা সিদ্দিকা', nameAlt: '  ' }, 'en')).toBe('আয়েশা সিদ্দিকা');
  });
});
