import { isOrderClosed, itemSummaryGroup, moneySummary, orderProgress, type Order, type OrderItem } from '@darzikhata/domain';
import { Ellipsis, EllipsisVertical, ExternalLink, FileText, MessageSquare, Pencil, Phone, Printer, Repeat, Scissors, Share2, Tag, Ban, TriangleAlert, X, ArrowRightLeft, CalendarDays, UserRound, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionGroup, ActionSheet, ActionSheetItem } from '../../ui/ActionSheet';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { StageStrip } from '../../ui/StageStrip';
import { stageTone } from '../../ui/stageTone';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle, progressText } from '../common/orderText';
import { MeasurementTable } from '../customers/MeasurementTable';
import { StatusLinkSection } from '../links/StatusLinkSection';
import { MoneyCard, useMoneyDialogs } from '../payments/OrderMoney';
import { BatchAssignDialog } from '../work/batchDialogs';
import { MoveOn, Thumb } from './ItemCard';
import { AdjustmentDialog, CancelItemDialog, ChangeStageDialog, EditItemDialog, HandOverDialog } from './itemDialogs';
import { nextMove } from './stageMoves';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { ItemCardPrototype } from './ItemCardPrototype';
import { MobileItemCard } from './MobileItemCard';

const VARIANTS = { A: 'Current card', B: 'Phone card as is', C: 'A, facts tidied', D: 'Slim status band', E: 'Named stage stepper', F: 'D, worker right, notes centred', G: 'D, worker right, notes beside the button' };

/** Where the order's own page lives; the list's own filters stay in the address so Back returns to them. */
export function fullPageTo(orderId: string, search: string): { pathname: string; search: string } {
  const params = new URLSearchParams(search);
  params.set('full', '1');
  return { pathname: `/app/orders/${orderId}`, search: `?${params.toString()}` };
}

/** Who took the order and when, and its branch when the shop has more than one. */
export function useOrderByline(order: Order): string {
  const { t, date, label } = useI18n();
  const { config } = useSnapshot();
  const takenBy = config?.staff.find((s) => s.id === order.createdBy)?.name;
  const branch = config && config.branches.length > 1 ? config.branches.find((b) => b.id === order.branchId) : undefined;
  const taken = date(order.createdAt.slice(0, 10));
  return [takenBy ? t('order.takenBy', { date: taken, name: takenBy }) : t('order.takenOn', { date: taken }), branch ? label(branch.name) : '']
    .filter(Boolean)
    .join(' · ');
}

/**
 * Handing over from a whole order: the garments ready to go, and `start`, which opens the hand-over for the
 * only one, or first asks which when several are ready. `element` holds the dialogs.
 */
