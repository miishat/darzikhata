import { describe, expect, it } from 'vitest';
import { formatOrderNumber, isValidSeries, nextOrderNumber, orderNumberMatches, parseOrderNumber } from './numbering';

describe('order numbering', () => {
  it('validates series letters', () => {
    expect(isValidSeries('A')).toBe(true);
    expect(isValidSeries('AB')).toBe(true);
    expect(isValidSeries('a')).toBe(false);
    expect(isValidSeries('ABC')).toBe(false);
    expect(isValidSeries('1')).toBe(false);
  });

  it('formats and parses numbers', () => {
    expect(formatOrderNumber('A', 142)).toBe('A-0142');
    expect(formatOrderNumber('B', 12345)).toBe('B-12345');
    expect(parseOrderNumber('A-0142')).toEqual({ series: 'A', n: 142 });
    expect(parseOrderNumber('nonsense')).toBeNull();
  });

  it('continues the device series and ignores other series', () => {
    expect(nextOrderNumber([], 'A')).toBe('A-0001');
    expect(nextOrderNumber(['A-0001', 'A-0007', 'B-0040'], 'A')).toBe('A-0008');
    expect(nextOrderNumber(['A-0001', 'A-0007', 'B-0040'], 'B')).toBe('B-0041');
  });

  it('never issues the same number on two devices', () => {
    const existing = ['A-0001', 'B-0001'];
    expect(nextOrderNumber(existing, 'A')).not.toBe(nextOrderNumber(existing, 'B'));
  });

  it('rejects invalid series', () => {
    expect(() => nextOrderNumber([], 'a')).toThrow('Invalid series: a');
  });
});

describe('orderNumberMatches', () => {
  it.each(['A-0142', 'a-142', 'a142', '142', '১৪২', ' A-০১৪২ '])('matches %s', (query) => {
    expect(orderNumberMatches('A-0142', query)).toBe(true);
  });

  it.each(['B-0142', '14', '', 'A-0143'])('does not match %s', (query) => {
    expect(orderNumberMatches('A-0142', query)).toBe(false);
  });
});
