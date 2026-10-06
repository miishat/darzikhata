// PROTOTYPE (throwaway): desktop layouts for /app/work, switched with ?variant=. A is the current page.
// B: one full-height card like the orders page; the board's columns and the list scroll inside it, and the selection actions sit in its footer.
// C: a worker rail (each person's load and late count) beside their queue, grouped by stage.
// D: a worker by stage grid of counts; pick a cell, row or column to see those garments below.
import { itemSummaryGroup, type ItemRef, type Stage } from '@darzikhata/domain';
import { Columns3, List, Printer, TriangleAlert, Users } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { buttonClasses } from '../../ui/Button';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone, type Tone } from '../../ui/stageTone';
import { useToday } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import type { WorkView } from './useWorkList';
import { workBoard, type BoardColumn } from './workBoard';
import { groupWork, type WorkGroup, type WorkQuery } from './workList';

export const WORK_VARIANTS = { A: 'Current', B: 'Card + inner scroll', C: 'Worker rail + queue', D: 'Worker × stage grid' };

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const PAGE = 'flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4';

const DOTS: Record<Tone, string> = {
  booked: 'bg-tone-booked-dot',
  cutting: 'bg-tone-cutting-dot',
  working: 'bg-tone-working-dot',
  trial: 'bg-tone-trial-dot',
  ready: 'bg-tone-ready-dot',
  done: 'bg-tone-done-dot',
  cancelled: 'bg-tone-cancelled-dot',
};

export interface WorkCtx {
  all: ItemRef[];
  shown: ItemRef[];
  groups: WorkGroup[];
  boardRows: ItemRef[];
  query: WorkQuery;
  setQuery(query: WorkQuery): void;
  view: WorkView;
  setView(view: WorkView): void;
  seesAll: boolean;
  workers: { id: string; name: string }[];
  counts: Record<string, number>;
  lateCount: number;
  stages: Stage[];
  selected: ReadonlySet<string> | null;
  toggle(ids: string[], on: boolean): void;
  clear(): void;
  /** Assign and move buttons for the selection. */
  actions: ReactNode;
  printHref: string;
}

/** Language-aware text for strings the app has no key for yet (prototype only). */
function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

function useColumns(rows: ItemRef[]): BoardColumn[] {
  const { config } = useSnapshot();
  return useMemo(() => {
    const byTemplate: Record<string, Stage[]> = {};
    for (const tpl of config?.templates ?? []) byTemplate[tpl.id] = tpl.stages;
    return workBoard(rows, byTemplate);
  }, [rows, config]);
}

function useStaffName() {
  const { t } = useI18n();
  const { config } = useSnapshot();
  return (id: string | null) => (id === null ? t('work.unassigned') : (config?.staff.find((s) => s.id === id)?.name ?? id));
}

function isLate(r: ItemRef, today: string) {
  return r.item.deliveryDate !== null && r.item.deliveryDate < today;
}

function Pill({ r }: { r: ItemRef }) {
  const { label } = useI18n();
  const index = r.item.stages.findIndex((s) => s.key === r.item.stageKey);
  const stage = r.item.stages[index];
  return <StagePill label={stage ? label(stage.label) : r.item.stageKey} tone={stageTone(stage, itemSummaryGroup(r.item), Math.max(index, 0))} />;
}

function Worker({ id }: { id: string | null }) {
  const { t } = useI18n();
  const name = useStaffName();
  return id ? (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm">
      <Avatar id={id} name={name(id)} size="sm" />
      <span className="truncate">{name(id)}</span>
    </span>
  ) : (
    <span className="whitespace-nowrap rounded-full border border-dashed border-warn px-2 py-0.5 text-sm text-warn-ink">{t('work.noWorker')}</span>
  );
}

