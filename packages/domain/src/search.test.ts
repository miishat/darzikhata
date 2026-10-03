import { describe, expect, it } from 'vitest';
import { customerMatchScore, nameKey, normalizePhone, searchCustomers } from './search';

describe('nameKey', () => {
  it.each([
    ['রহিম', 'Rahim'],
    ['করিম', 'Karim'],
    ['মোহাম্মদ', 'Muhammad'],
    ['চৌধুরী', 'Chowdhury'],
    ['শিরিন', 'Shirin'],
    ['জাহাঙ্গীর', 'Jahangir'],
    ['ফাতেমা', 'Fatema'],
    ['হোসেন', 'Hossain'],
    ['খান', 'Khan'],
    ['আহমেদ', 'Ahmed'],
    ['বাংলা', 'Bangla'],
  ])('gives %s and %s the same key', (bangla, latin) => {
    expect(nameKey(bangla)).toBe(nameKey(latin));
    expect(nameKey(bangla).length).toBeGreaterThan(0);
  });

  it('handles ড় and য় written as one or two code points', () => {
    expect(nameKey('বড়ুয়া')).toBe(nameKey('Barua'));
  });

  it('does not match different names', () => {
    expect(nameKey('Rahim')).not.toBe(nameKey('Karim'));
  });
});

describe('normalizePhone', () => {
  it('normalizes digits, separators and country code', () => {
    expect(normalizePhone('০১৭১২-৩৪৫৬৭৮')).toBe('01712345678');
    expect(normalizePhone('+880 1712 345678')).toBe('01712345678');
  });
});

describe('customer search', () => {
  const customers = [
    { id: '1', name: 'রহিম উদ্দিন', nameAlt: null, phone: '01712345678' },
    { id: '2', name: 'Karim Mia', nameAlt: 'করিম মিয়া', phone: '01812000000' },
    { id: '3', name: 'Shirin Akter', nameAlt: null, phone: null },
  ];

  it('matches phone digits typed in Bangla', () => {
    expect(customerMatchScore(customers[0]!, '৩৪৫৬')).toBe(3);
    expect(searchCustomers(customers, '৩৪৫৬').map((c) => c.id)).toEqual(['1']);
  });

  it('matches name text directly', () => {
    expect(customerMatchScore(customers[1]!, 'karim')).toBe(2);
    expect(customerMatchScore(customers[1]!, 'করিম')).toBe(2);
  });

  it('matches across scripts by sound', () => {
    expect(customerMatchScore(customers[0]!, 'Rahim')).toBe(1);
    expect(customerMatchScore(customers[2]!, 'শিরিন')).toBe(1);
  });

  it('returns nothing for empty or unmatched queries', () => {
    expect(searchCustomers(customers, '  ')).toEqual([]);
    expect(searchCustomers(customers, 'Zzz')).toEqual([]);
  });

  it('ranks better matches first and respects the limit', () => {
    const list = [
      { id: 'a', name: 'Rahima', nameAlt: null, phone: null },
      { id: 'b', name: 'রহিম', nameAlt: null, phone: null },
    ];
    expect(searchCustomers(list, 'rahim').map((c) => c.id)).toEqual(['a', 'b']);
    expect(searchCustomers(list, 'rahim', 1).map((c) => c.id)).toEqual(['a']);
  });
});
