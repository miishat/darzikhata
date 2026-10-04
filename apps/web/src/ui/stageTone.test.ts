import { describe, expect, it } from 'vitest';
import { stageTone } from './stageTone';

const s = (key: string) => ({ key }) as never;

describe('stageTone', () => {
  it('maps summary groups first', () => {
    expect(stageTone(s('cutting'), 'cancelled', 1)).toBe('cancelled');
    expect(stageTone(s('cutting'), 'delivered', 1)).toBe('done');
    expect(stageTone(s('cutting'), 'ready', 1)).toBe('ready');
  });
  it('maps trial and qc keys', () => {
    expect(stageTone(s('trial'), 'unfinished', 2)).toBe('trial');
    expect(stageTone(s('qc'), 'unfinished', 3)).toBe('trial');
  });
  it('first unknown stage is booked, others working', () => {
    expect(stageTone(s('custom'), 'unfinished', 0)).toBe('booked');
    expect(stageTone(s('custom'), 'unfinished', 2)).toBe('working');
    expect(stageTone(undefined, 'unfinished', 2)).toBe('working');
  });
});
