import { isOrderClosed, itemSummaryGroup, moneySummary, orderProgress, type Order, type OrderItem } from '@darzikhata/domain';
import { FileText, PackageCheck, Phone, Printer, Repeat, Share2, Tag, Wallet, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { rovingTabsKeyDown } from '../../ui/rovingTabs';
import { useCan } from '../common/hooks';
import { progressText } from '../common/orderText';
import { StatusLinkSection } from '../links/StatusLinkSection';
import { OrderMoney, useMoneyDialogs } from '../payments/OrderMoney';
import { PanelItem, useOrderByline, useOrderHandOver } from './OrderPanel';
import { wearerGroups } from './wearers';

type Section = 'garments' | 'money' | 'link';

const PANEL_ID = 'order-page-panel';
const tabId = (section: Section) => `${PANEL_ID}-tab-${section}`;

/** The order's papers: receipt, job slip and tags joined as icons, then Share Status Link and Order Again with their names. */
function OrderPapers({ order, onShare }: { order: Order; onShare(): void }) {
  const { t } = useI18n();
  const can = useCan();
  const icon = 'flex size-10 items-center justify-center text-ink hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus';
  const papers = [
    ...(can('money.view') ? [{ to: `/print/receipt/${order.id}`, Icon: Printer, label: t('order.printReceipt') }] : []),
    { to: `/print/job/${order.id}`, Icon: FileText, label: t('order.jobSlip') },
    { to: `/print/tags/${order.id}`, Icon: Tag, label: t('order.tags') },
  ];
  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label={t('print.papers')} className="flex divide-x divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {papers.map(({ to, Icon, label }) => (
          <Link key={to} to={to} aria-label={label} title={label} className={icon}>
            <Icon size={17} aria-hidden="true" />
          </Link>
        ))}
      </div>
      {can('links.manage') && (
        <Button variant="secondary" onClick={onShare}>
          <Share2 size={16} aria-hidden="true" />
          {t('order.share')}
        </Button>
      )}
      {can('orders.create') && (
        <Link to={`/app/orders/new?repeat=${order.id}`} data-tour="order-again" className={buttonClasses('secondary')}>
          <Repeat size={16} aria-hidden="true" />
          {t('order.orderAgain')}
        </Link>
      )}
    </div>
  );
}

/** The garments in a grid of blocks, under a heading per wearer when the order names who wears what. */
function OrderGarments({ order }: { order: Order }) {
  const { t, language } = useI18n();
  const groups = wearerGroups(order);
  const grid = (items: OrderItem[]) => (
    <div className="grid grid-cols-2 items-start gap-3 2xl:grid-cols-3">
      {items.map((item) => (
        <PanelItem key={item.id} order={order} item={item} />
      ))}
    </div>
  );
  if (groups.length === 0) return grid(order.items);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const name = group.wearer ?? t('wearers.others');
        return (
          <section key={group.wearer ?? ''} aria-label={name} className="flex flex-col gap-2">
            {/* Indented by a block's border and padding, so the heading lines up with the text inside the blocks. */}
            <div className="flex items-baseline gap-3 ps-[13px]">
              <h3 className="font-display text-lg font-bold">{name}</h3>
              <p className="text-sm text-muted">{progressText(group.progress, language)}</p>
            </div>
            {grid(group.items)}
          </section>
        );
      })}
    </div>
  );
}

/**
 * The desktop order page. The customer leads the header with the order number on the right, then a strip of key
 * numbers, then tabs for the garments, the money and the status link with the order's papers beside them. Only
 * the tab's content scrolls. A bar along the bottom holds Hand Over and Take Payment when either can be done.
 */
