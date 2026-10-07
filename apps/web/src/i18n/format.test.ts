import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDayDate, formatTime } from './format';

describe('Date and time', () => {
  it('shows a timestamp in Dhaka time, in either script', () => {
    expect(formatDateTime('2026-10-03T06:05:00.000Z', 'bn')).toBe('৩ অক্টোবর, ১২:০৫');
    expect(formatDateTime('2026-10-03T06:05:00.000Z', 'en')).toBe('3 Oct, 12:05');
  });

  it('moves to the next day after 6 pm UTC', () => {
    expect(formatDateTime('2026-10-03T18:30:00.000Z', 'en')).toBe('4 Oct, 00:30');
  });

  it('shows the time alone and the weekday with the date for the sign-in clock', () => {
    expect(formatTime('2026-10-07T12:40:00.000Z', 'bn')).toBe('১৮:৪০');
    expect(formatDayDate('2026-10-07T12:40:00.000Z', 'bn')).toBe('বুধবার, ৭ অক্টোবর');
    expect(formatDayDate('2026-10-07T12:40:00.000Z', 'en')).toBe('Wednesday, 7 Oct');
    expect(formatDayDate('2026-10-07T18:30:00.000Z', 'en')).toBe('Thursday, 8 Oct');
  });
});