function Header({ ctx, children }: { ctx: WorkCtx; children?: ReactNode }) {
  const { t, number } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h1 className="font-display text-xl font-bold">{t('nav.work')}</h1>
      <p className="flex items-center gap-3 text-sm text-muted">
        <span>{t('work.inProgress', { n: number(ctx.all.length) })}</span>
        {ctx.lateCount > 0 && <span className="font-semibold text-warn-ink">{t('work.lateCount', { n: number(ctx.lateCount) })}</span>}
      </p>
      <div className="ms-auto flex items-center gap-2">
        {children}
        <Link to={ctx.printHref} className={`${buttonClasses('secondary')} min-h-9!`}>
          <Printer aria-hidden="true" size={16} />
          {t('work.print')}
        </Link>
      </div>
    </div>
  );
}

/** The card's bottom line: how many are shown, or the selection and its actions. */
function Footer({ ctx, count }: { ctx: WorkCtx; count: number }) {
  const { t, number } = useI18n();
  const n = ctx.selected?.size ?? 0;
  return n > 0 ? (
    <div className="flex flex-wrap items-center gap-3 border-t border-navy-line bg-navy px-4 py-2 text-on-navy">
      <span role="status" className="text-sm font-semibold">
        {t('desk.selection.count', { n: number(n) })}
      </span>
      <div className="flex flex-wrap items-center gap-2">{ctx.actions}</div>
      <button type="button" onClick={ctx.clear} className="ms-auto min-h-9 rounded-lg px-2 text-sm font-semibold text-on-navy-muted hover:bg-navy-raised">
        {t('work.clearSelection')}
      </button>
    </div>
  ) : (
    <div className="border-t border-line px-4 py-2 text-sm text-muted">{t('work.count', { n: number(count) })}</div>
  );
}

function Check({ ctx, refs, label }: { ctx: WorkCtx; refs: ItemRef[]; label: string }) {
  if (!ctx.selected) return null;
  const ids = refs.map((r) => r.item.id);
  const on = ids.length > 0 && ids.every((id) => ctx.selected!.has(id));
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={on}
      onChange={(event) => ctx.toggle(ids, event.target.checked)}
      onClick={(event) => event.stopPropagation()}
      className="size-5 shrink-0 accent-brand"
    />
  );
}

