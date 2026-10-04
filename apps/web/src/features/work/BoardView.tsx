import type { ItemRef, Stage } from '@darzikhata/domain';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { DueLabel } from '../../ui/DueLabel';
import { stageTone, type Tone } from '../../ui/stageTone';
import { itemTitle } from '../common/orderText';
import { workBoard, type BoardColumn } from './workBoard';

/** How many cards a column shows before its "more" button. */
export const COLUMN_LIMIT = 10;

// Full literal class names so Tailwind can see them.
const DOTS: Record<Tone, string> = {
  booked: 'bg-tone-booked-dot',
  cutting: 'bg-tone-cutting-dot',
  working: 'bg-tone-working-dot',
  trial: 'bg-tone-trial-dot',
  ready: 'bg-tone-ready-dot',
  done: 'bg-tone-done-dot',
  cancelled: 'bg-tone-cancelled-dot',
};

export interface WorkerChip {
  id: string;
  name: string;
}

interface ChipsProps {
  workers: WorkerChip[];
  /** Garments per worker id, with 'none' for nobody and 'all' for everyone. */
  counts: Record<string, number>;
  value: string;
  onChange(worker: string): void;
}

/** Worker filter as pressable chips with counts: everyone, each worker, and garments nobody has yet. */
export function WorkerChips({ workers, counts, value, onChange }: ChipsProps) {
  const { t, number } = useI18n();
  const base =
    'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
  const chip = (id: string, text: string, tone: 'plain' | 'warn', avatar?: WorkerChip) => {
    const on = value === id;
    const look =
      tone === 'warn'
        ? on
          ? 'border-warn bg-warn-soft text-warn-ink ring-2 ring-warn'
          : 'border-warn bg-warn-soft text-warn-ink'
        : on
          ? 'border-brand bg-brand-soft text-brand-strong ring-2 ring-brand'
          : 'border-line bg-panel text-ink hover:bg-surface';
    return (
      <button key={id} type="button" aria-pressed={on} onClick={() => onChange(id)} className={`${base} ${look}`}>
        {avatar && <Avatar id={avatar.id} name={avatar.name} size="sm" />}
        {text}{' '}
        <span className="text-xs">{number(counts[id] ?? 0)}</span>
      </button>
    );
  };
  return (
    <div role="group" aria-label={t('work.workerFilter')} className="flex flex-wrap items-center gap-2">
      {chip('all', t('work.everyone'), 'plain')}
      {workers.map((w) => chip(w.id, w.name, 'plain', w))}
      {chip('none', t('work.unassigned'), 'warn')}
    </div>
  );
}

interface CardProps {
  refItem: ItemRef;
  /** Null when the person cannot act on garments, so no checkbox is shown. */
  selected: ReadonlySet<string> | null;
  onToggle(ids: string[], on: boolean): void;
  workerName(id: string | null): string | null;
}

function Card({ refItem, selected, onToggle, workerName }: CardProps) {
  const { t, language } = useI18n();
  const { state } = useSnapshot();
  const { order, item } = refItem;
  const title = itemTitle(order, item, language);
  const customer = state.customers[order.customerId]?.name;
  const worker = workerName(item.assignedTo);
  const on = selected?.has(item.id) ?? false;
  return (
    <li className={`flex flex-col gap-2 rounded-xl border bg-panel p-3 ${on ? 'border-brand ring-2 ring-brand' : 'border-line'}`}>
      <div className="flex items-start gap-2">
        {selected && (
          <input
            type="checkbox"
            aria-label={t('work.select', { item: `${order.number} ${title}` })}
            checked={on}
            onChange={(event) => onToggle([item.id], event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-brand"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="flex min-w-0 items-baseline gap-1 text-sm text-muted">
            <Link to={`/app/orders/${order.id}`} className="shrink-0 text-brand-strong underline focus-visible:outline-2 focus-visible:outline-brand">
              {order.number}
            </Link>
            {customer && <span className="truncate">· {customer}</span>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {worker ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm">
            <Avatar id={item.assignedTo!} name={worker} size="sm" />
            <span className="truncate">{worker}</span>
          </span>
        ) : (
          <span className="rounded-full border border-dashed border-line px-2 py-0.5 text-sm text-muted">{t('work.noWorker')}</span>
        )}
        {item.deliveryDate && <DueLabel date={item.deliveryDate} />}
      </div>
    </li>
  );
}

interface ColumnProps extends Omit<CardProps, 'refItem'> {
  column: BoardColumn;
  index: number;
}

function Column({ column, index, selected, onToggle, workerName }: ColumnProps) {
  const { t, number, label } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const { stage, refs } = column;
  const name = label(stage.label);
  const tone = stageTone(stage as Stage, stage.group, index);
  const shownRefs = expanded ? refs : refs.slice(0, COLUMN_LIMIT);
  const hidden = refs.length - shownRefs.length;
  return (
    <section
      aria-label={t('work.column', { stage: name, n: number(refs.length) })}
      className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-surface p-2"
    >
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
        <span title={name} aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOTS[tone]}`} />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="rounded-full bg-panel px-2 text-xs text-muted">{number(refs.length)}</span>
      </h2>
      {refs.length === 0 ? (
        <p className="px-1 py-3 text-sm text-muted">{t('work.columnEmpty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {shownRefs.map((r) => (
            <Card key={r.item.id} refItem={r} selected={selected} onToggle={onToggle} workerName={workerName} />
          ))}
        </ul>
      )}
      {refs.length > COLUMN_LIMIT && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="min-h-9 rounded-lg text-sm font-semibold text-brand-strong hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
        >
          {expanded ? t('work.fewer') : t('work.more', { n: number(hidden) })}
        </button>
      )}
    </section>
  );
}

interface BoardProps {
  rows: ItemRef[];
  selected: ReadonlySet<string> | null;
  onToggle(ids: string[], on: boolean): void;
}

/** One column per stage; read and select only. Stage changes go through the selection bar and its preview. */
export function WorkBoard({ rows, selected, onToggle }: BoardProps) {
  const { t } = useI18n();
  const { config } = useSnapshot();
  const columns = useMemo(() => {
    const byTemplate: Record<string, Stage[]> = {};
    for (const tpl of config?.templates ?? []) byTemplate[tpl.id] = tpl.stages;
    return workBoard(rows, byTemplate);
  }, [rows, config]);
  const workerName = (id: string | null) => (id === null ? null : (config?.staff.find((s) => s.id === id)?.name ?? id));
  return (
    <div
      role="region"
      aria-label={t('work.board')}
      tabIndex={0}
      className="flex items-start gap-3 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-brand"
    >
      {columns.map((column, index) => (
        <Column key={column.key} column={column} index={index} selected={selected} onToggle={onToggle} workerName={workerName} />
      ))}
    </div>
  );
}
