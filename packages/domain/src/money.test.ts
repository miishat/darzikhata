import { describe, expect, it } from 'vitest';
import { formatTaka, groupLakh, isPoisha, parseTaka, takaToPoisha } from './money';

describe('money', () => {
  it('converts taka to integer poisha without float drift', () => {
    expect(takaToPoisha(2400)).toBe(240000);
    expect(takaToPoisha(0.29)).toBe(29);
    expect(takaToPoisha(19.99)).toBe(1999);
  });

  it('recognises integer poisha only', () => {
    expect(isPoisha(100)).toBe(true);
    expect(isPoisha(10.5)).toBe(false);
  });

  it('groups digits in lakh style', () => {
    expect(groupLakh('999')).toBe('999');
    expect(groupLakh('2400')).toBe('2,400');
    expect(groupLakh('1234567')).toBe('12,34,567');
    expect(groupLakh('123456789')).toBe('12,34,56,789');
  });

  it('formats taka in Bangla and English digits', () => {
    expect(formatTaka(240000)).toBe('৳২,৪০০');
    expect(formatTaka(240000, 'en')).toBe('৳2,400');
    expect(formatTaka(123456789, 'en')).toBe('৳12,34,567.89');
    expect(formatTaka(-50000, 'en')).toBe('-৳500');
    expect(formatTaka(0, 'en')).toBe('৳0');
  });

  it('rejects non-integer amounts when formatting', () => {
    expect(() => formatTaka(10.5)).toThrow();
  });

  it('parses typed taka in either script', () => {
    expect(parseTaka('২,৪০০')).toBe(240000);
    expect(parseTaka('2400.50')).toBe(240050);
    expect(parseTaka('৳ 1,000')).toBe(100000);
    expect(parseTaka('12.345')).toBeNull();
    expect(parseTaka('abc')).toBeNull();
    expect(parseTaka('')).toBeNull();
    expect(parseTaka('-5')).toBeNull();
  });
});

describe('parseTaka limits', () => {
  it('returns null instead of throwing for amounts beyond safe poisha', () => {
    expect(parseTaka('12345678901234567890')).toBeNull();
  });
});
