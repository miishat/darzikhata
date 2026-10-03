import { makeItem } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { nextMove, stageMoves } from './stageMoves';

const keys = (moves: ReturnType<typeof stageMoves>) => moves.map((m) => `${m.kind}:${m.stage.key}`);

describe('stageMoves', () => {
  it('offers the next stages, skipping optional trial, and earlier stages as rework', () => {
    expect(keys(stageMoves(makeItem({ stageKey: 'stitching' })))).toEqual([
      'rework:booked',
      'rework:cutting',
      'forward:trial',
      'forward:ready',
    ]);
    expect(stageMoves(makeItem({ stageKey: 'stitching' })).find((m) => m.stage.key === 'ready')?.skipped).toEqual(['trial']);
  });

  it('lets a ready garment be handed over', () => {
    expect(keys(stageMoves(makeItem({ stageKey: 'ready' })))).toContain('forward:delivered');
    expect(nextMove(makeItem({ stageKey: 'ready' }))?.stage.key).toBe('delivered');
  });

  it('offers nothing for delivered or cancelled garments', () => {
    expect(stageMoves(makeItem({ stageKey: 'delivered' }))).toEqual([]);
    expect(stageMoves(makeItem({ cancelled: { reason: 'x', at: '', by: '' } }))).toEqual([]);
    expect(nextMove(makeItem({ stageKey: 'delivered' }))).toBeNull();
  });

  it('suggests the immediate next stage, even when it is optional', () => {
    expect(nextMove(makeItem({ stageKey: 'booked' }))?.stage.key).toBe('cutting');
    expect(nextMove(makeItem({ stageKey: 'stitching' }))?.stage.key).toBe('trial');
  });
});
