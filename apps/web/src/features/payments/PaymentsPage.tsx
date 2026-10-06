import { balanceDue, effectSign, netPaid, orderTotal, outstandingBalances, type Order } from '@darzikhata/domain';
import { HandCoins, Search, Undo2, Wallet, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { PaidBar } from '../../ui/PaidBar';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useToday } from '../common/hooks';
import { matchesText, orderRow } from '../orders/orderList';
import { useShell } from '../../shell/ShellPreference';
import { CustomerMoneyCard } from './CustomerMoneyCard';
import { MobilePayments } from './MobilePayments';

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const head = 'sticky top-0 z-10 whitespace-nowrap border-b border-line bg-panel px-3 py-2 text-start text-sm font-semibold text-muted';

type View = 'due' | 'credit' | 'today';

const TONES = {
  warn: { on: 'bg-warn-soft ring-2 ring-warn-line', icon: 'bg-warn-soft text-warn' },
  brand: { on: 'bg-brand-soft ring-2 ring-brand', icon: 'bg-brand-soft text-brand-strong' },
  ok: { on: 'bg-ok-soft ring-2 ring-ok', icon: 'bg-ok-soft text-ok' },
};

/** A pressable tile with an amount and how many orders or entries it covers. */
function Tile({ icon: Icon, label, amount, sub, tone, on, onClick }: { icon: LucideIcon; label: string; amount: string; sub: string; tone: keyof typeof TONES; on: boolean; onClick(): void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-start ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
        on ? TONES[tone].on : 'bg-surface/60 ring-1 ring-line hover:bg-surface'
      }`}
    >
      <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-lg ${TONES[tone].icon}`}>
        <Icon size={18} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs text-muted">{label}</span>
        <span className="font-display text-xl font-bold leading-tight">{amount}</span>
        <span className="truncate text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
}

