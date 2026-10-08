// PROTOTYPE (throwaway): other desktop layouts for a garment card in the order panel, behind ?variant=.
import { formatMeasurement, itemDeliveredAt, itemSummaryGroup, labelIn, type Language, type Order, type OrderItem } from '@darzikhata/domain';
import { ArrowRightLeft, Ban, CalendarDays, Check, ChevronDown, ChevronRight, Ellipsis, MessageSquare, Pencil, Ruler, Scissors, Shirt, UserPlus, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionSheet, ActionSheetItem } from '../../ui/ActionSheet';
import { Button, buttonClasses } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone, TONE_BAND } from '../../ui/stageTone';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { MeasurementTable } from '../customers/MeasurementTable';
import { BatchAssignDialog } from '../work/batchDialogs';
import { MoveOn, Thumb } from './ItemCard';
import { AdjustmentDialog, CancelItemDialog, ChangeStageDialog, EditItemDialog, HandOverDialog } from './itemDialogs';
import { nextMove } from './stageMoves';

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

type DialogKind = 'handOver' | 'stage' | 'adjust' | 'edit' | 'cancel' | 'assign' | 'measure';

function useItem(order: Order, item: OrderItem) {
  const { language, label } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const title = itemTitle(order, item, language);
  const stageIndex = item.stages.findIndex((s) => s.key === item.stageKey);
  const stage = item.stages[stageIndex];
  const group = itemSummaryGroup(item);
  const worker = item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo) : undefined;
  const customer = state.customers[order.customerId];
  const template = config?.templates.find((tpl) => tpl.id === item.templateId);
  const canSee = customer ? hasAccess(customer) : false;
  const next = nextMove(item);
  const canMove = can('work.updateStage') && next !== null;
  const delivered = group === 'delivered';
  const open = group === 'unfinished' || group === 'ready';
  const canCancel = can('orders.cancel') && !delivered && !item.cancelled;
  const menu = (canMove || can('orders.edit') || canCancel) && !item.cancelled;
  const stageName = (key: string) => {
    const found = item.stages.find((s) => s.key === key);
    return found ? label(found.label) : key;
  };
  const summary =
    canSee && item.measurements && template
      ? template.fields
          .filter((f) => item.measurements!.values[f.key])
          .slice(0, 5)
          .map((f) => `${labelIn(f.label, language)} ${formatMeasurement(item.measurements!.values[f.key]!.value, language)}`)
          .join(' · ')
      : '';
  const tone = stageTone(stage, group, Math.max(stageIndex, 0));
  const hasNotes = !!(item.designNotes || item.fabricNote || item.photoIds.length > 0 || item.adjustments.length > 0 || item.stageHistory.length > 0);
  return { title, stageIndex, stage, group, worker, template, canSee, next, canMove, delivered, open, canCancel, menu, stageName, summary, tone, hasNotes, can };
}

type ItemData = ReturnType<typeof useItem>;

function Menu({ d, setDialog, className }: { d: ItemData; setDialog(k: DialogKind): void; className?: string }) {
  const { t } = useI18n();
  if (!d.menu) return null;
  const entry = (kind: DialogKind, text: string, icon: typeof Pencil, done: () => void, danger?: boolean) => (
    <ActionSheetItem
      icon={icon}
      tone="neutral"
      {...(danger ? { danger } : {})}
      onClick={() => {
        done();
        setDialog(kind);
      }}
    >
      {text}
    </ActionSheetItem>
  );
  return (
    <ActionSheet label={t('item.moreActions', { item: d.title })} icon={Ellipsis} title={d.title} {...(className ? { triggerClassName: className } : {})}>
      {(done) => (
        <>
          {d.canMove && entry('stage', t('item.otherStage'), ArrowRightLeft, done)}
          {d.can('orders.edit') && entry('adjust', t('item.addAdjustment'), MessageSquare, done)}
          {d.can('orders.edit') && entry('edit', t('item.edit'), Pencil, done)}
          {d.canCancel && entry('cancel', t('item.cancel'), Ban, done, true)}
        </>
      )}
    </ActionSheet>
  );
}

