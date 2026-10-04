import { formatMeasurement, itemSummaryGroup, labelIn, type Order, type OrderItem } from '@darzikhata/domain';
import { ChevronRight, Ellipsis, Scissors, Shirt, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionSheet, ActionSheetItem } from '../../ui/ActionSheet';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { StageTracker, type TrackerStage } from '../../ui/StageTracker';
import { stageTone } from '../../ui/stageTone';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { MeasurementTable } from '../customers/MeasurementTable';
import { BatchAssignDialog } from '../work/batchDialogs';
import { MoveOn, Thumb } from './ItemCard';
import { AdjustmentDialog, CancelItemDialog, ChangeStageDialog, EditItemDialog, HandOverDialog } from './itemDialogs';
import { nextMove } from './stageMoves';

type DialogKind = 'handOver' | 'stage' | 'adjust' | 'edit' | 'cancel' | 'assign' | 'measure';

/** Optional stages the garment passed over: before the current stage and never entered. Unknown without history. */
export function trackerStages(item: OrderItem, label: (l: OrderItem['stages'][number]['label']) => string): TrackerStage[] {
  const current = item.stages.findIndex((s) => s.key === item.stageKey);
  const visited = new Set(item.stageHistory.flatMap((c) => [c.from, c.to]));
  return item.stages.map((stage, index) => ({
    key: stage.key,
    label: label(stage.label),
    skipped: item.stageHistory.length > 0 && stage.optional && index < current && !visited.has(stage.key),
  }));
}

/** One-line summary of the first few measurements, e.g. "ঝুল ২৮¾ · বুক ৩৬¾". */
function measureSummary(item: OrderItem, template: { fields: Array<{ key: string; label: Parameters<typeof labelIn>[0] }> } | undefined, language: 'bn' | 'en'): string {
  if (!item.measurements || !template) return '';
  return template.fields
    .filter((f) => item.measurements!.values[f.key])
    .slice(0, 5)
    .map((f) => `${labelIn(f.label, language)} ${formatMeasurement(item.measurements!.values[f.key]!.value, language)}`)
    .join(' · ');
}

