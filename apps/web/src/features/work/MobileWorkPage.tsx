import type { ItemRef } from '@darzikhata/domain';
import { Printer, Ruler, Shirt } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { rovingTabsKeyDown } from '../../ui/rovingTabs';
import { DueLabel } from '../../ui/DueLabel';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { MoveOn } from '../orders/ItemCard';
import { nextMove } from '../orders/stageMoves';
import { useWorkList } from './useWorkList';
import { WORK_PHASES, phaseCounts, workPhase, type WorkPhase } from './workList';
import { MeasurementSheet } from '../customers/MeasurementSheet';
import { PrototypeSwitcher } from '../../ui/PrototypeSwitcher';
import { DoneButton, DoneStub, UndoBar, useDoneVariant, useDoneVariants, useMove, type DoneRecord } from './WorkDone.prototype';

function Card({ refItem, showWorker, index, onDone }: { refItem: ItemRef; showWorker: boolean; index: number; onDone(record: DoneRecord): void }) {
  const variant = useDoneVariant();
  const { t, language, label } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [measuring, setMeasuring] = useState(false);
  const box = useRef<HTMLElement>(null);
  const height = useRef(0);
  useEffect(() => {
    height.current = box.current?.offsetHeight ?? 0;
  });
  const { order, item } = refItem;

  const title = itemTitle(order, item, language);
  const stage = item.stages.find((s) => s.key === item.stageKey);
  const customer = state.customers[order.customerId];
  const template = config?.templates.find((tpl) => tpl.id === item.templateId);
  const worker = item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo)?.name : undefined;
  const next = can('work.updateStage') ? nextMove(item) : null;
  const canMeasure = item.measurements !== null && template !== undefined && customer !== undefined && hasAccess(customer);
  const meta = [order.number, item.wearer, showWorker ? worker : null].filter(Boolean).join(' · ');

  return (
    <li>
      <section ref={box} aria-label={`${order.number} ${title}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <Shirt size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <p className="truncate text-sm text-muted">{meta}</p>
          </div>
          {item.deliveryDate && <DueLabel date={item.deliveryDate} />}
        </div>
        {item.designNotes && <p className="rounded-xl bg-surface px-2.5 py-2 text-sm">{item.designNotes}</p>}
        <div className="flex gap-2">
          {canMeasure && (
            <Button variant="secondary" size="lg" className="shrink-0" onClick={() => setMeasuring(true)}>
              <Ruler aria-hidden="true" size={18} />
              {t('measure.section')}
              <span className="sr-only">{` ${title}`}</span>
            </Button>
          )}
          {next && variant !== '0' && (
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DoneButton
                order={order}
                item={item}
                to={next.stage.key}
                variant={variant}
                label={t('work.finishStage', { stage: stage ? label(stage.label) : item.stageKey })}
                onDone={(from) =>
                  onDone({ orderId: order.id, itemId: item.id, from, title, doneLabel: t('work.finishStage', { stage: stage ? label(stage.label) : item.stageKey }), index, height: height.current })
                }
              />
            </div>
          )}
          {next && variant === '0' && (
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <MoveOn
                order={order}
                item={item}
                stageKey={next.stage.key}
                label={t('work.finishStage', { stage: stage ? label(stage.label) : item.stageKey })}
                render={({ children, ...props }) => (
                  <button
                    type="button"
                    className="flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-brand px-4 text-base font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                    {...props}
                  >
                    {children}
                  </button>
                )}
              />
            </div>
          )}
        </div>
      </section>
      {measuring && template && item.measurements && (
        <MeasurementSheet title={t('item.measureTitle', { item: title })} template={template} snapshot={item.measurements} onClose={() => setMeasuring(false)} />
      )}
    </li>
  );
}

/**
 * The phone work list: three steps with counts beside a print button, pinned under the header, then one large card
 * per garment with a single move-on button. Like Orders and Customers it shows no title of its own; the tab bar says
 * where you are.
 */
export function MobileWorkPage() {
  const { t, number } = useI18n();
  const { viewer, all } = useWorkList();
  const [params] = useSearchParams();
  const counts = phaseCounts(all);
  const [chosen, setChosen] = useState<WorkPhase | null>(null);
  const phase: WorkPhase = chosen ?? (['making', 'start', 'finish'] as const).find((p) => counts[p] > 0) ?? 'making';
  const refs = all.filter((r) => workPhase(r.item) === phase);
  const search = params.toString();
  const onKeyDown = rovingTabsKeyDown(WORK_PHASES, phase, setChosen, (p) => `work-tab-${p}`);
  const variant = useDoneVariant();
  const variants = useDoneVariants();
  const { undo } = useMove();
  const [stubs, setStubs] = useState<DoneRecord[]>([]);
  const [last, setLast] = useState<DoneRecord | null>(null);
  const onDone = (record: DoneRecord) => {
    if (variant === 'V1') setLast(record);
    if (variant === 'V2') setStubs((s) => [...s, record]);
  };
  const undoRecord = (record: DoneRecord) => {
    void undo(record.orderId, record.itemId, record.from);
    setStubs((s) => s.filter((r) => r !== record));
    setLast(null);
  };
  const pick = (p: WorkPhase) => {
    setChosen(p);
    setStubs([]);
  };
  const rows = refs.map((r, i) => <Card key={r.item.id} refItem={r} showWorker={viewer.seesAll} index={i} onDone={onDone} />);
  if (variant === 'V2')
    [...stubs]
      .sort((a, b) => a.index - b.index)
      .forEach((record) => rows.splice(Math.min(record.index, rows.length), 0, <DoneStub key={`stub-${record.itemId}`} record={record} onUndo={() => undoRecord(record)} />));

  return (
    <div className="flex flex-col gap-3">
      <PrototypeSwitcher variants={variants} />
      {variant === 'V1' && last && <UndoBar record={last} onUndo={() => undoRecord(last)} onGone={() => setLast(null)} />}
      <h1 className="sr-only">{viewer.seesAll ? t('nav.work') : t('work.mine')}</h1>

      {/* Pinned under the shell header (3.5rem), so the steps and print stay in reach while the list scrolls. */}
      <div className="sticky top-14 z-[8] -mx-4 -mt-4 flex items-center gap-2 bg-surface px-4 pt-3 pb-2 shadow-sm">
        <div role="tablist" aria-label={t('work.stage')} className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-2xl bg-line p-1">
          {WORK_PHASES.map((p) => {
            const active = p === phase;
            return (
              <button
                key={p}
                id={`work-tab-${p}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="work-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => pick(p)}
                onKeyDown={onKeyDown}
                // A long English step name puts its count on a second line rather than breaking the name.
                className={`flex min-h-11 flex-wrap items-center justify-center gap-x-1 rounded-xl px-1 text-sm leading-tight focus-visible:outline-2 focus-visible:outline-focus ${
                  active ? 'bg-panel font-bold text-brand-strong shadow-sm' : 'text-muted'
                }`}
              >
                <span className="whitespace-nowrap">{t(`work.phase.${p}`)}</span>
                <b>{number(counts[p])}</b>
              </button>
            );
          })}
        </div>
        <Link
          to={`/print/work${search ? `?${search}` : ''}`}
          aria-label={t('work.print')}
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Printer aria-hidden="true" size={22} />
        </Link>
      </div>

      <div role="tabpanel" id="work-panel" aria-labelledby={`work-tab-${phase}`}>
        {rows.length === 0 ? (
          <p className="text-muted">{all.length === 0 ? t('work.empty') : t('work.phaseEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows}
          </ul>
        )}
      </div>
    </div>
  );
}
