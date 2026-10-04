import { formatMeasurement, itemSummaryGroup, labelIn, type Order, type OrderItem } from '@darzikhata/domain';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Ellipsis, Scissors, Shirt, UserPlus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionSheet, ActionSheetItem } from '../../ui/ActionSheet';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { DueLabel } from '../../ui/DueLabel';
import { stageTone, TONE_BAND } from '../../ui/stageTone';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { MeasurementTable } from '../customers/MeasurementTable';
import { BatchAssignDialog } from '../work/batchDialogs';
import { MoveOn, Thumb } from './ItemCard';
import { AdjustmentDialog, CancelItemDialog, ChangeStageDialog, EditItemDialog, HandOverDialog } from './itemDialogs';
import { nextMove } from './stageMoves';

type DialogKind = 'handOver' | 'stage' | 'adjust' | 'edit' | 'cancel' | 'assign' | 'measure';

/** One-line summary of the first few measurements, e.g. "ঝুল ২৮¾ · বুক ৩৬¾". */
function measureSummary(item: OrderItem, template: { fields: Array<{ key: string; label: Parameters<typeof labelIn>[0] }> } | undefined, language: 'bn' | 'en'): string {
  if (!item.measurements || !template) return '';
  return template.fields
    .filter((f) => item.measurements!.values[f.key])
    .slice(0, 5)
    .map((f) => `${labelIn(f.label, language)} ${formatMeasurement(item.measurements!.values[f.key]!.value, language)}`)
    .join(' · ');
}

/** Phone garment card: a status band (stage, step, due), the garment's facts, and one filled button for the usual move. */
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
  const tone = stageTone(stage, group, Math.max(stageIndex, 0));
  const menu = canMove || can('orders.edit') || (can('orders.cancel') && !delivered);

  return (
    <>
      <section aria-label={title} className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className={`flex flex-col gap-2.5 px-4 pt-3 pb-3.5 ${TONE_BAND[tone]}`}>
          <div className="flex items-center gap-3">
            <Shirt aria-hidden="true" size={26} className="shrink-0" />
            <div className="min-w-0 flex-1">
              {!item.cancelled && (
                <p className="text-xs font-semibold">{t('item.stepOf', { n: number(stageIndex + 1), total: number(item.stages.length) })}</p>
              )}
              <p className="font-display text-xl leading-tight font-bold">{stageName(item.stageKey)}</p>
            </div>
            {open && item.deliveryDate && <DueLabel date={item.deliveryDate} />}
          </div>
          {!item.cancelled && (
            <div className="flex gap-1" role="img" aria-label={`${number(stageIndex + 1)}/${number(item.stages.length)}`}>
              {item.stages.map((s, i) => (
                <span key={s.key} className={`h-1.5 flex-1 rounded-full bg-current ${i <= stageIndex ? '' : 'opacity-20'}`} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            {item.wearer && <p className="truncate text-sm text-muted">{item.wearer}</p>}
          </div>
          {item.deliveryDate && (
            <p className="shrink-0 text-end text-sm leading-tight">
              <span className="block text-xs text-muted">{t('item.deliveryLabel')}</span>
              <span className="font-semibold">{date(item.deliveryDate)}</span>
            </p>
          )}
        </div>

        {!item.cancelled && (
          <div className="grid grid-cols-2 gap-2">
            {item.trialDate && (
              <Fact icon={Scissors} caption={t('item.trialLabel')} value={date(item.trialDate)} wide={!worker} />
            )}
            {worker ? (
              <Fact icon={UserRound} caption={t('item.workerLabel')} value={worker.name} wide={!item.trialDate} />
            ) : delivered ? null : can('work.assign') ? (
              <button
                type="button"
                onClick={() => setDialog('assign')}
                className="col-span-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm text-muted focus-visible:outline-2 focus-visible:outline-focus"
              >
                <UserPlus aria-hidden="true" size={18} />
                {t('work.assign')}
                <ChevronRight aria-hidden="true" size={16} className="ms-auto rtl:rotate-180" />
              </button>
            ) : (
              <span className="col-span-2 inline-flex min-h-11 items-center rounded-xl bg-surface px-3 text-sm text-muted">{t('item.noWorker')}</span>
            )}
          </div>
        )}

        {item.measurements &&
          (canSee ? (
            template && (
              <button
                type="button"
                onClick={() => setDialog('measure')}
                className="flex min-h-11 items-center gap-2.5 rounded-xl border border-dashed border-line px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-focus"
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

        {item.cancelled ? (
          <p className="font-semibold text-danger">{t('item.cancelled', { reason: item.cancelled.reason })}</p>
        ) : (
          (canMove || menu) && (
            <div className="flex items-center gap-2">
              {canMove && next && (
                next.stage.group === 'delivered' ? (
                  <PrimaryButton data-tour="hand-over" onClick={() => setDialog('handOver')}>
                    {t('item.handOver')}
                  </PrimaryButton>
                ) : (
                  <MoveOn
                    order={order}
                    item={item}
                    stageKey={next.stage.key}
                    label={t('item.moveTo', { stage: label(next.stage.label) })}
                    render={(props) => <PrimaryButton {...props} />}
                  />
                )
              )}
              {menu && (
                <ActionSheet label={t('item.moreActions', { item: title })} icon={Ellipsis} title={title} triggerClassName="size-14! rounded-2xl! border border-line">
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
          )
        )}

        {(item.designNotes || item.fabricNote || item.photoIds.length > 0 || item.adjustments.length > 0 || item.stageHistory.length > 0) && (
          <details className="group text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center justify-center gap-1 font-semibold text-muted">
              {t('item.details')}
              <ChevronDown aria-hidden="true" size={16} className="group-open:rotate-180" />
            </summary>
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
        </div>
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

/** The garment card's one filled button: it moves the garment on (or hands it over). */
function PrimaryButton({ children, ...props }: { children: React.ReactNode; disabled?: boolean; onClick?(): void; 'data-tour'?: string }) {
  return (
    <button
      type="button"
      className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-base font-bold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
      {...props}
    >
      {children}
      <ChevronRight aria-hidden="true" size={20} className="rtl:rotate-180" />
    </button>
  );
}

/** A small labelled fact tile (trial date, worker). Two sit side by side; a lone one takes the full row. */
function Fact({ icon: Icon, caption, value, wide }: { icon: LucideIcon; caption: string; value: string; wide: boolean }) {
  return (
    <div className={`flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl bg-surface px-3 ${wide ? 'col-span-2' : ''}`}>
      <Icon aria-hidden="true" size={18} className="shrink-0 text-muted" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-xs text-muted">{caption}</span>
        <span className="truncate text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}