/** Who still owes the shop and whom the shop owes; on a desktop, a row opens the customer's money beside the list. */
export function PaymentsPage() {
  const { t, money, number, date } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const [text, setText] = useState('');
  const [view, setView] = useState<View>('due');
  const [params, setParams] = useSearchParams();
  const { kind } = useShell();

  const { due, credit, todays } = useMemo(() => {
    const orders = Object.values(state.orders).filter((order: Order) => matchesText(orderRow(order, state, today), text));
    return {
      due: outstandingBalances(orders),
      credit: orders
        .map((order) => ({ order, credit: -balanceDue(order) }))
        .filter((r) => r.credit > 0)
        .sort((a, b) => b.credit - a.credit || a.order.number.localeCompare(b.order.number)),
      todays: orders
        .flatMap((order) => order.payments.map((payment) => ({ order, payment, effect: effectSign(payment, order.payments) * payment.amount })))
        .filter((e) => e.payment.at.slice(0, 10) === today)
        .sort((a, b) => b.payment.at.localeCompare(a.payment.at)),
    };
  }, [state, text, today]);
  const customerName = (customerId: string) => state.customers[customerId]?.name ?? '';
  const total = due.reduce((sum, r) => sum + r.balance, 0);

  if (kind === 'mobile') {
    return (
      <section className="flex flex-col gap-4 pb-4">
        <h1 className="sr-only">{t('payments.title')}</h1>
        <MobilePayments
          query={text}
          onQueryChange={setText}
          total={total}
          rows={due.map(({ order, balance }) => {
            const orderTotal = orderRow(order, state, today).total;
            return { order, customer: customerName(order.customerId), total: orderTotal, paid: orderTotal - balance, balance };
          })}
          credit={credit.map((c) => ({ order: c.order, customer: customerName(c.order.customerId), amount: c.credit }))}
        />
      </section>
    );
  }

  const pickedId = params.get('order');
  const picked = pickedId ? state.orders[pickedId] : undefined;
  const pickedCustomer = picked?.customerId;
  const pickTo = (id: string) => ({ search: `?order=${encodeURIComponent(id)}` });
  const pick = (id: string | null) => setParams(id ? { order: id } : {}, { replace: true });
  const lastPaid = (o: Order) => o.payments.reduce<string | null>((latest, p) => (latest && latest > p.at ? latest : p.at), null);
  const daysSince = (day: string) => Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000);
  const creditTotal = credit.reduce((sum, r) => sum + r.credit, 0);
  const todayTotal = todays.reduce((sum, e) => sum + e.effect, 0);

  /** One row per order: the customer (a link that opens the card) and then the view's own cells. */
  const row = (o: Order, key: string, cells: ReactNode) => {
    const on = o.id === pickedId;
    return (
      <tr
        key={key}
        aria-selected={on}
        onClick={() => pick(o.id)}
        className={`cursor-pointer border-b border-line ${on ? 'bg-brand-soft' : o.customerId === pickedCustomer ? 'bg-brand-soft/40 hover:bg-surface' : 'hover:bg-surface'}`}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2.5">
            <Avatar id={o.customerId} name={customerName(o.customerId)} size="sm" />
            <div className="flex min-w-0 flex-col">
              <Link
                to={pickTo(o.id)}
                replace
                aria-current={on ? 'true' : undefined}
                onClick={(event) => event.stopPropagation()}
                className="truncate font-semibold text-ink focus-visible:outline-2 focus-visible:outline-focus"
              >
                {customerName(o.customerId) || o.number}
              </Link>
              <span className="text-sm text-muted">{o.number}</span>
            </div>
          </div>
        </td>
        {cells}
      </tr>
    );
  };

  const empty = view === 'due' ? due.length === 0 : view === 'credit' ? credit.length === 0 : todays.length === 0;

  return (
    // The window less the shell header (3.5rem) and the page padding (2 × 1.5rem).
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4">
      <section aria-labelledby="payments-title" className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="payments-title" className="font-display text-xl font-bold">
              {t('payments.title')}
            </h1>
            <label className="ms-auto flex min-h-10 w-80 max-w-full items-center gap-2 rounded-lg border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus">
              <Search aria-hidden="true" size={16} className="text-muted" />
              <input
                type="search"
                aria-label={t('orders.search')}
                placeholder={t('orders.search')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
          </div>
          <div role="group" aria-label={t('payments.views')} className="grid grid-cols-3 gap-2">
            <Tile icon={Wallet} tone="warn" label={t('payments.due')} amount={money(total)} sub={t('payments.orderCount', { n: number(due.length) })} on={view === 'due'} onClick={() => setView('due')} />
            <Tile icon={Undo2} tone="brand" label={t('payments.credit')} amount={money(creditTotal)} sub={t('payments.orderCount', { n: number(credit.length) })} on={view === 'credit'} onClick={() => setView('credit')} />
            <Tile icon={HandCoins} tone="ok" label={t('payments.today')} amount={money(todayTotal)} sub={t('payments.entryCount', { n: number(todays.length) })} on={view === 'today'} onClick={() => setView('today')} />
          </div>
        </div>
        {/* relative: keeps absolutely placed screen-reader text inside this scroll area, so the page itself never scrolls. */}
        <div className="relative min-h-0 flex-1 overflow-auto">
          {view === 'due' && (
            <table aria-label={t('payments.due')} className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={head}>{t('orders.col.customer')}</th>
                  <th scope="col" className={head}>{t('payments.paidSoFar')}</th>
                  {!picked && <th scope="col" className={head}>{t('payments.lastPaid')}</th>}
                  <th scope="col" className={`${head} text-end`}>{t('orders.col.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {due.map(({ order, balance }) => {
                  const paid = netPaid(order.payments);
                  const last = lastPaid(order);
                  return row(
                    order,
                    order.id,
                    <>
                      <td className="w-full px-3 py-2">
                        <div className="flex max-w-80 flex-col gap-1">
                          <PaidBar paid={paid} total={orderTotal(order)} />
                          <span className="text-xs text-muted">
                            {money(paid)} / {money(orderTotal(order))}
                          </span>
                        </div>
                      </td>
                      {!picked && (
                        <td className="whitespace-nowrap px-3 py-2 text-sm">
                          {last ? (
                            <>
                              {date(last.slice(0, 10))} <span className="text-muted">· {t('payments.daysAgo', { n: number(daysSince(last.slice(0, 10))) })}</span>
                            </>
                          ) : (
                            <span className="font-semibold text-warn-ink">{t('payments.nothingPaid')}</span>
                          )}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-2 text-end font-display text-lg font-bold text-warn">{money(balance)}</td>
                    </>,
                  );
                })}
              </tbody>
            </table>
          )}
          {view === 'credit' && (
            <table aria-label={t('payments.credit')} className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={head}>{t('orders.col.customer')}</th>
                  <th scope="col" className={`${head} text-end`}>{t('payments.credit')}</th>
                </tr>
              </thead>
              <tbody>{credit.map(({ order, credit: amount }) => row(order, order.id, <td className="whitespace-nowrap px-3 py-2 text-end font-display text-lg font-bold text-ok">{money(amount)}</td>))}</tbody>
            </table>
          )}
          {view === 'today' && (
            <table aria-label={t('payments.today')} className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={head}>{t('orders.col.customer')}</th>
                  <th scope="col" className={head}>{t('receipt.kind')}</th>
                  <th scope="col" className={head}>{t('receipt.method')}</th>
                  <th scope="col" className={`${head} text-end`}>{t('receipt.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {todays.map((e) =>
                  row(
                    e.order,
                    e.payment.id,
                    <>
                      <td className="px-3 py-2 text-sm">{t(`receipt.kind.${e.payment.kind}`)}</td>
                      <td className="px-3 py-2 text-sm">{t(`method.${e.payment.method}`)}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-end font-semibold ${e.effect < 0 ? 'text-warn' : 'text-ok'}`}>{money(e.effect)}</td>
                    </>,
                  ),
                )}
              </tbody>
            </table>
          )}
          {empty && <p className="p-4 text-muted">{t('payments.empty')}</p>}
        </div>
      </section>
      {picked && <CustomerMoneyCard orderId={picked.id} onPick={(id) => pick(id)} onClose={() => pick(null)} />}
    </div>
  );
}