/** Phone garment card: where it is, what is next, and one outlined button for the usual move. */
export function MobileItemCard({ order, item }: { order: Order; item: OrderItem }) {
  const { t, language, label, date, number } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => setDialog(null);

  const title = itemTitle(order, item, language);
  const stageIndex = item.stages.findIndex((s) => s.key === item.stageKey);
  const stage = item.stages[stageIndex];
  const group = itemSummaryGroup(item);
  const worker = item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo) : undefined;
  const customer = state.customers[order.customerId];
  const template = config?.templates.find((tpl) => tpl.id === item.templateId);
  const stageName = (key: string) => {
    const found = item.stages.find((s) => s.key === key);
    return found ? label(found.label) : key;
  };

  const next = nextMove(item);
  const canMove = can('work.updateStage') && next !== null;
  const delivered = group === 'delivered';
  const open = group === 'unfinished' || group === 'ready';
  const canSee = customer ? hasAccess(customer) : false;
  const summary = canSee ? measureSummary(item, template, language) : '';
  const menu = canMove || can('orders.edit') || (can('orders.cancel') && !delivered);

  return (
    <>
      <section aria-label={title} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-panel p-3.5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
            <Shirt size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            {item.wearer && <p className="truncate text-sm text-muted">{item.wearer}</p>}
            {item.deliveryDate && (
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                {t('item.deliveryOn', { date: date(item.deliveryDate) })}
                {open && <DueLabel date={item.deliveryDate} />}
              </p>
            )}
          </div>
          <StagePill
            label={stage ? label(stage.label) : item.stageKey}
            tone={stageTone(stage, group, Math.max(stageIndex, 0))}
          />
          {menu && !item.cancelled && (
            <ActionSheet label={t('item.moreActions', { item: title })} icon={Ellipsis} title={title}>
              {(done) => (
                <>
                  {canMove && (
                    <ActionSheetItem
                      onClick={() => {
                        done();
                        setDialog('stage');
                      }}
                    >
                      {t('item.otherStage')}
                    </ActionSheetItem>
                  )}
                  {can('orders.edit') && (
                    <>
                      <ActionSheetItem
                        onClick={() => {
                          done();
                          setDialog('adjust');
                        }}
                      >
                        {t('item.addAdjustment')}
                      </ActionSheetItem>
                      <ActionSheetItem
                        onClick={() => {
                          done();
                          setDialog('edit');
                        }}
                      >
                        {t('item.edit')}
                      </ActionSheetItem>
                    </>
                  )}
                  {can('orders.cancel') && !delivered && (
                    <ActionSheetItem
                      danger
                      onClick={() => {
                        done();
                        setDialog('cancel');
                      }}
                    >
                      {t('item.cancel')}
                    </ActionSheetItem>
                  )}
                </>
              )}
            </ActionSheet>
          )}
        </div>

        {!item.cancelled && (
          <StageTracker stages={trackerStages(item, label)} currentKey={item.stageKey} />
        )}

        {!item.cancelled && (
          <div className="flex flex-wrap gap-2">
            {item.trialDate && (
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-surface px-2.5 text-sm">
                <Scissors aria-hidden="true" size={16} />
                {t('item.trialOn', { date: date(item.trialDate) })}
              </span>
            )}
            {worker ? (
              <span className="inline-flex min-h-8 items-center rounded-lg bg-surface px-2.5 text-sm">
                {t('item.worker', { name: worker.name })}
              </span>
            ) : delivered ? null : can('work.assign') ? (
              <button
                type="button"
                onClick={() => setDialog('assign')}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-warn-soft px-2.5 text-sm font-semibold text-warn-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                <TriangleAlert aria-hidden="true" size={16} />
                {t('work.assign')}
              </button>
            ) : (
              <span className="inline-flex min-h-8 items-center rounded-lg bg-surface px-2.5 text-sm text-muted">{t('item.noWorker')}</span>
            )}
          </div>
        )}

        {item.measurements &&
          (canSee ? (
            template && (
              <button
                type="button"
                onClick={() => setDialog('measure')}
                className="flex min-h-11 items-center gap-2.5 rounded-xl border border-dashed border-line px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs text-muted">{t('item.measureSummary')}</span>
                  <span className="truncate text-sm">{summary}</span>
                </span>
                <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted rtl:rotate-180" />
              </button>
            )
          ) : (
            <p className="text-sm text-muted">{t('print.measurementsHidden')}</p>
          ))}

        {(item.designNotes || item.fabricNote || item.photoIds.length > 0 || item.adjustments.length > 0 || item.stageHistory.length > 0) && (
          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-muted">{t('item.details')}</summary>
            <div className="flex flex-col gap-2">
              {item.designNotes && <p>{item.designNotes}</p>}
              {item.fabricNote && <p>{item.fabricNote}</p>}
              {item.photoIds.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {item.photoIds.map((id, index) => (
                    <li key={id}>
                      <Thumb id={id} alt={t('photos.photo', { n: number(index + 1) })} />
                    </li>
                  ))}
                </ul>
              )}
              {item.adjustments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-muted">{t('item.adjustments')}</h4>
                  <ul className="list-disc pl-5">
                    {item.adjustments.map((a) => (
                      <li key={a.id}>{a.note}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item.stageHistory.length > 0 && (
                <div>
                  <h4 className="font-semibold text-muted">{t('item.history')}</h4>
                  <ul className="flex flex-col gap-1">
                    {item.stageHistory.map((change, index) => (
                      <li key={`${change.at}-${index}`}>
                        <span>
                          {stageName(change.from)} → {stageName(change.to)}
                        </span>
                        {change.kind === 'rework' && <span className="block text-danger">{t('item.rework', { reason: change.reason })}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}

        {item.cancelled ? (
          <p className="font-semibold text-danger">{t('item.cancelled', { reason: item.cancelled.reason })}</p>
        ) : (
          canMove &&
          next && (
            <div className="flex flex-col gap-2">
              {next.stage.group === 'delivered' ? (
                <OutlinedButton data-tour="hand-over" onClick={() => setDialog('handOver')}>
                  {t('item.handOver')}
                </OutlinedButton>
              ) : (
                <MoveOn
                  order={order}
                  item={item}
                  stageKey={next.stage.key}
                  label={t('item.nextFromTo', { from: stage ? label(stage.label) : item.stageKey, to: label(next.stage.label) })}
                  render={(props) => <OutlinedButton {...props} />}
                />
              )}
            </div>
          )
        )}
      </section>

      {dialog === 'handOver' && <HandOverDialog order={order} item={item} onClose={close} />}
      {dialog === 'stage' && <ChangeStageDialog order={order} item={item} onClose={close} />}
      {dialog === 'adjust' && <AdjustmentDialog order={order} item={item} onClose={close} />}
      {dialog === 'edit' && <EditItemDialog order={order} item={item} onClose={close} />}
      {dialog === 'cancel' && <CancelItemDialog order={order} item={item} onClose={close} />}
      {dialog === 'assign' && <BatchAssignDialog refs={[{ order, item }]} onClose={close} />}
      {dialog === 'measure' && template && item.measurements && (
        <Dialog
          open
          title={t('item.measureTitle', { item: title })}
          onClose={close}
          actions={
            <Button variant="secondary" onClick={close}>
              {t('common.close')}
            </Button>
          }
        >
          <div className="text-ink">
            <MeasurementTable template={template} values={item.measurements.values} />
          </div>
        </Dialog>
      )}
    </>
  );
}

/** The one outlined button of a garment card: it moves the garment on, so it must not look like the page's main action. */
function OutlinedButton({ children, ...props }: { children: React.ReactNode; disabled?: boolean; onClick?(): void; 'data-tour'?: string }) {
  return (
    <button
      type="button"
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-brand bg-panel px-4 font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}
