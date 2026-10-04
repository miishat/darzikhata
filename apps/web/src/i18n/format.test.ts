import { describe, expect, it } from 'vitest';
import { formatDateTime } from './format';

describe('Date and time', () => {
  it('shows a timestamp in Dhaka time, in either script', () => {
    expect(formatDateTime('2026-10-03T06:05:00.000Z', 'bn')).toBe('৩ অক্টোবর, ১২:০৫');
    expect(formatDateTime('2026-10-03T06:05:00.000Z', 'en')).toBe('3 Oct, 12:05');
  });

  it('moves to the next day after 6 pm UTC', () => {
    expect(formatDateTime('2026-10-03T18:30:00.000Z', 'en')).toBe('4 Oct, 00:30');
  });
});
