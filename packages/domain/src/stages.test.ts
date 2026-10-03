import { describe, expect, it } from 'vitest';
import { checkTransition, stageGroup, validateStages, type Stage } from './stages';

const s = (key: string, group: Stage['group'], optional = false): Stage => ({
  key,
  label: { bn: key, en: key },
  optional,
  group,
});

const shirt: Stage[] = [
  s('booked', 'unfinished'),
  s('cutting', 'unfinished'),
  s('stitching', 'unfinished'),
  s('trial', 'unfinished', true),
  s('ready', 'ready'),
  s('delivered', 'delivered'),
];

describe('validateStages', () => {
  it('accepts a standard list', () => {
    expect(validateStages(shirt)).toEqual([]);
  });

  it('accepts a short alteration list', () => {
    const alteration = [s('booked', 'unfinished'), s('working', 'unfinished'), s('ready', 'ready'), s('delivered', 'delivered')];
    expect(validateStages(alteration)).toEqual([]);
  });

  it('reports structural problems', () => {
    expect(validateStages([])).toEqual(['no-stages']);
    expect(validateStages([s('ready', 'ready'), s('delivered', 'delivered')])).toContain('first-not-unfinished');
    expect(validateStages([s('a', 'unfinished'), s('b', 'ready')])).toContain('last-not-delivered');
    expect(validateStages([s('a', 'unfinished'), s('a', 'ready'), s('c', 'delivered')])).toContain('duplicate-key:a');
    expect(validateStages([s('a', 'unfinished'), s('d', 'delivered')])).toContain('no-required-ready');
    expect(
      validateStages([s('a', 'unfinished'), s('r', 'ready'), s('b', 'unfinished'), s('d', 'delivered')]),
    ).toContain('groups-out-of-order');
  });
});

describe('checkTransition', () => {
  it('allows the next stage', () => {
    expect(checkTransition(shirt, 'booked', 'cutting')).toEqual({ ok: true, kind: 'forward', skipped: [] });
  });

  it('allows skipping optional stages', () => {
    expect(checkTransition(shirt, 'stitching', 'ready')).toEqual({ ok: true, kind: 'forward', skipped: ['trial'] });
  });

  it('blocks skipping required stages', () => {
    expect(checkTransition(shirt, 'booked', 'stitching')).toEqual({ ok: false, reason: 'skips-required' });
    expect(checkTransition(shirt, 'stitching', 'delivered')).toEqual({ ok: false, reason: 'skips-required' });
  });

  it('treats backward moves as rework', () => {
    expect(checkTransition(shirt, 'ready', 'stitching')).toEqual({ ok: true, kind: 'rework', skipped: [] });
  });

  it('blocks moves out of delivered, to the same stage, and to unknown stages', () => {
    expect(checkTransition(shirt, 'delivered', 'ready')).toEqual({ ok: false, reason: 'already-delivered' });
    expect(checkTransition(shirt, 'ready', 'ready')).toEqual({ ok: false, reason: 'same-stage' });
    expect(checkTransition(shirt, 'ready', 'nope')).toEqual({ ok: false, reason: 'unknown-stage' });
  });
});

describe('stageGroup', () => {
  it('returns the group of a stage', () => {
    expect(stageGroup(shirt, 'trial')).toBe('unfinished');
    expect(stageGroup(shirt, 'ready')).toBe('ready');
  });

  it('throws for unknown stages', () => {
    expect(() => stageGroup(shirt, 'nope')).toThrow('Unknown stage: nope');
  });
});