/** The usual next move: a filled or outlined button, or a delivered note. */
function NextButton({ order, item, d, setDialog, filled }: { order: Order; item: OrderItem; d: ItemData; setDialog(k: DialogKind): void; filled?: boolean }) {
  const { t, label } = useI18n();
  if (!d.canMove || !d.next) return null;
  const cls = filled
    ? `${buttonClasses('primary')} flex-1`
    : `${buttonClasses('secondary')} flex-1 border-brand text-brand-strong`;
  if (d.next.stage.group === 'delivered')
    return (
      <button type="button" onClick={() => setDialog('handOver')} className={cls}>
        {t('item.handOver')}
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    );
  return (
    <MoveOn
      order={order}
      item={item}
      stageKey={d.next.stage.key}
      label={t('item.moveTo', { stage: label(d.next.stage.label) })}
      render={(props) => (
        <button type="button" disabled={props.disabled} onClick={props.onClick} className={cls}>
          {props.children}
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      )}
    />
  );
}

function Delivered({ item }: { item: OrderItem }) {
  const { t, date } = useI18n();
  const at = itemDeliveredAt(item);
  return (
    <p className="flex flex-1 items-center gap-2 text-sm font-semibold text-ok">
      <Check aria-hidden="true" size={18} />
      {at ? t('item.deliveredOn', { date: date(at.slice(0, 10)) }) : t('stageGroup.delivered')}
    </p>
  );
}

