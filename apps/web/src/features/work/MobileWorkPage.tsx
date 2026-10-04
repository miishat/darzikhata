import type { ItemRef } from '@darzikhata/domain';
import { Printer, Ruler, Shirt } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { rovingTabsKeyDown } from '../../ui/rovingTabs';
import { DueLabel } from '../../ui/DueLabel';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { MeasurementTable } from '../customers/MeasurementTable';
import { MoveOn } from '../orders/ItemCard';
import { nextMove } from '../orders/stageMoves';
import { useWorkList } from './useWorkList';
import { WORK_PHASES, phaseCounts, workPhase, type WorkPhase } from './workList';

function Card({ refItem, showWorker }: { refItem: ItemRef; showWorker: boolean }) {
  const { t, language, label } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [measuring, setMeasuring] = useState(false);
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
      <section aria-label={`${order.number} ${title}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5">
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
          {next && (
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <MoveOn
                order={order}
                item={item}
                stageKey={next.stage.key}
                label={t('work.finishStage', { stage: stage ? label(stage.label) : item.stageKey })}
                render={({ children, ...props }) => (
                  <button
                    type="button"
                    className="flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-brand px-4 text-base font-semibold text-on-brand hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
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
        <Dialog
          open
          title={t('item.measureTitle', { item: title })}
          onClose={() => setMeasuring(false)}
          actions={
            <Button variant="secondary" onClick={() => setMeasuring(false)}>
              {t('common.close')}
            </Button>
          }
        >
          <div className="text-ink">
            <MeasurementTable template={template} values={item.measurements.values} />
          </div>
        </Dialog>
      )}
    </li>
  );
}

/** The phone work list: three steps with counts, then one large card per garment with a single move-on button. */
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

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] font-bold">{viewer.seesAll ? t('nav.work') : t('work.mine')}</h1>
          <p className="text-sm text-muted">{t('work.count', { n: number(all.length) })}</p>
        </div>
        <Link
          to={`/print/work${search ? `?${search}` : ''}`}
          aria-label={t('work.print')}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-panel text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Printer aria-hidden="true" size={22} />
        </Link>
      </header>

      <div role="tablist" aria-label={t('work.stage')} className="grid grid-cols-3 gap-1 rounded-2xl bg-line p-1">
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
              onClick={() => setChosen(p)}
              onKeyDown={onKeyDown}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 text-[15px] focus-visible:outline-2 focus-visible:outline-brand ${
                active ? 'bg-panel font-bold text-brand-strong shadow-sm' : 'text-muted'
              }`}
            >
              {t(`work.phase.${p}`)}
              <b>{number(counts[p])}</b>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="work-panel" aria-labelledby={`work-tab-${phase}`}>
        {refs.length === 0 ? (
          <p className="text-muted">{all.length === 0 ? t('work.empty') : t('work.phaseEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {refs.map((r) => (
              <Card key={r.item.id} refItem={r} showWorker={viewer.seesAll} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
