import { describe, expect, it } from 'vitest';
import { fitWithin } from './photos';

describe('fitWithin', () => {
  it('scales the longest side down to the limit, keeping the shape', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });
});