export function useOrderHandOver(order: Order) {
  const { t, language } = useI18n();
  const can = useCan();
  const [picking, setPicking] = useState(false);
  const [handingId, setHandingId] = useState<string | null>(null);
  const ready = order.items.filter((item) => can('work.updateStage') && nextMove(item)?.stage.group === 'delivered');
  const handing = order.items.find((item) => item.id === handingId);

  const start = () => {
    if (ready.length === 1) setHandingId(ready[0]!.id);
    else if (ready.length > 1) setPicking(true);
  };

  const element = (
    <>
      {picking && (
        <Dialog
          open
          title={t('order.handOverPick')}
          onClose={() => setPicking(false)}
          actions={
            <Button variant="secondary" onClick={() => setPicking(false)}>
              {t('common.cancel')}
            </Button>
          }
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {ready.map((item) => (
              <li key={item.id}>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full justify-start"
                  onClick={() => {
                    setPicking(false);
                    setHandingId(item.id);
                  }}
                >
                  {itemTitle(order, item, language)}
                </Button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {handing && <HandOverDialog order={order} item={handing} onClose={() => setHandingId(null)} />}
    </>
  );
  return { ready, start, element };
}

/**
 * The order beside the list: who and when, the customer, the money, one block per garment,
 * and a footer for handing over and taking payment. Nothing here is done by a key press.
 */
export function OrderPanel({ order, onClose }: { order: Order; onClose(): void }) {
  const { t, language } = useI18n();
  const variant = useVariant(Object.keys(VARIANTS));
  const can = useCan();
  const { state } = useSnapshot();
  const { search } = useLocation();
  const money = useMoneyDialogs(order);
  const [sharing, setSharing] = useState(false);
  const handOver = useOrderHandOver(order);
  const byline = useOrderByline(order);

  const customer = state.customers[order.customerId];
  const ready = handOver.ready;
  const showTake = can('money.view') && can('payments.record') && moneySummary(order).balance > 0;
  const hasFooter = ready.length > 0 || showTake;
  const startHandOver = handOver.start;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <header className="flex flex-col gap-1">
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold tracking-wide">{order.number}</h2>
              <p className="text-sm text-muted">{byline}</p>
            </div>
            <Link
              to={fullPageTo(order.id, search)}
              aria-label={t('orders.openFull')}
              title={t('orders.openFull')}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <ExternalLink aria-hidden="true" size={20} />
            </Link>
            <ActionSheet
              label={t('order.more')}
              icon={EllipsisVertical}
              title={t('nav.more')}
              heading={{ title: order.number, sub: [customer?.name, byline].filter(Boolean).join(' · ') }}
            >
              {(close) => (
                <>
                  <ActionGroup label={t('print.papers')}>
                    {can('money.view') && <ActionSheetItem to={`/print/receipt/${order.id}`} icon={Printer} tone="brand">{t('order.printReceipt')}</ActionSheetItem>}
                    <ActionSheetItem to={`/print/job/${order.id}`} icon={FileText} tone="ok">{t('order.jobSlip')}</ActionSheetItem>
                    <ActionSheetItem to={`/print/tags/${order.id}`} icon={Tag} tone="warn">{t('order.tags')}</ActionSheetItem>
                  </ActionGroup>
                  <ActionGroup label={t('nav.orders')}>
                  {can('orders.create') && (
                    <ActionSheetItem to={`/app/orders/new?repeat=${order.id}`} icon={Repeat} tone="neutral" data-tour="order-again">
                      {t('order.orderAgain')}
                    </ActionSheetItem>
                  )}
                  {can('links.manage') && (
                    <ActionSheetItem
                      icon={Share2}
                      tone="brand"
                      onClick={() => {
                        close();
                        setSharing(true);
                      }}
                    >
                      {t('order.share')}
                    </ActionSheetItem>
                  )}
                  </ActionGroup>
                </>
              )}
            </ActionSheet>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={onClose}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span data-tour="order-status" className="font-semibold">
              {isOrderClosed(order) ? t('order.statusClosed') : t('order.statusOpen')}
            </span>
            <span className="text-muted">{progressText(orderProgress(order), language)}</span>
          </p>
        </header>

        {customer && (
          <section aria-label={t('order.customer')} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3">
            <Avatar id={customer.id} name={customer.name} />
            <Link to={`/app/customers/${customer.id}`} className="flex min-w-0 flex-1 flex-col focus-visible:outline-2 focus-visible:outline-focus">
              <span className="truncate font-semibold">{customer.name}</span>
              {customer.phone && <span className="truncate text-sm text-muted">{customer.phone}</span>}
            </Link>
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                aria-label={t('order.call')}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Phone aria-hidden="true" size={18} />
              </a>
            )}
          </section>
        )}

        {can('money.view') && <MoneyCard order={order} open={money.open} />}

        {order.items.map((item) =>
          variant === 'A' ? (
            <PanelItem key={item.id} order={order} item={item} />
          ) : variant === 'C' ? (
            <PanelItem key={item.id} order={order} item={item} tidy />
          ) : variant === 'B' ? (
            <MobileItemCard key={item.id} order={order} item={item} />
          ) : (
            <ItemCardPrototype key={item.id} variant={variant} order={order} item={item} />
          ),
        )}
        <PrototypeSwitcher variants={VARIANTS} />
      </div>

      {hasFooter && (
        <div className="flex gap-2 border-t border-line bg-panel p-3">
          {ready.length > 0 && (
            <Button variant="secondary" className="flex-1" onClick={startHandOver}>
              {t('order.handOverBar')}
            </Button>
          )}
          {showTake && (
            <Button className="flex-[1.4]" onClick={() => money.open({ kind: 'take' })}>
              {t('payments.take')}
            </Button>
          )}
        </div>
      )}

      {money.element}
      {sharing && (
        <Dialog
          open
          title={t('link.section')}
          onClose={() => setSharing(false)}
          actions={
            <Button variant="secondary" onClick={() => setSharing(false)}>
              {t('common.close')}
            </Button>
          }
        >
          <div className="text-ink">
            <StatusLinkSection order={order} inDialog />
          </div>
        </Dialog>
      )}
      {handOver.element}
    </div>
  );
}

type DialogKind = 'handOver' | 'stage' | 'adjust' | 'edit' | 'cancel' | 'assign';

/** One garment in the panel: stage, a strip of progress, the usual next move, and the rest behind a menu. */
export function PanelItem({ order, item, tidy }: { order: Order; item: OrderItem; tidy?: boolean }) {
  const { t, language, label, date, number } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => setDialog(null);

  const title = itemTitle(order, item, language);
  const stageIndex = item.stages.findIndex((s) => s.key === item.stageKey);
  const stage = item.stages[stageIndex];
  const stageName = (key: string) => {
    const found = item.stages.find((s) => s.key === key);
    return found ? label(found.label) : key;
  };
  const group = itemSummaryGroup(item);
  const worker = item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo) : undefined;
  const customer = state.customers[order.customerId];
  const template = config?.templates.find((tpl) => tpl.id === item.templateId);
  const canSee = customer ? hasAccess(customer) : false;

  const next = nextMove(item);
  const canMove = can('work.updateStage') && next !== null;
  const delivered = group === 'delivered';
  const open = group === 'unfinished' || group === 'ready';
  const menu = canMove || can('orders.edit') || (can('orders.cancel') && !delivered && !item.cancelled);
  const hasDetails = item.designNotes || item.fabricNote || item.photoIds.length > 0 || item.adjustments.length > 0 || item.stageHistory.length > 0 || (item.measurements && canSee && template);

  const menuItem = (kind: DialogKind, text: string, icon: LucideIcon, done: () => void, danger?: boolean) => (
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
    <>
      <section aria-label={title} className="flex flex-col gap-2.5 rounded-xl border border-line bg-panel p-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold">{title}</h3>
            {item.wearer && <p className="truncate text-sm text-muted">{item.wearer}</p>}
          </div>
          <StagePill label={stage ? label(stage.label) : item.stageKey} tone={stageTone(stage, group, Math.max(stageIndex, 0))} />
          {menu && !item.cancelled && (
            <ActionSheet
              label={t('item.moreActions', { item: title })}
              icon={Ellipsis}
              title={title}
              heading={{ title, sub: [item.wearer, stage ? label(stage.label) : ''].filter(Boolean).join(' · ') }}
            >
              {(done) => (
                <>
                  {(canMove || can('orders.edit')) && (
                    <ActionGroup label={t('item.thisGarment')}>
                      {canMove && menuItem('stage', t('item.otherStage'), ArrowRightLeft, done)}
                      {can('orders.edit') && (
                        <>
                          {menuItem('adjust', t('item.addAdjustment'), MessageSquare, done)}
                          {menuItem('edit', t('item.edit'), Pencil, done)}
                        </>
                      )}
                    </ActionGroup>
                  )}
                  {can('orders.cancel') && !delivered && !item.cancelled && <ActionGroup>{menuItem('cancel', t('item.cancel'), Ban, done, true)}</ActionGroup>}
                </>
              )}
            </ActionSheet>
          )}
        </div>

        {!item.cancelled && stageIndex >= 0 && <StageStrip total={item.stages.length} current={stageIndex + 1} stage={stage ? label(stage.label) : item.stageKey} />}

        {!item.cancelled && tidy && (
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <CalendarDays aria-hidden="true" size={15} className="text-muted" />
                <span className="text-muted">{t('item.deliveryLabel')}</span>
                <span className="font-semibold">{item.deliveryDate ? date(item.deliveryDate) : '—'}</span>
                {open && item.deliveryDate && <DueLabel date={item.deliveryDate} />}
              </span>
              {worker ? (
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <UserRound aria-hidden="true" size={15} className="text-muted" />
                  <span className="text-muted">{t('item.workerLabel')}</span>
                  <span className="font-semibold">{worker.name}</span>
                </span>
              ) : delivered ? null : can('work.assign') ? (
                <button
                  type="button"
                  onClick={() => setDialog('assign')}
                  className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg ring-1 ring-inset ring-warn-line bg-warn-soft px-2 font-semibold text-warn-ink focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <TriangleAlert aria-hidden="true" size={14} />
                  {t('work.assign')}
                </button>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-warn">
                  <TriangleAlert aria-hidden="true" size={14} />
                  {t('item.noWorker')}
                </span>
              )}
            </div>
            {item.trialDate && (
              <span className="inline-flex items-center gap-1.5">
                <Scissors aria-hidden="true" size={15} className="text-muted" />
                <span className="text-muted">{t('item.trialLabel')}</span>
                <span className="font-semibold">{date(item.trialDate)}</span>
              </span>
            )}
          </div>
        )}

        {!item.cancelled && !tidy && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {item.deliveryDate && (
              <span className="inline-flex flex-wrap items-center gap-x-2 text-muted">
                {t('item.deliveryOn', { date: date(item.deliveryDate) })}
                {open && <DueLabel date={item.deliveryDate} />}
              </span>
            )}
            {item.trialDate && (
              <span className="inline-flex items-center gap-1 text-muted">
                <Scissors aria-hidden="true" size={14} />
                {t('item.trialOn', { date: date(item.trialDate) })}
              </span>
            )}
            {worker ? (
              <span>{t('item.worker', { name: worker.name })}</span>
            ) : delivered ? null : can('work.assign') ? (
              <button
                type="button"
                onClick={() => setDialog('assign')}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg ring-1 ring-inset ring-warn-line bg-warn-soft px-2 font-semibold text-warn-ink focus-visible:outline-2 focus-visible:outline-focus"
              >
                <TriangleAlert aria-hidden="true" size={14} />
                {t('work.assign')}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-warn">
                <TriangleAlert aria-hidden="true" size={14} />
                {t('item.noWorker')}
              </span>
            )}
          </div>
        )}

        {item.measurements && !canSee && <p className="text-sm text-muted">{t('print.measurementsHidden')}</p>}

        {hasDetails && (
          <details className="text-sm">
            <summary className="flex min-h-9 cursor-pointer items-center font-semibold text-muted">{t('item.details')}</summary>
            <div className="flex flex-col gap-2">
              {item.measurements && canSee && template && <MeasurementTable template={template} values={item.measurements.values} />}
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
            <div className="flex flex-col gap-1">
              {next.stage.group === 'delivered' ? (
                <button type="button" data-tour="hand-over" onClick={() => setDialog('handOver')} className={`${buttonClasses('secondary')} w-full border-brand text-brand-strong`}>
                  {t('item.handOver')}
                </button>
              ) : (
                <MoveOn
                  order={order}
                  item={item}
                  stageKey={next.stage.key}
                  label={t('item.moveTo', { stage: label(next.stage.label) })}
                  render={(props) => (
                    <button type="button" disabled={props.disabled} onClick={props.onClick} className={`${buttonClasses('secondary')} w-full border-brand text-brand-strong`}>
                      {props.children}
                    </button>
                  )}
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
    </>
  );
}
