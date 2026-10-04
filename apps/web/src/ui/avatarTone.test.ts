import { describe, expect, it } from 'vitest';
import { avatarTone } from './avatarTone';

describe('avatarTone', () => {
  it('is stable for an id', () => expect(avatarTone('abc')).toEqual(avatarTone('abc')));
  it('uses several tones across ids', () => {
    const set = new Set(Array.from({ length: 40 }, (_, i) => avatarTone(`cust-${i}`).bg));
    expect(set.size).toBeGreaterThan(1);
    expect(set.size).toBeLessThanOrEqual(6);
  });
});
