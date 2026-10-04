import { ALTERATION_STAGES, STANDARD_STAGES, type Stage } from '@darzikhata/domain';
import { makeItem, makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { workBoard } from './workBoard';

const st = (key: string, group: Stage['group'] = 'unfinished', optional = false): Stage => ({
  key,
  label: { bn: key, en: key },
  optional,
  group,
});

const BRIDAL: Stage[] = [
  st('booked'),
  st('cutting'),
  st('embroidery'),
  st('stitching'),
  st('trial', 'unfinished', true),
  st('ready', 'ready'),
  st('delivered', 'delivered'),
];

const stagesByTemplate = { shirt: STANDARD_STAGES, bridal: BRIDAL };

const rows = (...items: ReturnType<typeof makeItem>[]) => {
  const order = makeOrder({ id: 'o1', number: 'A-1', items });
  return order.items.map((item) => ({ order, item }));
};

const keys = (board: ReturnType<typeof workBoard>) => board.map((c) => c.stage.key);

describe('workBoard', () => {
  it('merges shirt and bridal stages into one stable ordered list by first position', () => {
    const board = workBoard(
      rows(
        makeItem({ id: 'a', templateId: 'shirt', stages: STANDARD_STAGES, stageKey: 'cutting' }),
        makeItem({ id: 'b', templateId: 'bridal', stages: BRIDAL, stageKey: 'embroidery' }),
      ),
      stagesByTemplate,
    );
    expect(keys(board)).toEqual(['booked', 'cutting', 'stitching', 'embroidery', 'ready']);
    const again = workBoard(
      rows(
        makeItem({ id: 'b', templateId: 'bridal', stages: BRIDAL, stageKey: 'embroidery' }),
        makeItem({ id: 'a', templateId: 'shirt', stages: STANDARD_STAGES, stageKey: 'cutting' }),
      ),
      stagesByTemplate,
    );
    expect(keys(again)).toEqual(keys(board));
  });

  it('puts each garment only in its own stage column, never in one its template lacks', () => {
    const board = workBoard(
      rows(
        makeItem({ id: 'a', templateId: 'shirt', stages: STANDARD_STAGES, stageKey: 'stitching' }),
        makeItem({ id: 'b', templateId: 'bridal', stages: BRIDAL, stageKey: 'embroidery' }),
      ),
      stagesByTemplate,
    );
    const ids = (key: string) => board.find((c) => c.stage.key === key)!.refs.map((r) => r.item.id);
    expect(ids('stitching')).toEqual(['a']);
    expect(ids('embroidery')).toEqual(['b']);
    expect(ids('booked')).toEqual([]);
  });

  it('shows an optional stage only while a garment is in it', () => {
    const shirts = { shirt: STANDARD_STAGES };
    const none = workBoard(rows(makeItem({ id: 'a', stages: STANDARD_STAGES, stageKey: 'cutting' })), shirts);
    expect(keys(none)).toEqual(['booked', 'cutting', 'stitching', 'ready']);
    const some = workBoard(rows(makeItem({ id: 'a', stages: STANDARD_STAGES, stageKey: 'trial' })), shirts);
    expect(keys(some)).toEqual(['booked', 'cutting', 'stitching', 'trial', 'ready']);
  });

  it('leaves out delivered and cancelled garments, and has no delivered column', () => {
    const board = workBoard(
      rows(
        makeItem({ id: 'a', stages: STANDARD_STAGES, stageKey: 'delivered' }),
        makeItem({ id: 'b', stages: STANDARD_STAGES, stageKey: 'cutting', cancelled: { reason: 'x', at: '', by: '' } }),
        makeItem({ id: 'c', stages: STANDARD_STAGES, stageKey: 'cutting' }),
      ),
      stagesByTemplate,
    );
    expect(keys(board)).not.toContain('delivered');
    expect(board.flatMap((c) => c.refs.map((r) => r.item.id))).toEqual(['c']);
  });

  it('keeps the incoming order of garments inside a column and works with no garments', () => {
    const board = workBoard(
      rows(
        makeItem({ id: 'x', stages: STANDARD_STAGES, stageKey: 'cutting' }),
        makeItem({ id: 'y', stages: STANDARD_STAGES, stageKey: 'cutting' }),
      ),
      stagesByTemplate,
    );
    expect(board.find((c) => c.stage.key === 'cutting')!.refs.map((r) => r.item.id)).toEqual(['x', 'y']);
    expect(workBoard([], {})).toEqual([]);
  });

  it('keeps ready stages after every unfinished stage even when a shorter template has them earlier', () => {
    const board = workBoard(
      rows(makeItem({ id: 'a', stages: STANDARD_STAGES, stageKey: 'trial' }), makeItem({ id: 'b', templateId: 'alteration', stages: ALTERATION_STAGES, stageKey: 'working' })),
      { shirt: STANDARD_STAGES, alteration: ALTERATION_STAGES },
    );
    expect(keys(board)).toEqual(['booked', 'cutting', 'working', 'stitching', 'trial', 'ready']);
  });

  it('still shows a column for a garment whose template is unknown', () => {
    const board = workBoard(rows(makeItem({ id: 'a', templateId: 'gone', stages: ALTERATION_STAGES, stageKey: 'working' })), {});
    expect(keys(board)).toEqual(['booked', 'working', 'ready']);
  });
});
