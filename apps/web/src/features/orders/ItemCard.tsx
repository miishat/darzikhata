import { itemSummaryGroup, type Order, type OrderItem } from '@darzikhata/domain';
import { useState } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { problemText } from '../common/problemText';
import { MeasurementTable } from '../customers/MeasurementTable';
import { AdjustmentDialog, CancelItemDialog, ChangeStageDialog, EditItemDialog, HandOverDialog } from './itemDialogs';
import { nextMove } from './stageMoves';
import { usePhoto } from './usePhoto';

type DialogKind = 'handOver' | 'stage' | 'adjust' | 'edit' | 'cancel';

/** One garment of an order: where it is, who has it, what it needs, and what the signed-in person may do. */
export function ItemCard({ order, item }: { order: Order; item: OrderItem }) {
  const { t, language, label, date, number } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => setDialog(null);

  const title = itemTitle(order, item, language);
  const stage = item.stages.find((s) => s.key === item.stageKey);
  const worker = item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo) : undefined;
  const customer = state.customers[order.customerId];
  const template = config?.templates.find((tpl) => tpl.id === item.templateId);
  const stageName = (key: string) => {
    const found = item.stages.find((s) => s.key === key);
    return found ? label(found.label) : key;
  };

  const next = nextMove(item);
  const canMove = can('work.updateStage') && next !== null;
  const delivered = itemSummaryGroup(item) === 'delivered';

  return (
    <>
      <section aria-label={title} className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="font-semibold">{t('item.stage', { stage: stage ? label(stage.label) : item.stageKey })}</p>
        {item.wearer && <p>{item.wearer}</p>}
        <p className="text-sm text-muted">
          {worker ? t('item.worker', { name: worker.name }) : t('item.noWorker')}
        </p>
        {item.trialDate && <p className="text-sm">{t('item.trial', { date: date(item.trialDate) })}</p>}
        {item.deliveryDate && <p className="text-sm">{t('item.delivery', { date: date(item.deliveryDate) })}</p>}
        {item.designNotes && <p className="text-sm">{item.designNotes}</p>}
        {item.fabricNote && <p className="text-sm">{item.fabricNote}</p>}
        {item.photoIds.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {item.photoIds.map((id, index) => (
              <li key={id}>
                <Thumb id={id} alt={t('photos.photo', { n: number(index + 1) })} />
              </li>
            ))}
          </ul>
        )}

        {item.measurements &&
          (customer && hasAccess(customer) ? (
            template && <MeasurementTable template={template} values={item.measurements.values} />
          ) : (
            <p className="text-muted">{t('print.measurementsHidden')}</p>
          ))}

        {item.adjustments.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted">{t('item.adjustments')}</h4>
            <ul className="list-disc pl-5">
              {item.adjustments.map((a) => (
                <li key={a.id}>{a.note}</li>
              ))}
            </ul>
          </div>
        )}

        {item.stageHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted">{t('item.history')}</h4>
            <ul className="flex flex-col gap-1 text-sm">
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

        {item.cancelled ? (
          <p className="font-semibold text-danger">{t('item.cancelled', { reason: item.cancelled.reason })}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {canMove && next && (
              <>
                {next.stage.group === 'delivered' ? (
                  <Button onClick={() => setDialog('handOver')}>{t('item.handOver')}</Button>
                ) : (
                  <MoveOn order={order} item={item} stageKey={next.stage.key} label={t('item.moveTo', { stage: label(next.stage.label) })} />
                )}
                <Button variant="secondary" onClick={() => setDialog('stage')}>
                  {t('item.otherStage')}
                </Button>
              </>
            )}
            {can('orders.edit') && (
              <>
                <Button variant="secondary" onClick={() => setDialog('adjust')}>
                  {t('item.addAdjustment')}
                </Button>
                <Button variant="secondary" onClick={() => setDialog('edit')}>
                  {t('item.edit')}
                </Button>
              </>
            )}
            {can('orders.cancel') && !delivered && (
              <Button variant="danger" onClick={() => setDialog('cancel')}>
                {t('item.cancel')}
              </Button>
            )}
          </div>
        )}
      </section>
      {dialog === 'handOver' && <HandOverDialog order={order} item={item} onClose={close} />}
      {dialog === 'stage' && <ChangeStageDialog order={order} item={item} onClose={close} />}
      {dialog === 'adjust' && <AdjustmentDialog order={order} item={item} onClose={close} />}
      {dialog === 'edit' && <EditItemDialog order={order} item={item} onClose={close} />}
      {dialog === 'cancel' && <CancelItemDialog order={order} item={item} onClose={close} />}
    </>
  );
}

function Thumb({ id, alt }: { id: string; alt: string }) {
  const url = usePhoto(id);
  if (!url) return <div className="h-20 w-20 rounded bg-surface" aria-hidden="true" />;
  return <img src={url} alt={alt} className="h-20 w-20 rounded object-cover" />;
}

/** The one-tap move to the next stage. A failure is shown beside the button. */
function MoveOn({ order, item, stageKey, label }: { order: Order; item: OrderItem; stageKey: string; label: string }) {
  const store = useStore();
  const { language } = useI18n();
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const move = async () => {
    setWorking(true);
    setProblem(null);
    try {
      const outcome = await store.dispatch({ type: 'item.stageChanged', orderId: order.id, itemId: item.id, to: stageKey, reason: '' });
      setProblem(problemText(outcome, language));
    } finally {
      setWorking(false);
    }
  };
  return (
    <>
      <Button disabled={working} onClick={() => void move()}>
        {label}
      </Button>
      {problem && (
        <p role="alert" className="w-full text-danger">
          {problem}
        </p>
      )}
    </>
  );
}
