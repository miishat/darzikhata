import { describe, expect, it } from 'vitest';
import { dueFrom } from './dueText';

describe('dueFrom', () => {
  it('late by 2', () => expect(dueFrom('2026-03-08', '2026-03-10')).toEqual({ kind: 'late', days: 2 }));
  it('today', () => expect(dueFrom('2026-03-10', '2026-03-10')).toEqual({ kind: 'today' }));
  it('tomorrow', () => expect(dueFrom('2026-03-11', '2026-03-10')).toEqual({ kind: 'tomorrow' }));
  it('9 days left', () => expect(dueFrom('2026-03-19', '2026-03-10')).toEqual({ kind: 'left', days: 9 }));
  it('across a month end', () => {
    expect(dueFrom('2026-03-02', '2026-02-27')).toEqual({ kind: 'left', days: 3 });
    expect(dueFrom('2026-02-27', '2026-03-02')).toEqual({ kind: 'late', days: 3 });
    expect(dueFrom('2026-04-01', '2026-03-31')).toEqual({ kind: 'tomorrow' });
  });
});
