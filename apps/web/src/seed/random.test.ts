import { describe, expect, it } from 'vitest';
import { createRng } from './random';

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('differs between seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('keeps int within bounds and picks from the list', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const n = rng.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
      expect(['x', 'y']).toContain(rng.pick(['x', 'y']));
    }
  });

  it('respects chance extremes', () => {
    const rng = createRng(9);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });
});
