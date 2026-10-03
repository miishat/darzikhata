import { describe, expect, it } from 'vitest';
import { toBanglaDigits, toEnglishDigits, toScript } from './digits';

describe('digits', () => {
  it('converts Bangla digits to English digits', () => {
    expect(toEnglishDigits('০১৭১২-৩৪৫৬৭৮')).toBe('01712-345678');
  });

  it('leaves non-digit text unchanged', () => {
    expect(toEnglishDigits('রহিম 42')).toBe('রহিম 42');
  });

  it('converts English digits to Bangla digits', () => {
    expect(toBanglaDigits('A-0142')).toBe('A-০১৪২');
  });

  it('converts to a chosen script', () => {
    expect(toScript('৳2,400', 'bn')).toBe('৳২,৪০০');
    expect(toScript('৳২,৪০০', 'en')).toBe('৳2,400');
  });
});
