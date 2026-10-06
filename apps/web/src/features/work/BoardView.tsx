import type { ItemRef, Stage } from '@darzikhata/domain';
import { TriangleAlert, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { DueLabel } from '../../ui/DueLabel';
import { stageTone, type Tone } from '../../ui/stageTone';
import { useToday } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { workBoard, type BoardColumn } from './workBoard';

// Full literal class names so Tailwind can see them.
export const DOTS: Record<Tone, string> = {
  booked: 'bg-tone-booked-dot',
  cutting: 'bg-tone-cutting-dot',
  working: 'bg-tone-working-dot',
  trial: 'bg-tone-trial-dot',
  ready: 'bg-tone-ready-dot',
  done: 'bg-tone-done-dot',
  cancelled: 'bg-tone-cancelled-dot',
};

/** Whether a garment's promised date has passed. */
export function isLate(ref: ItemRef, today: string): boolean {
  return ref.item.deliveryDate !== null && ref.item.deliveryDate < today;
}

export interface WorkerChip {
  id: string;
  name: string;
}

interface ChipsProps {
  workers: WorkerChip[];
  /** Garments per worker id, with 'none' for nobody and 'all' for everyone. */
  counts: Record<string, number>;
  /** Late garments per worker id, keyed the same way. */
  late: Record<string, number>;
  value: string;
  onChange(worker: string): void;
}

/** Worker filter as pressable tiles with counts: everyone, each worker, and garments nobody has yet. */
export function WorkerChips({ workers, counts, late, value, onChange }: ChipsProps) {
  const { t, number } = useI18n();
  const chip = (id: string, text: string, tone: 'plain' | 'warn', worker?: WorkerChip) => {
    const on = value === id;
    const warn = tone === 'warn';
    const look = on
      ? warn
        ? 'bg-warn-soft text-warn-ink ring-2 ring-warn-line'
        : 'bg-brand-soft text-brand-strong ring-2 ring-brand'
      : warn
        ? 'bg-warn-soft/50 text-warn-ink ring-1 ring-warn-line hover:bg-warn-soft'
        : 'bg-surface/60 text-ink ring-1 ring-line hover:bg-surface';
    const behind = late[id] ?? 0;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => onChange(id)}
        className={`flex min-w-36 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-start ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${look}`}
      >
        {worker ? (
          <Avatar id={worker.id} name={worker.name} size="sm" />
        ) : (
          <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg ${warn ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand-strong'}`}>
            {warn ? <TriangleAlert size={16} /> : <Users size={16} />}
          </span>
        )}
        {/* The name and count come first so they name the button; the count shows above the name. */}
        <span className="flex min-w-0 flex-col-reverse">
          <span className="truncate text-xs">
            {text} <span className="sr-only">{number(counts[id] ?? 0)}</span>
          </span>
          <span aria-hidden="true" className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold leading-tight">{number(counts[id] ?? 0)}</span>
            {behind > 0 && <span className="whitespace-nowrap text-xs font-semibold text-warn-ink">{t('work.lateCount', { n: number(behind) })}</span>}
          </span>
        </span>
      </button>
    );
  };
  return (
    <div role="group" aria-label={t('work.workerFilter')} className="flex gap-2 overflow-x-auto p-0.5">
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

/** A garment on the board. Clicking anywhere on it, other than the order link, ticks it. */
function Card({ refItem, selected, onToggle, workerName }: CardProps) {
  const { t, language } = useI18n();
  const { state } = useSnapshot();
  const today = useToday();
  const { order, item } = refItem;
  const title = itemTitle(order, item, language);
  const customer = state.customers[order.customerId]?.name;
  const worker = workerName(item.assignedTo);
  const on = selected?.has(item.id) ?? false;
  return (
    <li
      onClick={selected ? () => onToggle([item.id], !on) : undefined}
      className={`flex flex-col gap-2 rounded-xl border bg-panel p-3 ${selected ? 'cursor-pointer' : ''} ${
        on ? 'border-brand ring-2 ring-brand' : isLate(refItem, today) ? 'border-warn-line' : 'border-line'
      }`}
    >
      <div className="flex items-start gap-2">
        {selected && (
          <input
            type="checkbox"
            aria-label={t('work.select', { item: `${order.number} ${title}` })}
            checked={on}
            onChange={(event) => onToggle([item.id], event.target.checked)}
            onClick={(event) => event.stopPropagation()}
            className="mt-0.5 size-5 shrink-0 accent-brand"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="flex min-w-0 items-baseline gap-1 text-sm text-muted">
            <Link
              to={`/app/orders/${order.id}`}
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 text-brand-strong underline focus-visible:outline-2 focus-visible:outline-focus"
            >
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
          <span className="rounded-full border border-dashed border-warn px-2 py-0.5 text-sm text-warn-ink">{t('work.noWorker')}</span>
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

/** One stage, as tall as the board; a long column scrolls on its own and an empty one stays narrow. */
function Column({ column, index, selected, onToggle, workerName }: ColumnProps) {
  const { t, number, label } = useI18n();
  const { stage, refs } = column;
  const name = label(stage.label);
  const tone = stageTone(stage as Stage, stage.group, index);
  return (
    <section
      aria-label={t('work.column', { stage: name, n: number(refs.length) })}
      className={`flex min-h-0 shrink-0 flex-col rounded-xl bg-surface ${refs.length > 0 ? 'w-72' : 'w-44'}`}
    >
      <h2 className="flex items-center gap-2 px-3 pb-1 pt-2.5 text-sm font-semibold">
        <span title={name} aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOTS[tone]}`} />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="rounded-full bg-panel px-2 text-xs text-muted">{number(refs.length)}</span>
      </h2>
      {refs.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted">{t('work.columnEmpty')}</p>
      ) : (
        // relative: keeps absolutely placed screen-reader text inside this scroll area.
        <ul className="relative m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-2">
          {refs.map((r) => (
            <Card key={r.item.id} refItem={r} selected={selected} onToggle={onToggle} workerName={workerName} />
          ))}
        </ul>
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
      className="flex h-full gap-3 overflow-x-auto p-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
    >
      {columns.map((column, index) => (
        <Column key={column.key} column={column} index={index} selected={selected} onToggle={onToggle} workerName={workerName} />
      ))}
    </div>
  );
}
