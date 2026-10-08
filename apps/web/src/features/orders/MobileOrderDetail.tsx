import { isOrderClosed, itemSummaryGroup, moneySummary, orderProgress, type Order } from '@darzikhata/domain';
import { ArrowLeft, EllipsisVertical, FileText, MessageCircle, Phone, Printer, Repeat, Share2, Tag } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionSheet, ActionSheetItem } from '../../ui/ActionSheet';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { IconButton } from '../../ui/IconButton';
import { PAYMENT_DOCK_SPACE, PaymentDock } from '../../ui/PaymentDock';
import { useCan } from '../common/hooks';
import { itemTitle, progressText } from '../common/orderText';
import { StatusLinkSection } from '../links/StatusLinkSection';
import { MoneyCard, useMoneyDialogs } from '../payments/OrderMoney';
import { MobileItemCard } from './MobileItemCard';
import { wearerGroups } from './wearers';
import { PrototypeSwitcher } from '../../ui/PrototypeSwitcher';
import { MEASURE_SHEET_VARIANTS } from '../customers/MeasureSheetPrototype';

const ROUND = 'flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const GROUP_DOT = {
  unfinished: 'bg-tone-working-dot',
  ready: 'bg-tone-ready-dot',
  delivered: 'bg-tone-done-dot',
  cancelled: 'bg-tone-cancelled-dot',
};

/** The phone order screen: customer, money, garments, and a bottom bar for printing and taking payment. */
export function MobileOrderDetail({ order }: { order: Order }) {
  const { t, language, date, money: formatMoney } = useI18n();
  const can = useCan();
  const { state, config } = useSnapshot();
  const { search } = useLocation();
  const money = useMoneyDialogs(order);
  const closed = isOrderClosed(order);
  const [sharing, setSharing] = useState(false);

  const customer = state.customers[order.customerId];
  const takenBy = config?.staff.find((s) => s.id === order.createdBy)?.name;
  const groups = wearerGroups(order);
  const taken = date(order.createdAt.slice(0, 10));

  const showTake = can('money.view') && can('payments.record') && moneySummary(order).balance > 0;
  // Receipt printing is also in the more menu, so a fully paid order needs no bar.
  const hasBar = showTake;

  return (
    <div className={`flex flex-col gap-3 ${hasBar ? PAYMENT_DOCK_SPACE : ''}`}>
      <PrototypeSwitcher top variants={MEASURE_SHEET_VARIANTS} />
      <header className="-mx-2 flex items-center gap-1">
        <Link to={{ pathname: '/app/orders', search }} aria-label={t('orders.back')} className={`${ROUND} text-ink hover:bg-surface`}>
          <ArrowLeft aria-hidden="true" size={24} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold tracking-wide">{order.number}</h1>
          <p className="truncate text-xs text-muted">
            {takenBy ? t('order.takenBy', { date: taken, name: takenBy }) : t('order.takenOn', { date: taken })}
          </p>
        </div>
        {can('links.manage') && <IconButton label={t('order.share')} icon={Share2} onClick={() => setSharing(true)} />}
        <ActionSheet label={t('order.more')} icon={EllipsisVertical} title={t('nav.more')}>
          {() => (
            <>
              {can('money.view') && <ActionSheetItem to={`/print/receipt/${order.id}`} icon={Printer} tone="brand">{t('order.printReceipt')}</ActionSheetItem>}
              <ActionSheetItem to={`/print/job/${order.id}`} icon={FileText} tone="ok">{t('order.jobSlip')}</ActionSheetItem>
              <ActionSheetItem to={`/print/tags/${order.id}`} icon={Tag} tone="warn">{t('order.tags')}</ActionSheetItem>
              {can('orders.create') && (
                <ActionSheetItem to={`/app/orders/new?repeat=${order.id}`} icon={Repeat} tone="neutral" data-tour="order-again">
                  {t('order.orderAgain')}
                </ActionSheetItem>
              )}
            </>
          )}
        </ActionSheet>
      </header>

      {customer && (
        <section aria-label={t('order.customer')} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
          <Avatar id={customer.id} name={customer.name} />
          <Link to={`/app/customers/${customer.id}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
            <span className="truncate font-semibold">{customer.name}</span>
            {customer.phone && <span className="truncate text-sm text-muted">{customer.phone}</span>}
          </Link>
          {customer.phone && (
            <>
              <a href={`tel:${customer.phone}`} aria-label={t('order.call')} className={`${ROUND} bg-ok-soft text-ok`}>
                <Phone aria-hidden="true" size={20} />
              </a>
              <a href={`sms:${customer.phone}`} aria-label={t('order.message')} className={`${ROUND} bg-brand-soft text-brand-strong`}>
                <MessageCircle aria-hidden="true" size={20} />
              </a>
            </>
          )}
        </section>
      )}

      {can('money.view') && <MoneyCard order={order} open={money.open} />}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span
            data-tour="order-status"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-sm font-semibold ring-1 ring-line ring-inset"
          >
            <span aria-hidden="true" className={`size-[7px] rounded-full ${closed ? 'bg-tone-done-dot' : 'bg-tone-working-dot'}`} />
            {closed ? t('order.statusClosed') : t('order.statusOpen')}
          </span>
          <span className="text-sm text-muted">{progressText(orderProgress(order), language)}</span>
        </div>
        <div className="flex gap-1" role="img" aria-label={progressText(orderProgress(order), language)}>
          {order.items.map((item) => (
            <span key={item.id} className={`h-1.5 flex-1 rounded-full ${GROUP_DOT[itemSummaryGroup(item)]}`} />
          ))}
        </div>
      </div>

      {groups.length === 0 && order.items.map((item) => <MobileItemCard key={item.id} order={order} item={item} />)}
      {groups.map((group) => {
        const name = group.wearer ?? t('wearers.others');
        return (
          <section key={group.wearer ?? ''} aria-label={name} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold">{name}</h2>
              <p className="text-sm text-muted">{progressText(group.progress, language)}</p>
            </div>
            {group.items.map((item) => (
              <MobileItemCard key={item.id} order={order} item={item} />
            ))}
          </section>
        );
      })}

      {hasBar && <PaymentDock order={order} canPrint={can('money.view')} onTake={() => money.open({ kind: 'take' })} />}

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
    </div>
  );
}
