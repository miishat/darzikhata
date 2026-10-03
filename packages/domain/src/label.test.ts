import { describe, expect, it } from 'vitest';
import { labelIn } from './label';

describe('labelIn', () => {
  it('returns the requested language', () => {
    expect(labelIn({ bn: 'শার্ট', en: 'Shirt' }, 'en')).toBe('Shirt');
    expect(labelIn({ bn: 'শার্ট', en: 'Shirt' }, 'bn')).toBe('শার্ট');
  });

  it('falls back to the other language when one is empty', () => {
    expect(labelIn({ bn: 'ঝুল', en: '' }, 'en')).toBe('ঝুল');
    expect(labelIn({ bn: '', en: 'Length' }, 'bn')).toBe('Length');
  });
});