/** Garments in groups, one table, the column header and each group's title stick while it scrolls. */
function GroupedTable({ ctx, groups, showWorker, showStage }: { ctx: WorkCtx; groups: { key: string; title: ReactNode; name: string; refs: ItemRef[] }[]; showWorker: boolean; showStage: boolean }) {
  const { t, language, date, number } = useI18n();
  const { state } = useSnapshot();
  const today = useToday();
  const head = 'sticky top-0 z-20 h-9 whitespace-nowrap border-b border-line bg-panel px-3 text-start text-sm font-semibold text-muted';
  const cols = 3 + (ctx.selected ? 1 : 0) + (showWorker ? 1 : 0) + (showStage ? 1 : 0);
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {ctx.selected && <th scope="col" className={`${head} w-10`} />}
          <th scope="col" className={head}>{t('receipt.garment')}</th>
          <th scope="col" className={head}>{t('receipt.wearer')}</th>
          {showStage && <th scope="col" className={head}>{t('work.stage')}</th>}
          {showWorker && <th scope="col" className={head}>{t('work.worker')}</th>}
          <th scope="col" className={head}>{t('receipt.delivery')}</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.key}>
          <tr>
            <th scope="rowgroup" colSpan={cols} className="sticky top-9 z-10 border-b border-line bg-surface px-3 py-1.5 text-start">
              <span className="flex items-center gap-3">
                <Check ctx={ctx} refs={g.refs} label={t('work.selectGroup', { group: g.name })} />
                <span className="flex min-w-0 items-center gap-2 font-semibold">{g.title}</span>
                <span className="rounded-full bg-panel px-2 text-xs text-muted">{number(g.refs.length)}</span>
              </span>
            </th>
          </tr>
          {g.refs.map((r) => {
            const name = itemTitle(r.order, r.item, language);
            const on = ctx.selected?.has(r.item.id) ?? false;
            const customer = state.customers[r.order.customerId]?.name;
            return (
              <tr
                key={r.item.id}
                onClick={() => ctx.selected && ctx.toggle([r.item.id], !on)}
                className={`border-b border-line ${ctx.selected ? 'cursor-pointer' : ''} ${on ? 'bg-brand-soft' : isLate(r, today) ? 'bg-warn-soft/40 hover:bg-surface' : 'hover:bg-surface'}`}
              >
                {ctx.selected && (
                  <td className="px-3 py-2">
                    <Check ctx={ctx} refs={[r]} label={t('work.select', { item: `${r.order.number} ${name}` })} />
                  </td>
                )}
                <td className="px-3 py-2">
                  <p className="font-semibold">{name}</p>
                  <p className="flex min-w-0 items-baseline gap-1 text-sm text-muted">
                    <Link to={`/app/orders/${r.order.id}`} onClick={(e) => e.stopPropagation()} className="shrink-0 text-brand-strong underline">
                      {r.order.number}
                    </Link>
                    {customer && <span className="truncate">· {customer}</span>}
                  </p>
                </td>
                <td className="px-3 py-2 text-sm">{r.item.wearer}</td>
                {showStage && (
                  <td className="px-3 py-2">
                    <Pill r={r} />
                  </td>
                )}
                {showWorker && (
                  <td className="px-3 py-2">
                    <Worker id={r.item.assignedTo} />
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-2 text-sm">
                  {r.item.deliveryDate && (
                    <span className="flex flex-col items-start gap-0.5">
                      {date(r.item.deliveryDate)}
                      <DueLabel date={r.item.deliveryDate} />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}

function stageGroups(refs: ItemRef[], label: (l: Stage['label']) => string, config: Parameters<typeof groupWork>[2] | null) {
  if (!config) return [];
  return groupWork(refs, 'stage', config).map((g, i) => {
    const name = g.stage ? label(g.stage.label) : g.key;
    return {
      key: g.key,
      name,
      refs: g.refs,
      title: (
        <>
          <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOTS[stageTone(g.stage ?? undefined, g.stage?.group ?? 'unfinished', i)]}`} />
          {name}
        </>
      ),
    };
  });
}

/* ------------------------------------------------------------------ B ------------------------------------------------------------------ */

function GarmentCard({ ctx, r }: { ctx: WorkCtx; r: ItemRef }) {
  const { t, language } = useI18n();
  const { state } = useSnapshot();
  const today = useToday();
  const title = itemTitle(r.order, r.item, language);
  const customer = state.customers[r.order.customerId]?.name;
  const on = ctx.selected?.has(r.item.id) ?? false;
  return (
    <li
      onClick={() => ctx.selected && ctx.toggle([r.item.id], !on)}
      className={`flex flex-col gap-2 rounded-xl border bg-panel p-3 ${ctx.selected ? 'cursor-pointer' : ''} ${
        on ? 'border-brand ring-2 ring-brand' : isLate(r, today) ? 'border-warn-line' : 'border-line hover:border-muted'
      }`}
    >
      <div className="flex items-start gap-2">
        <Check ctx={ctx} refs={[r]} label={t('work.select', { item: `${r.order.number} ${title}` })} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="flex min-w-0 items-baseline gap-1 text-sm text-muted">
            <Link to={`/app/orders/${r.order.id}`} onClick={(e) => e.stopPropagation()} className="shrink-0 text-brand-strong underline">
              {r.order.number}
            </Link>
            {customer && <span className="truncate">· {customer}</span>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Worker id={r.item.assignedTo} />
        {r.item.deliveryDate && <DueLabel date={r.item.deliveryDate} />}
      </div>
    </li>
  );
}

function WorkerTiles({ ctx }: { ctx: WorkCtx }) {
  const { t, number } = useI18n();
  const today = useToday();
  const late = (id: string) => ctx.all.filter((r) => (id === 'all' || (r.item.assignedTo ?? 'none') === id) && isLate(r, today)).length;
  const tile = (id: string, name: string, avatar: boolean, warn = false) => {
    const on = ctx.query.worker === id;
    const l = late(id);
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => ctx.setQuery({ ...ctx.query, worker: id })}
        className={`flex min-w-36 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-start ring-inset ${
          on ? (warn ? 'bg-warn-soft text-warn-ink ring-2 ring-warn-line' : 'bg-brand-soft text-brand-strong ring-2 ring-brand') : warn ? 'bg-warn-soft/50 ring-1 ring-warn-line' : 'bg-surface/60 ring-1 ring-line hover:bg-surface'
        }`}
      >
        {avatar ? (
          <Avatar id={id} name={name} size="sm" />
        ) : (
          <span aria-hidden="true" className={`grid size-8 place-items-center rounded-lg ${warn ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand-strong'}`}>
            {warn ? <TriangleAlert size={16} /> : <Users size={16} />}
          </span>
        )}
        <span className="flex min-w-0 flex-col-reverse">
          <span className="truncate text-xs">{name}</span>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold leading-tight">{number(ctx.counts[id] ?? 0)}</span>
            {l > 0 && <span className="text-xs font-semibold text-warn-ink">{t('work.lateCount', { n: number(l) })}</span>}
          </span>
        </span>
      </button>
    );
  };
  return (
    <div role="group" aria-label={t('work.workerFilter')} className="flex gap-2 overflow-x-auto p-0.5">
      {tile('all', t('work.everyone'), false)}
      {ctx.workers.map((w) => tile(w.id, w.name, true))}
      {tile('none', t('work.unassigned'), false, true)}
    </div>
  );
}

export function VariantB({ ctx }: { ctx: WorkCtx }) {
  const { t, number, label } = useI18n();
  const columns = useColumns(ctx.boardRows);
  const name = useStaffName();
  const board = ctx.view === 'board';
  const seg = (v: WorkView, Icon: typeof List, text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={ctx.view === v}
      onClick={() => ctx.setView(v)}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${ctx.view === v ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
    >
      <Icon aria-hidden="true" size={16} />
      {text}
    </button>
  );
  const groups = ctx.groups.map((g, i) => {
    const title = ctx.query.by === 'worker' ? name(g.key === 'none' ? null : g.key) : g.stage ? label(g.stage.label) : g.key;
    return {
      key: g.key,
      name: title,
      refs: g.refs,
      title:
        ctx.query.by === 'worker' ? (
          <>
            {g.key !== 'none' && <Avatar id={g.key} name={title} size="sm" />}
            {title}
          </>
        ) : (
          <>
            <span aria-hidden="true" className={`size-2.5 rounded-full ${DOTS[stageTone(g.stage ?? undefined, g.stage?.group ?? 'unfinished', i)]}`} />
            {title}
          </>
        ),
    };
  });
  const select = 'min-h-9 rounded-lg border border-line bg-panel px-2 text-sm';
  return (
    <div className={PAGE}>
      <div className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <Header ctx={ctx}>
            <div role="tablist" aria-label={t('work.view')} className="flex rounded-lg bg-surface p-1">
              {seg('board', Columns3, t('work.view.board'))}
              {seg('list', List, t('work.view.list'))}
            </div>
          </Header>
          {ctx.seesAll && <WorkerTiles ctx={ctx} />}
          {!board && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {ctx.seesAll && (
                <select aria-label={t('work.groupBy')} value={ctx.query.by} onChange={(e) => ctx.setQuery({ ...ctx.query, by: e.target.value === 'stage' ? 'stage' : 'worker' })} className={select}>
                  <option value="worker">{t('work.byWorker')}</option>
                  <option value="stage">{t('work.byStage')}</option>
                </select>
              )}
              <select aria-label={t('work.stage')} value={ctx.query.stage} onChange={(e) => ctx.setQuery({ ...ctx.query, stage: e.target.value })} className={select}>
                <option value="all">{t('work.allStages')}</option>
                {ctx.stages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {label(s.label)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {board ? (
          <div role="region" aria-label={t('work.board')} className="flex min-h-0 flex-1 gap-3 overflow-x-auto bg-surface/40 p-3">
            {columns.map((column, index) => {
              const n = label(column.stage.label);
              return (
                <section key={column.key} aria-label={t('work.column', { stage: n, n: number(column.refs.length) })} className={`flex min-h-0 shrink-0 flex-col rounded-xl bg-surface ${column.refs.length ? 'w-72' : 'w-44'}`}>
                  <h2 className="flex items-center gap-2 px-3 pb-1 pt-2.5 text-sm font-semibold">
                    <Check ctx={ctx} refs={column.refs} label={t('work.selectGroup', { group: n })} />
                    <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOTS[stageTone(column.stage, column.stage.group, index)]}`} />
                    <span className="min-w-0 flex-1 truncate">{n}</span>
                    <span className="rounded-full bg-panel px-2 text-xs text-muted">{number(column.refs.length)}</span>
                  </h2>
                  {column.refs.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted">{t('work.columnEmpty')}</p>
                  ) : (
                    <ul className="relative m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-2">
                      {column.refs.map((r) => (
                        <GarmentCard key={r.item.id} ctx={ctx} r={r} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-auto">
            {groups.length === 0 ? (
              <p className="p-4 text-muted">{t('work.empty')}</p>
            ) : (
              <GroupedTable ctx={ctx} groups={groups} showWorker={ctx.query.by === 'stage'} showStage={ctx.query.by === 'worker'} />
            )}
          </div>
        )}
        <Footer ctx={ctx} count={board ? ctx.boardRows.length : ctx.shown.length} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ C ------------------------------------------------------------------ */

export function VariantC({ ctx }: { ctx: WorkCtx }) {
  const { t, number, label } = useI18n();
  const L = useL();
  const { config } = useSnapshot();
  const today = useToday();
  const columns = useColumns(ctx.all);
  const name = useStaffName();
  const people = [{ id: 'all', name: t('work.everyone') }, ...ctx.workers, { id: 'none', name: t('work.unassigned') }];
  const max = Math.max(1, ...ctx.workers.map((w) => ctx.counts[w.id] ?? 0));
  const groups = stageGroups(ctx.shown, label, config ?? null);
  const pickedStage = ctx.query.stage;
  const forWorker = ctx.all.filter((r) => ctx.query.worker === 'all' || (r.item.assignedTo ?? 'none') === ctx.query.worker);

  return (
    <div className={PAGE}>
      {ctx.seesAll && (
        <aside aria-label={t('work.workerFilter')} className={`${CARD} w-72 shrink-0`}>
          <div className="border-b border-line p-4">
            <h1 className="font-display text-xl font-bold">{t('nav.work')}</h1>
            <p className="flex items-center gap-3 text-sm text-muted">
              <span>{t('work.inProgress', { n: number(ctx.all.length) })}</span>
              {ctx.lateCount > 0 && <span className="font-semibold text-warn-ink">{t('work.lateCount', { n: number(ctx.lateCount) })}</span>}
            </p>
          </div>
          <ul className="relative m-0 min-h-0 flex-1 list-none overflow-y-auto p-2">
            {people.map((p) => {
              const refs = ctx.all.filter((r) => p.id === 'all' || (r.item.assignedTo ?? 'none') === p.id);
              const late = refs.filter((r) => isLate(r, today)).length;
              const on = ctx.query.worker === p.id;
              // Each person's garments by stage, as a little stacked bar.
              const byStage = columns.map((c, i) => ({ c, i, n: c.refs.filter((r) => refs.includes(r)).length })).filter((x) => x.n > 0);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => ctx.setQuery({ ...ctx.query, worker: p.id, stage: 'all' })}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start ${on ? 'bg-brand-soft ring-2 ring-inset ring-brand' : 'hover:bg-surface'}`}
                  >
                    {p.id === 'all' ? (
                      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
                        <Users size={18} />
                      </span>
                    ) : p.id === 'none' ? (
                      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
                        <TriangleAlert size={18} />
                      </span>
                    ) : (
                      <Avatar id={p.id} name={p.name} />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate font-semibold ${p.id === 'none' ? 'text-warn-ink' : ''}`}>{p.name}</span>
                        <span className="font-display font-bold">{number(refs.length)}</span>
                      </span>
                      {p.id !== 'all' && p.id !== 'none' && (
                        <span aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full bg-surface" style={{ width: `${(refs.length / max) * 100}%`, minWidth: refs.length ? '0.75rem' : 0 }}>
                          {byStage.map((x) => (
                            <span key={x.c.key} className={DOTS[stageTone(x.c.stage, x.c.stage.group, x.i)]} style={{ flex: x.n }} />
                          ))}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {late > 0 ? <span className="font-semibold text-warn-ink">{t('work.lateCount', { n: number(late) })}</span> : L('সময়মতো চলছে', 'On time')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
      <section aria-label={ctx.query.worker === 'all' ? t('work.everyone') : name(ctx.query.worker === 'none' ? null : ctx.query.worker)} className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-3">
            {ctx.query.worker !== 'all' && ctx.query.worker !== 'none' && <Avatar id={ctx.query.worker} name={name(ctx.query.worker)} />}
            <h2 className="font-display text-xl font-bold">
              {ctx.query.worker === 'all' ? (ctx.seesAll ? t('work.everyone') : t('work.mine')) : name(ctx.query.worker === 'none' ? null : ctx.query.worker)}
            </h2>
            <div className="ms-auto">
              <Link to={ctx.printHref} className={`${buttonClasses('secondary')} min-h-9!`}>
                <Printer aria-hidden="true" size={16} />
                {t('work.print')}
              </Link>
            </div>
          </div>
          {/* Where this person's garments stand, as stage chips that filter the queue. */}
          <div role="group" aria-label={t('work.stage')} className="flex flex-wrap gap-2">
            {[{ key: 'all', text: t('work.allStages'), n: forWorker.length, dot: null as string | null }, ...columns.map((c, i) => ({ key: c.key, text: label(c.stage.label), n: c.refs.filter((r) => forWorker.includes(r)).length, dot: DOTS[stageTone(c.stage, c.stage.group, i)] }))]
              .filter((s) => s.key === 'all' || s.n > 0)
              .map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={pickedStage === s.key}
                  onClick={() => ctx.setQuery({ ...ctx.query, stage: s.key })}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${pickedStage === s.key ? 'border-brand bg-brand-soft text-brand-strong ring-2 ring-brand' : 'border-line hover:bg-surface'}`}
                >
                  {s.dot && <span aria-hidden="true" className={`size-2.5 rounded-full ${s.dot}`} />}
                  {s.text}
                  <span className="text-xs text-muted">{number(s.n)}</span>
                </button>
              ))}
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto">
          {groups.length === 0 ? <p className="p-4 text-muted">{t('work.empty')}</p> : <GroupedTable ctx={ctx} groups={groups} showWorker={ctx.query.worker === 'all'} showStage={false} />}
        </div>
        <Footer ctx={ctx} count={ctx.shown.length} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ D ------------------------------------------------------------------ */

export function VariantD({ ctx }: { ctx: WorkCtx }) {
  const { t, number, label } = useI18n();
  const L = useL();
  const { config } = useSnapshot();
  const today = useToday();
  const columns = useColumns(ctx.all);
  const name = useStaffName();
  const rows = ctx.seesAll ? [...ctx.workers, { id: 'none', name: t('work.unassigned') }] : ctx.workers.filter((w) => (ctx.counts[w.id] ?? 0) > 0);
  const owner = (r: ItemRef) => r.item.assignedTo ?? 'none';
  const cellRefs = (w: string, s: string) => ctx.all.filter((r) => (w === 'all' || owner(r) === w) && (s === 'all' || r.item.stageKey === s));
  const max = Math.max(1, ...rows.flatMap((w) => columns.map((c) => cellRefs(w.id, c.key).length)));
  const pick = (worker: string, stage: string) => ctx.setQuery({ ...ctx.query, worker, stage });
  const { worker, stage } = ctx.query;
  const groups = stageGroups(ctx.shown, label, config ?? null);
  const stageName = (key: string) => {
    const c = columns.find((x) => x.key === key);
    return c ? label(c.stage.label) : key;
  };
  const caption = [worker === 'all' ? t('work.everyone') : name(worker === 'none' ? null : worker), stage === 'all' ? t('work.allStages') : stageName(stage)].join(' · ');

  const cell = (w: string, s: string, content: ReactNode, extra = '') => {
    const on = worker === w && stage === s;
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => pick(w, s)}
        className={`flex h-full w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 ${on ? 'ring-2 ring-inset ring-brand' : 'hover:ring-1 hover:ring-inset hover:ring-line'} ${extra}`}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-4">
      <section aria-label={L('কে কোন ধাপে', 'Who is at which stage')} className={`${CARD} max-h-[55%] shrink-0`}>
        <div className="border-b border-line p-4">
          <Header ctx={ctx} />
        </div>
        <div className="relative min-h-0 overflow-auto p-2">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 top-0 z-20 bg-panel">
                  {cell('all', 'all', <span className="text-sm font-semibold">{t('work.everyone')}</span>)}
                </th>
                {columns.map((c, i) => (
                  <th key={c.key} scope="col" className="sticky top-0 z-10 min-w-24 bg-panel text-sm font-semibold">
                    {cell(
                      'all',
                      c.key,
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden="true" className={`size-2.5 rounded-full ${DOTS[stageTone(c.stage, c.stage.group, i)]}`} />
                          {label(c.stage.label)}
                        </span>
                        <span className="text-xs text-muted">{number(c.refs.length)}</span>
                      </span>,
                    )}
                  </th>
                ))}
                <th scope="col" className="sticky top-0 z-10 bg-panel text-sm font-semibold">
                  {L('মোট', 'Total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const mine = cellRefs(w.id, 'all');
                const late = mine.filter((r) => isLate(r, today)).length;
                return (
                  <tr key={w.id}>
                    <th scope="row" className="sticky left-0 z-10 bg-panel text-start">
                      {cell(
                        w.id,
                        'all',
                        <span className="flex w-full items-center gap-2">
                          {w.id === 'none' ? (
                            <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-warn-soft text-warn">
                              <TriangleAlert size={16} />
                            </span>
                          ) : (
                            <Avatar id={w.id} name={w.name} size="sm" />
                          )}
                          <span className={`whitespace-nowrap text-sm font-semibold ${w.id === 'none' ? 'text-warn-ink' : ''}`}>{w.name}</span>
                        </span>,
                        'justify-start',
                      )}
                    </th>
                    {columns.map((c) => {
                      const refs = cellRefs(w.id, c.key);
                      const n = refs.length;
                      const lateHere = refs.filter((r) => isLate(r, today)).length;
                      // Heat: the busiest cell is the darkest.
                      const alpha = n === 0 ? 0 : 0.12 + (n / max) * 0.5;
                      return (
                        <td key={c.key} className="h-12 p-0 text-center" style={{ background: n ? `color-mix(in oklab, var(--color-brand) ${Math.round(alpha * 100)}%, transparent)` : undefined, borderRadius: '0.5rem' }}>
                          {n === 0 ? (
                            <span className="text-muted">·</span>
                          ) : (
                            cell(
                              w.id,
                              c.key,
                              <>
                                <span className="font-display text-lg font-bold">{number(n)}</span>
                                {lateHere > 0 && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-warn-soft px-1.5 text-xs font-semibold text-warn-ink">
                                    <TriangleAlert aria-hidden="true" size={12} />
                                    {number(lateHere)}
                                  </span>
                                )}
                              </>,
                            )
                          )}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-2 text-center">
                      <span className="font-display font-bold">{number(mine.length)}</span>
                      {late > 0 && <span className="ms-1.5 text-xs font-semibold text-warn-ink">{t('work.lateCount', { n: number(late) })}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-label={caption} className={`${CARD} min-h-0 flex-1`}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <h2 className="font-semibold">{caption}</h2>
          {(worker !== 'all' || stage !== 'all') && (
            <button type="button" onClick={() => pick('all', 'all')} className="ms-auto min-h-8 rounded-lg px-2 text-sm font-semibold text-brand-strong hover:bg-surface">
              {L('সব দেখুন', 'Show all')}
            </button>
          )}
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto">
          {groups.length === 0 ? <p className="p-4 text-muted">{t('work.empty')}</p> : <GroupedTable ctx={ctx} groups={groups} showWorker={worker === 'all'} showStage={false} />}
        </div>
        <Footer ctx={ctx} count={ctx.shown.length} />
      </section>
    </div>
  );
}