export function DesktopOrderPage({ order, onClose }: { order: Order; onClose?: () => void }) {
  const { t, language, money, date, number } = useI18n();
  const can = useCan();
  const { state } = useSnapshot();
  const byline = useOrderByline(order);
  const handOver = useOrderHandOver(order);
  const moneyDialogs = useMoneyDialogs(order);
  const [section, setSection] = useState<Section>('garments');

  const customer = state.customers[order.customerId];
  const progress = orderProgress(order);
  const live = order.items.filter((item) => !item.cancelled);
  const nextDelivery = live
    .filter((item) => item.deliveryDate && (itemSummaryGroup(item) === 'unfinished' || itemSummaryGroup(item) === 'ready'))
    .map((item) => item.deliveryDate!)
    .sort()[0];
  const summary = moneySummary(order);
  const credit = summary.creditDue > 0;
  const owed = {
    label: t(credit ? 'money.creditDue' : 'money.balance'),
    amount: credit ? summary.creditDue : summary.balance,
    tone: summary.balance > 0 ? 'text-warn' : 'text-ok',
  };
  const showMoney = can('money.view');
  const showTake = showMoney && can('payments.record') && summary.balance > 0;
  const closed = isOrderClosed(order);

  const sections: Array<{ key: Section; label: string }> = [
    { key: 'garments', label: `${t('receipt.garments')} · ${number(live.length)}` },
    ...(showMoney ? [{ key: 'money' as const, label: t('payments.section') }] : []),
    ...(can('links.manage') ? [{ key: 'link' as const, label: t('link.section') }] : []),
  ];
  const keys = sections.map((s) => s.key);

  const stat = (label: string, value: ReactNode, tone = '') => (
    <div className="flex min-w-0 flex-col gap-0.5 px-5 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`truncate font-display text-xl font-bold ${tone}`}>{value}</span>
    </div>
  );

  const orderBlock = (
    <div className={customer ? 'min-w-0 text-end' : 'min-w-0 flex-1'}>
      <div className={`flex items-center gap-3 ${customer ? 'justify-end' : ''}`}>
        {customer && <StatusPill closed={closed} />}
        <h1 className="font-display text-2xl font-bold tracking-wide">{order.number}</h1>
        {!customer && <StatusPill closed={closed} />}
      </div>
      <p className="truncate text-sm text-muted">{byline}</p>
    </div>
  );

  return (
    // The window less the shell header (3.5rem) and the page padding (2 × 1.5rem): the top stays put while the section scrolls.
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-4">
      <div className="shrink-0 overflow-hidden rounded-2xl border border-line bg-panel">
        <header className="flex items-center gap-4 p-5">
          {onClose && (
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
          {customer ? (
            <section aria-label={t('order.customer')} className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar id={customer.id} name={customer.name} size="lg" />
              <div className="min-w-0">
                <Link to={`/app/customers/${customer.id}`} className="block truncate font-display text-2xl font-bold hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                  {customer.name}
                </Link>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  {customer.phone && <span>{customer.phone}</span>}
                  {customer.phone && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Phone size={12} aria-hidden="true" />
                      {t('order.call')}
                    </a>
                  )}
                  <Link to={`/app/customers/${customer.id}`} className="text-xs font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus">
                    {t('order.viewProfile')}
                  </Link>
                </p>
              </div>
            </section>
          ) : null}
          {orderBlock}
        </header>
        <div className="grid auto-cols-fr grid-flow-col divide-x divide-line border-t border-line bg-surface/50">
          {stat(t('order.stat.ready'), `${number(progress.ready + progress.delivered)} / ${number(live.length)}`)}
          {stat(t('order.stat.nextDelivery'), nextDelivery ? date(nextDelivery) : '-')}
          {showMoney && stat(t('money.total'), money(summary.total))}
          {showMoney && stat(t('money.paid'), money(summary.paid), 'text-ok')}
          {showMoney && stat(owed.label, money(owed.amount), owed.tone)}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label={t('order.sections')}
          onKeyDown={rovingTabsKeyDown(keys, section, (next) => setSection(next as Section), (key) => tabId(key as Section))}
          className="flex rounded-xl bg-line/60 p-1"
        >
          {sections.map((s) => {
            const selected = s.key === section;
            return (
              <button
                key={s.key}
                id={tabId(s.key)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={PANEL_ID}
                tabIndex={selected ? 0 : -1}
                onClick={() => setSection(s.key)}
                className={`min-h-9 rounded-lg px-4 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
                  selected ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="ms-auto">
          <OrderPapers order={order} onShare={() => setSection('link')} />
        </div>
      </div>

      {/* relative: keeps screen-reader-only text inside this scrolling area. */}
      <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(section)} className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl">
        {section === 'garments' && <OrderGarments order={order} />}
        {section === 'money' && <OrderMoney order={order} />}
        {section === 'link' && (
          <div className="max-w-2xl">
            <StatusLinkSection order={order} />
          </div>
        )}
      </div>

      {(handOver.ready.length > 0 || showTake) && (
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-panel px-5 py-3">
          <p className="me-auto flex flex-wrap items-baseline gap-x-4 text-sm text-muted">
            {showMoney && (
              <span>
                {owed.label} <b className={`font-display text-lg ${owed.tone}`}>{money(owed.amount)}</b>
              </span>
            )}
            <span>{progressText(progress, language)}</span>
          </p>
          {handOver.ready.length > 0 && (
            <Button variant="secondary" onClick={handOver.start}>
              <PackageCheck size={16} aria-hidden="true" />
              {t('order.handOverBar')}
            </Button>
          )}
          {showTake && (
            <Button onClick={() => moneyDialogs.open({ kind: 'take' })}>
              <Wallet size={16} aria-hidden="true" />
              {t('payments.take')}
            </Button>
          )}
        </div>
      )}
      {handOver.element}
      {moneyDialogs.element}
    </div>
  );
}

function StatusPill({ closed }: { closed: boolean }) {
  const { t } = useI18n();
  return (
    <span data-tour="order-status" className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${closed ? 'bg-surface text-muted' : 'bg-brand-soft text-brand-strong'}`}>
      {t(closed ? 'order.statusClosed' : 'order.statusOpen')}
    </span>
  );
}