function Notes({ item, d }: { item: OrderItem; d: ItemData }) {
  const { t, number } = useI18n();
  if (!d.hasNotes) return null;
  return (
    <details className="group text-sm">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 font-semibold text-muted">
        {t('item.details')}
        <ChevronDown aria-hidden="true" size={16} className="group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-2 pt-1">
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
                  {d.stageName(change.from)} → {d.stageName(change.to)}
                  {change.kind === 'rework' && <span className="block text-danger">{t('item.rework', { reason: change.reason })}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function Measures({ item, d, setDialog }: { item: OrderItem; d: ItemData; setDialog(k: DialogKind): void }) {
  const { t } = useI18n();
  if (!item.measurements) return null;
  if (!d.canSee) return <p className="text-sm text-muted">{t('print.measurementsHidden')}</p>;
  if (!d.template) return null;
  return (
    <button
      type="button"
      onClick={() => setDialog('measure')}
      className="flex min-h-10 items-center gap-2.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-start hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Ruler aria-hidden="true" size={16} className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="text-muted">{t('item.measureSummary')}: </span>
        {d.summary}
      </span>
      <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-muted" />
    </button>
  );
}

function AssignOrWorker({ d, setDialog, children }: { d: ItemData; setDialog(k: DialogKind): void; children(name: string): ReactNode }) {
  const { t } = useI18n();
  if (d.worker) return <>{children(d.worker.name)}</>;
  if (d.delivered) return null;
  if (d.can('work.assign'))
    return (
      <button
        type="button"
        onClick={() => setDialog('assign')}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 text-sm text-muted hover:bg-surface"
      >
        <UserPlus aria-hidden="true" size={16} />
        {t('work.assign')}
      </button>
    );
  return <span className="text-sm text-muted">{t('item.noWorker')}</span>;
}

function Dialogs({ order, item, d, dialog, close }: { order: Order; item: OrderItem; d: ItemData; dialog: DialogKind | null; close(): void }) {
  const { t } = useI18n();
  return (
    <>
      {dialog === 'handOver' && <HandOverDialog order={order} item={item} onClose={close} />}
      {dialog === 'stage' && <ChangeStageDialog order={order} item={item} onClose={close} />}
      {dialog === 'adjust' && <AdjustmentDialog order={order} item={item} onClose={close} />}
      {dialog === 'edit' && <EditItemDialog order={order} item={item} onClose={close} />}
      {dialog === 'cancel' && <CancelItemDialog order={order} item={item} onClose={close} />}
      {dialog === 'assign' && <BatchAssignDialog refs={[{ order, item }]} onClose={close} />}
      {dialog === 'measure' && d.template && item.measurements && (
        <Dialog
          open
          title={`${d.title}: ${t('item.measureSummary')}`}
          onClose={close}
          actions={
            <Button variant="secondary" onClick={close}>
              {t('common.close')}
            </Button>
          }
        >
          <div className="text-ink">
            <MeasurementTable template={d.template} values={item.measurements.values} />
          </div>
        </Dialog>
      )}
    </>
  );
}

function Strip({ item, d, className = '' }: { item: OrderItem; d: ItemData; className?: string }) {
  const { number } = useI18n();
  if (item.cancelled || d.stageIndex < 0) return null;
  return (
    <div role="img" aria-label={`${number(d.stageIndex + 1)}/${number(item.stages.length)}`} className={`flex gap-1 ${className}`}>
      {item.stages.map((s, i) => (
        <span key={s.key} className={`h-1.5 flex-1 rounded-full bg-current ${i <= d.stageIndex ? '' : 'opacity-20'}`} />
      ))}
    </div>
  );
}

/** C: one compact header line, a three-column facts row, a measurement line and the move button beside the menu. */
function Compact({ order, item }: { order: Order; item: OrderItem }) {
  const { t, label, date, number } = useI18n();
  const d = useItem(order, item);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const Cell = ({ caption, children }: { caption: string; children: ReactNode }) => (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted">{caption}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">{children}</span>
    </div>
  );
  return (
    <>
      <section aria-label={d.title} className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-lg ${TONE_BAND[d.tone]}`}>
            <Shirt size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display font-semibold">{d.title}</h3>
            <p className="truncate text-xs text-muted">
              {[item.wearer, !item.cancelled && d.stageIndex >= 0 ? t('item.stepOf', { n: number(d.stageIndex + 1), total: number(item.stages.length) }) : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
          <StagePill label={d.stage ? label(d.stage.label) : item.stageKey} tone={d.tone} />
          {!d.canMove && !d.delivered && <Menu d={d} setDialog={setDialog} />}
        </div>
        <Strip item={item} d={d} className="text-brand" />
        {!item.cancelled && (
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-surface/60 px-3 py-2">
            <Cell caption={t('item.deliveryLabel')}>
              {item.deliveryDate ? date(item.deliveryDate) : '—'}
            </Cell>
            <Cell caption={t('item.trialLabel')}>{item.trialDate ? date(item.trialDate) : '—'}</Cell>
            <Cell caption={t('item.workerLabel')}>
              <AssignOrWorker d={d} setDialog={setDialog}>
                {(name) => <span className="truncate">{name}</span>}
              </AssignOrWorker>
            </Cell>
          </div>
        )}
        {d.open && item.deliveryDate && !item.cancelled && (
          <div className="-mt-1">
            <DueLabel date={item.deliveryDate} />
          </div>
        )}
        <Measures item={item} d={d} setDialog={setDialog} />
        {item.cancelled ? (
          <p className="font-semibold text-danger">{t('item.cancelled', { reason: item.cancelled.reason })}</p>
        ) : (
          (d.canMove || d.delivered) && <div className="flex items-center gap-2">
            {d.canMove ? <NextButton order={order} item={item} d={d} setDialog={setDialog} /> : <Delivered item={item} />}
            <Menu d={d} setDialog={setDialog} className="size-10! rounded-lg! border border-line" />
          </div>
        )}
        <Notes item={item} d={d} />
      </section>
      <Dialogs order={order} item={item} d={d} dialog={dialog} close={() => setDialog(null)} />
    </>
  );
}

/** D: the phone's coloured status band, slimmer, with the facts as one line and a filled move button. */
function Band({ order, item }: { order: Order; item: OrderItem }) {
  const { t, date, number } = useI18n();
  const d = useItem(order, item);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  return (
    <>
      <section aria-label={d.title} className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className={`flex flex-col gap-2 px-3 py-2.5 ${TONE_BAND[d.tone]}`}>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate">
              <span className="font-display font-bold">{d.stageName(item.stageKey)}</span>
              {!item.cancelled && d.stageIndex >= 0 && (
                <span className="ms-2 text-xs font-semibold opacity-80">
                  {number(d.stageIndex + 1)}/{number(item.stages.length)}
                </span>
              )}
            </p>
            {d.open && item.deliveryDate && <DueLabel date={item.deliveryDate} />}
            <Menu d={d} setDialog={setDialog} className="size-8! min-h-8! min-w-8!" />
          </div>
          <Strip item={item} d={d} />
        </div>
        <div className="flex flex-col gap-2.5 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-semibold">{d.title}</h3>
              {item.wearer && <p className="truncate text-sm text-muted">{item.wearer}</p>}
            </div>
            {item.deliveryDate && (
              <p className="shrink-0 text-end text-sm">
                <span className="text-muted">{t('item.deliveryLabel')} </span>
                <span className="font-semibold">{date(item.deliveryDate)}</span>
              </p>
            )}
          </div>
          {!item.cancelled && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {item.trialDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Scissors aria-hidden="true" size={15} className="text-muted" />
                  <span className="text-muted">{t('item.trialLabel')}</span> {date(item.trialDate)}
                </span>
              )}
              <AssignOrWorker d={d} setDialog={setDialog}>
                {(name) => (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound aria-hidden="true" size={15} className="text-muted" />
                    <span className="text-muted">{t('item.workerLabel')}</span> {name}
                  </span>
                )}
              </AssignOrWorker>
            </div>
          )}
          <Measures item={item} d={d} setDialog={setDialog} />
          {item.cancelled ? (
            <p className="font-semibold text-danger">{t('item.cancelled', { reason: item.cancelled.reason })}</p>
          ) : d.canMove ? (
            <div className="flex">
              <NextButton order={order} item={item} d={d} setDialog={setDialog} filled />
            </div>
          ) : (
            d.delivered && <Delivered item={item} />
          )}
          <Notes item={item} d={d} />
        </div>
      </section>
      <Dialogs order={order} item={item} d={d} dialog={dialog} close={() => setDialog(null)} />
    </>
  );
}

/** E: named stages as a stepper (done, now, next), the facts as a two-column list, actions along the bottom. */
function Stepper({ order, item }: { order: Order; item: OrderItem }) {
  const { t, label, date, language } = useI18n();
  const d = useItem(order, item);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const prev = d.stageIndex > 0 ? item.stages[d.stageIndex - 1] : undefined;
  const after = item.stages[d.stageIndex + 1];
  const Row = ({ icon: Icon, caption, children }: { icon: typeof Shirt; caption: string; children: ReactNode }) => (
    <div className="flex items-center gap-2 py-1.5">
      <Icon aria-hidden="true" size={16} className="shrink-0 text-muted" />
      <dt className="w-24 shrink-0 text-sm text-muted">{caption}</dt>
      <dd className="m-0 flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold">{children}</dd>
    </div>
  );
  return (
    <>
      <section aria-label={d.title} className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-semibold">{d.title}</h3>
            {item.wearer && <p className="truncate text-sm text-muted">{item.wearer}</p>}
          </div>
          <Menu d={d} setDialog={setDialog} />
        </div>
        {!item.cancelled && d.stageIndex >= 0 && (
          <ol aria-label={pick(language, 'ধাপ', 'Stages')} className="m-0 grid list-none grid-cols-3 items-center gap-1 rounded-lg bg-surface/60 p-1 text-center text-sm">
            <li className="truncate px-2 py-1.5 text-muted">{prev ? <>✓ {label(prev.label)}</> : '—'}</li>
            <li aria-current="step" className={`truncate rounded-md px-2 py-1.5 font-semibold ${TONE_BAND[d.tone]}`}>
              {d.stage ? label(d.stage.label) : item.stageKey}
            </li>
            <li className="truncate px-2 py-1.5 text-muted">{after ? <>{label(after.label)} →</> : '—'}</li>
          </ol>
        )}
        {!item.cancelled && (
          <dl className="m-0 flex flex-col divide-y divide-line">
            {item.deliveryDate && (
              <Row icon={CalendarDays} caption={t('item.deliveryLabel')}>
                {date(item.deliveryDate)}
                {d.open && <DueLabel date={item.deliveryDate} />}
              </Row>
            )}
            {item.trialDate && (
              <Row icon={Scissors} caption={t('item.trialLabel')}>
                {date(item.trialDate)}
              </Row>
            )}
            <Row icon={UserRound} caption={t('item.workerLabel')}>
              <AssignOrWorker d={d} setDialog={setDialog}>
                {(name) => name}
              </AssignOrWorker>
            </Row>
          </dl>
        )}
        <Measures item={item} d={d} setDialog={setDialog} />
        {item.cancelled ? (
          <p className="font-semibold text-danger">{t('item.cancelled', { reason: item.cancelled.reason })}</p>
        ) : d.canMove ? (
          <div className="flex">
            <NextButton order={order} item={item} d={d} setDialog={setDialog} />
          </div>
        ) : (
          d.delivered && <Delivered item={item} />
        )}
        <Notes item={item} d={d} />
      </section>
      <Dialogs order={order} item={item} d={d} dialog={dialog} close={() => setDialog(null)} />
    </>
  );
}

export function ItemCardPrototype({ variant, order, item }: { variant: string; order: Order; item: OrderItem }) {
  if (variant === 'C') return <Compact order={order} item={item} />;
  if (variant === 'D') return <Band order={order} item={item} />;
  return <Stepper order={order} item={item} />;
}
