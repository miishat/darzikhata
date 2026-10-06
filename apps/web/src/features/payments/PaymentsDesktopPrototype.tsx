// PROTOTYPE (throwaway): desktop layouts for /app/payments, switched with ?variant=. A is the current page.
// B: one full-height card (tiles for money due, credit and today's takings, search, the table scrolling inside); a row opens the order's money beside it.
// C: by customer: who owes across all their orders on the left, their orders and every payment they made on the right.
// D: a cash book: today's takings by method across the top, the day-by-day payment log on the left, dues by age on the right.
import { balanceDue, effectSign, netPaid, orderTotal, type Order, type Payment, type PaymentMethod } from '@darzikhata/domain';
import { Banknote, CalendarClock, HandCoins, Search, Undo2, Wallet, X, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { PaidBar } from '../../ui/PaidBar';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useToday } from '../common/hooks';
import { matchesText, orderRow } from '../orders/orderList';
import { OrderMoney } from './OrderMoney';

export const PAYMENT_VARIANTS = { A: 'Current', B: 'Card + money panel', C: 'By customer', D: 'Cash book' };

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const PAGE = 'flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4';
const HEAD = 'sticky top-0 z-10 whitespace-nowrap border-b border-line bg-panel px-3 py-2 text-start text-sm font-semibold text-muted';
const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];

/** Language-aware text for strings the app has no key for yet (prototype only). */
function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

interface Entry {
  order: Order;
  payment: Payment;
  /** Signed effect on money held. */
  effect: number;
  day: string;
}

function useMoneyData(text: string) {
  const state = useScopedState();
  const today = useToday();
  return useMemo(() => {
    const orders = Object.values(state.orders).filter((o) => !text || matchesText(orderRow(o, state, today), text));
    const due = orders
      .map((order) => ({ order, balance: balanceDue(order) }))
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance || a.order.number.localeCompare(b.order.number));
    const credit = orders
      .map((order) => ({ order, credit: -balanceDue(order) }))
      .filter((r) => r.credit > 0)
      .sort((a, b) => b.credit - a.credit);
    const entries: Entry[] = orders
      .flatMap((order) => order.payments.map((payment) => ({ order, payment, effect: effectSign(payment, order.payments) * payment.amount, day: payment.at.slice(0, 10) })))
      .sort((a, b) => b.payment.at.localeCompare(a.payment.at));
    const todayEntries = entries.filter((e) => e.day === today);
    return {
      orders,
      due,
      credit,
      entries,
      dueTotal: due.reduce((s, r) => s + r.balance, 0),
      creditTotal: credit.reduce((s, r) => s + r.credit, 0),
      todayTotal: todayEntries.reduce((s, e) => s + e.effect, 0),
      todayEntries,
    };
  }, [state, text, today]);
}

function useCustomerName() {
  const state = useScopedState();
  return (id: string) => state.customers[id]?.name ?? '';
}

/** The order picked with ?order=, kept with the rest of the address. */
function usePicked(): [string | null, (id: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = (id: string | null) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (id) p.set('order', id);
        else p.delete('order');
        return p;
      },
      { replace: true },
    );
  return [params.get('order'), set];
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function Tile({ icon: Icon, label, value, sub, tone, on, onClick }: { icon: LucideIcon; label: string; value: string; sub?: string; tone: 'brand' | 'warn' | 'ok'; on?: boolean; onClick?: () => void }) {
  const ring = on ? (tone === 'warn' ? 'bg-warn-soft ring-2 ring-warn-line' : tone === 'ok' ? 'bg-ok-soft ring-2 ring-ok' : 'bg-brand-soft ring-2 ring-brand') : 'bg-surface/60 ring-1 ring-line';
  const chip = tone === 'warn' ? 'bg-warn-soft text-warn' : tone === 'ok' ? 'bg-ok-soft text-ok' : 'bg-brand-soft text-brand-strong';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, 'aria-pressed': on, onClick } : {})}
      className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-start ring-inset ${ring} ${onClick ? 'hover:bg-surface' : ''}`}
    >
      <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-lg ${chip}`}>
        <Icon size={18} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs text-muted">{label}</span>
        <span className="font-display text-xl font-bold leading-tight">{value}</span>
        {sub && <span className="truncate text-xs text-muted">{sub}</span>}
      </span>
    </Tag>
  );
}

function SearchBox({ value, onChange, className = '' }: { value: string; onChange(v: string): void; className?: string }) {
  const { t } = useI18n();
  return (
    <label className={`flex min-h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus ${className}`}>
      <Search aria-hidden="true" size={16} className="text-muted" />
      <input type="search" aria-label={t('orders.search')} placeholder={t('orders.search')} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
    </label>
  );
}

/** The order's money, as on the order page, in a side card. */
function MoneySide({ id, onClose }: { id: string; onClose(): void }) {
  const { t } = useI18n();
  const state = useScopedState();
  const name = useCustomerName();
  const order = state.orders[id];
  if (!order) return null;
  return (
    <aside aria-label={t('payments.section')} className={`${CARD} w-[min(520px,42%)] shrink-0`}>
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Avatar id={order.customerId} name={name(order.customerId)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold">{name(order.customerId)}</p>
          <Link to={`/app/orders/${order.id}`} className="text-sm text-brand-strong underline">
            {order.number}
          </Link>
        </div>
        <button type="button" aria-label={t('common.close')} onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-surface">
          <X size={18} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto p-4 [&>section]:border-0 [&>section]:p-0">
        <OrderMoney order={order} />
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ B ------------------------------------------------------------------ */

export function VariantB() {
  const { t, money, number, date } = useI18n();
  const L = useL();
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'due' | 'credit' | 'today'>('due');
  const [picked, pick] = usePicked();
  const data = useMoneyData(text);
  const name = useCustomerName();
  const today = useToday();
  const lastPaid = (o: Order) => o.payments.reduce<string | null>((m, p) => (m && m > p.at ? m : p.at), null);
  const row = (o: Order, cells: ReactNode) => (
    <tr key={o.id} aria-selected={picked === o.id} onClick={() => pick(o.id)} className={`cursor-pointer border-b border-line ${picked === o.id ? 'bg-brand-soft' : 'hover:bg-surface'}`}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar id={o.customerId} name={name(o.customerId)} size="sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{name(o.customerId)}</span>
            <span className="text-sm text-muted">{o.number}</span>
          </div>
        </div>
      </td>
      {cells}
    </tr>
  );
  return (
    <div className={PAGE}>
      <div className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-xl font-bold">{t('payments.title')}</h1>
            <SearchBox value={text} onChange={setText} className="ms-auto w-80" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Tile icon={Wallet} tone="warn" label={t('payments.due')} value={money(data.dueTotal)} sub={L(`${number(data.due.length)}টি অর্ডার`, `${number(data.due.length)} orders`)} on={tab === 'due'} onClick={() => setTab('due')} />
            <Tile icon={Undo2} tone="brand" label={t('payments.credit')} value={money(data.creditTotal)} sub={L(`${number(data.credit.length)}টি অর্ডার`, `${number(data.credit.length)} orders`)} on={tab === 'credit'} onClick={() => setTab('credit')} />
            <Tile icon={HandCoins} tone="ok" label={L('আজ জমা', 'Taken today')} value={money(data.todayTotal)} sub={L(`${number(data.todayEntries.length)}টি লেনদেন`, `${number(data.todayEntries.length)} entries`)} on={tab === 'today'} onClick={() => setTab('today')} />
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse">
            {tab === 'due' && (
              <>
                <thead>
                  <tr>
                    <th scope="col" className={HEAD}>{t('orders.col.customer')}</th>
                    <th scope="col" className={HEAD}>{L('জমা হয়েছে', 'Paid so far')}</th>
                    {!picked && <th scope="col" className={HEAD}>{L('শেষ জমা', 'Last paid')}</th>}
                    <th scope="col" className={`${HEAD} text-end`}>{t('orders.col.balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.due.map(({ order, balance }) => {
                    const total = orderTotal(order);
                    const last = lastPaid(order);
                    return row(
                      order,
                      <>
                        <td className="w-full px-3 py-2">
                          <div className="flex max-w-80 flex-col gap-1">
                            <PaidBar paid={netPaid(order.payments)} total={total} />
                            <span className="text-xs text-muted">
                              {money(netPaid(order.payments))} / {money(total)}
                            </span>
                          </div>
                        </td>
                        {!picked && (
                          <td className="whitespace-nowrap px-3 py-2 text-sm">
                            {last ? (
                              <>
                                {date(last.slice(0, 10))} <span className="text-muted">· {L(`${number(daysBetween(last.slice(0, 10), today))} দিন আগে`, `${number(daysBetween(last.slice(0, 10), today))} days ago`)}</span>
                              </>
                            ) : (
                              <span className="font-semibold text-warn-ink">{L('কিছুই জমা হয়নি', 'Nothing paid')}</span>
                            )}
                          </td>
                        )}
                        <td className="whitespace-nowrap px-3 py-2 text-end font-display text-lg font-bold text-warn">{money(balance)}</td>
                      </>,
                    );
                  })}
                </tbody>
              </>
            )}
            {tab === 'credit' && (
              <>
                <thead>
                  <tr>
                    <th scope="col" className={HEAD}>{t('orders.col.customer')}</th>
                    <th scope="col" className={`${HEAD} text-end`}>{t('payments.credit')}</th>
                  </tr>
                </thead>
                <tbody>{data.credit.map(({ order, credit }) => row(order, <td className="whitespace-nowrap px-3 py-2 text-end font-display text-lg font-bold text-ok">{money(credit)}</td>))}</tbody>
              </>
            )}
            {tab === 'today' && (
              <>
                <thead>
                  <tr>
                    <th scope="col" className={HEAD}>{t('orders.col.customer')}</th>
                    <th scope="col" className={HEAD}>{t('receipt.kind')}</th>
                    <th scope="col" className={HEAD}>{t('receipt.method')}</th>
                    <th scope="col" className={`${HEAD} text-end`}>{t('receipt.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todayEntries.map((e) =>
                    row(
                      e.order,
                      <>
                        <td className="px-3 py-2 text-sm">{t(`receipt.kind.${e.payment.kind}`)}</td>
                        <td className="px-3 py-2 text-sm">{t(`method.${e.payment.method}`)}</td>
                        <td className={`whitespace-nowrap px-3 py-2 text-end font-semibold ${e.effect < 0 ? 'text-warn' : 'text-ok'}`}>{money(e.effect)}</td>
                      </>,
                    ),
                  )}
                </tbody>
              </>
            )}
          </table>
          {((tab === 'due' && data.due.length === 0) || (tab === 'credit' && data.credit.length === 0) || (tab === 'today' && data.todayEntries.length === 0)) && (
            <p className="p-4 text-muted">{L('এখানে কিছু নেই', 'Nothing here')}</p>
          )}
        </div>
        <div className="border-t border-line px-4 py-2 text-sm text-muted">{L('একটা সারিতে ক্লিক করলে পাশে সেই অর্ডারের টাকার হিসাব আর "টাকা নিন" আসে', 'Click a row to see that order’s money beside the list, with Take payment')}</div>
      </div>
      {picked && <MoneySide id={picked} onClose={() => pick(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ C ------------------------------------------------------------------ */

export function VariantC() {
  const { t, money, number, date } = useI18n();
  const L = useL();
  const [text, setText] = useState('');
  const [picked, pick] = usePicked();
  const data = useMoneyData(text);
  const name = useCustomerName();
  const state = useScopedState();
  const [params, setParams] = useSearchParams();
  const people = useMemo(() => {
    const map = new Map<string, { id: string; owed: number; orders: Order[] }>();
    for (const { order, balance } of data.due) {
      const p = map.get(order.customerId) ?? { id: order.customerId, owed: 0, orders: [] };
      p.owed += balance;
      p.orders.push(order);
      map.set(order.customerId, p);
    }
    return [...map.values()].sort((a, b) => b.owed - a.owed);
  }, [data.due]);
  const customerId = params.get('customer') ?? people[0]?.id ?? null;
  const setCustomer = (id: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('customer', id);
        p.delete('order');
        return p;
      },
      { replace: true },
    );
  const theirOrders = Object.values(state.orders)
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => balanceDue(b) - balanceDue(a) || b.createdAt.localeCompare(a.createdAt));
  const theirPayments = theirOrders
    .flatMap((order) => order.payments.map((payment) => ({ order, payment, effect: effectSign(payment, order.payments) * payment.amount })))
    .sort((a, b) => b.payment.at.localeCompare(a.payment.at));
  const owed = theirOrders.reduce((s, o) => s + Math.max(0, balanceDue(o)), 0);
  const max = Math.max(1, ...people.map((p) => p.owed));

  return (
    <div className={PAGE}>
      <aside aria-label={t('payments.due')} className={`${CARD} w-80 shrink-0`}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <h1 className="font-display text-xl font-bold">{t('payments.title')}</h1>
          <p className="text-sm text-muted">
            {t('payments.dueTotal')} <span className="font-display text-lg font-bold text-warn">{money(data.dueTotal)}</span> · {L(`${number(people.length)} জন`, `${number(people.length)} people`)}
          </p>
          <SearchBox value={text} onChange={setText} />
        </div>
        <ul className="relative m-0 min-h-0 flex-1 list-none overflow-y-auto p-2">
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={customerId === p.id}
                onClick={() => setCustomer(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start ${customerId === p.id ? 'bg-brand-soft ring-2 ring-inset ring-brand' : 'hover:bg-surface'}`}
              >
                <Avatar id={p.id} name={name(p.id)} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate font-semibold">{name(p.id)}</span>
                    <span className="font-display font-bold text-warn">{money(p.owed)}</span>
                  </span>
                  <span aria-hidden="true" className="h-1.5 rounded-full bg-warn" style={{ width: `${(p.owed / max) * 100}%`, minWidth: '0.5rem' }} />
                  <span className="text-xs text-muted">{L(`${number(p.orders.length)}টি অর্ডারে বাকি`, `${number(p.orders.length)} orders owing`)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {customerId && (
        <section aria-label={name(customerId)} className={`${CARD} min-w-0 flex-1`}>
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar id={customerId} name={name(customerId)} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-2xl font-bold">{name(customerId)}</h2>
              <Link to={`/app/customers/${customerId}`} className="text-sm text-brand-strong underline">
                {L('প্রোফাইল দেখুন', 'Open profile')}
              </Link>
            </div>
            <div className="text-end">
              <p className="text-xs text-muted">{L('মোট বাকি', 'Owes in all')}</p>
              <p className="font-display text-2xl font-bold text-warn">{money(owed)}</p>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_minmax(0,22rem)]">
            <div className="relative min-h-0 overflow-auto p-4">
              <h3 className="mb-2 text-sm font-semibold text-muted">{L('অর্ডার', 'Orders')}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {theirOrders.map((o) => {
                  const bal = balanceDue(o);
                  const open = picked === o.id;
                  return (
                    <li key={o.id} className={`rounded-xl border ${open ? 'border-brand' : 'border-line'}`}>
                      <button type="button" aria-expanded={open} onClick={() => pick(open ? null : o.id)} className="flex w-full items-center gap-4 p-3 text-start">
                        <span className="w-20 font-semibold">{o.number}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <PaidBar paid={netPaid(o.payments)} total={orderTotal(o)} />
                          <span className="text-xs text-muted">
                            {money(netPaid(o.payments))} / {money(orderTotal(o))}
                          </span>
                        </span>
                        <span className={`w-28 text-end font-display text-lg font-bold ${bal > 0 ? 'text-warn' : 'text-ok'}`}>{bal > 0 ? money(bal) : bal < 0 ? `${t('money.creditDue')} ${money(-bal)}` : L('পরিশোধিত', 'Paid')}</span>
                      </button>
                      {open && (
                        <div className="border-t border-line p-3 [&>section]:border-0 [&>section]:p-0">
                          <OrderMoney order={o} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="relative min-h-0 overflow-auto border-s border-line bg-surface/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-muted">{L('সব জমা ও ফেরত', 'Every payment and refund')}</h3>
              <ol className="m-0 flex list-none flex-col gap-0 p-0">
                {theirPayments.map((e) => (
                  <li key={e.payment.id} className="relative flex gap-3 border-s-2 border-line ps-4 pb-4">
                    <span aria-hidden="true" className={`absolute -start-[7px] top-1 size-3 rounded-full ${e.effect < 0 ? 'bg-warn' : 'bg-ok'}`} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`font-semibold ${e.effect < 0 ? 'text-warn' : 'text-ok'}`}>{money(e.effect)}</span>
                      <span className="text-xs text-muted">
                        {date(e.payment.at.slice(0, 10))} · {t(`receipt.kind.${e.payment.kind}`)} · {t(`method.${e.payment.method}`)} · {e.order.number}
                      </span>
                    </span>
                  </li>
                ))}
                {theirPayments.length === 0 && <li className="text-sm text-muted">{L('এখনো কিছু জমা হয়নি', 'Nothing paid yet')}</li>}
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ D ------------------------------------------------------------------ */

export function VariantD() {
  const { t, money, number, date } = useI18n();
  const L = useL();
  const [text, setText] = useState('');
  const [picked, pick] = usePicked();
  const data = useMoneyData(text);
  const name = useCustomerName();
  const today = useToday();
  const weekAgo = new Date(Date.parse(today) - 6 * 86_400_000).toISOString().slice(0, 10);
  const week = data.entries.filter((e) => e.day >= weekAgo).reduce((s, e) => s + e.effect, 0);
  const byMethod = METHODS.map((m) => ({ m, sum: data.todayEntries.filter((e) => e.payment.method === m).reduce((s, e) => s + e.effect, 0) }));
  const days = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of data.entries) map.set(e.day, [...(map.get(e.day) ?? []), e]);
    return [...map.entries()];
  }, [data.entries]);
  const buckets = [
    { key: 'new', label: L('৭ দিনের মধ্যে', 'Within 7 days'), test: (d: number) => d <= 7 },
    { key: 'month', label: L('৮ থেকে ৩০ দিন', '8 to 30 days'), test: (d: number) => d > 7 && d <= 30 },
    { key: 'old', label: L('৩০ দিনের বেশি', 'Over 30 days'), test: (d: number) => d > 30 },
  ].map((b) => {
    const rows = data.due.filter((r) => b.test(daysBetween(r.order.createdAt.slice(0, 10), today)));
    return { ...b, rows, sum: rows.reduce((s, r) => s + r.balance, 0) };
  });

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">{t('payments.title')}</h1>
        <SearchBox value={text} onChange={setText} className="ms-auto w-80" />
      </div>
      <div className="grid shrink-0 grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-2">
        <Tile icon={HandCoins} tone="ok" label={L('আজ জমা', 'Taken today')} value={money(data.todayTotal)} sub={L(`${number(data.todayEntries.length)}টি লেনদেন`, `${number(data.todayEntries.length)} entries`)} />
        <Tile icon={CalendarClock} tone="brand" label={L('গত ৭ দিন', 'Last 7 days')} value={money(week)} />
        <Tile icon={Wallet} tone="warn" label={t('payments.dueTotal')} value={money(data.dueTotal)} sub={L(`${number(data.due.length)}টি অর্ডার`, `${number(data.due.length)} orders`)} />
        <Tile icon={Undo2} tone="brand" label={t('payments.credit')} value={money(data.creditTotal)} sub={L(`${number(data.credit.length)}টি অর্ডার`, `${number(data.credit.length)} orders`)} />
        <div className="flex items-center gap-3 rounded-xl bg-surface/60 px-3 py-2 ring-1 ring-inset ring-line">
          <Banknote aria-hidden="true" size={18} className="text-muted" />
          <dl className="m-0 grid grid-cols-4 gap-x-4">
            {byMethod.map(({ m, sum }) => (
              <div key={m} className="flex flex-col">
                <dt className="text-xs text-muted">{t(`method.${m}`)}</dt>
                <dd className="m-0 whitespace-nowrap font-semibold">{money(sum)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <section aria-label={L('জমার খাতা', 'Cash book')} className={`${CARD} min-w-0 flex-1`}>
          <h2 className="border-b border-line px-4 py-2.5 font-semibold">{L('জমার খাতা', 'Cash book')}</h2>
          <div className="relative min-h-0 flex-1 overflow-auto">
            {days.map(([day, list]) => (
              <section key={day} aria-label={date(day)}>
                <h3 className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface px-4 py-1.5 text-sm font-semibold">
                  {day === today ? L('আজ', 'Today') : date(day)}
                  <span className="ms-auto font-display">{money(list.reduce((s, e) => s + e.effect, 0))}</span>
                </h3>
                <ul className="m-0 list-none p-0">
                  {list.map((e) => (
                    <li key={e.payment.id}>
                      <button
                        type="button"
                        onClick={() => pick(e.order.id)}
                        className={`flex w-full items-center gap-3 border-b border-line px-4 py-2 text-start ${picked === e.order.id ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                      >
                        <Avatar id={e.order.customerId} name={name(e.order.customerId)} size="sm" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-semibold">{name(e.order.customerId)}</span>
                          <span className="text-xs text-muted">
                            {e.order.number} · {t(`receipt.kind.${e.payment.kind}`)}
                            {e.payment.reference && ` · ${e.payment.reference}`}
                          </span>
                        </span>
                        <span className="rounded-full bg-surface px-2 text-xs">{t(`method.${e.payment.method}`)}</span>
                        <span className={`w-28 text-end font-semibold ${e.effect < 0 ? 'text-warn' : 'text-ok'}`}>{money(e.effect)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
        {picked ? (
          <MoneySide id={picked} onClose={() => pick(null)} />
        ) : (
          <section aria-label={t('payments.due')} className={`${CARD} w-[min(460px,40%)] shrink-0`}>
            <h2 className="border-b border-line px-4 py-2.5 font-semibold">{L('কতদিনের বাকি', 'Dues by age')}</h2>
            <div className="relative min-h-0 flex-1 overflow-auto">
              {buckets.map((b) => (
                <section key={b.key} aria-label={b.label}>
                  <h3 className={`sticky top-0 z-10 flex items-center gap-2 border-b border-line px-4 py-1.5 text-sm font-semibold ${b.key === 'old' ? 'bg-warn-soft text-warn-ink' : 'bg-surface'}`}>
                    {b.label}
                    <span className="text-xs font-normal text-muted">{number(b.rows.length)}</span>
                    <span className="ms-auto font-display">{money(b.sum)}</span>
                  </h3>
                  <ul className="m-0 list-none p-0">
                    {b.rows.map(({ order, balance }) => (
                      <li key={order.id}>
                        <button type="button" onClick={() => pick(order.id)} className="flex w-full items-center gap-3 border-b border-line px-4 py-2 text-start hover:bg-surface">
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-semibold">{name(order.customerId)}</span>
                            <span className="text-xs text-muted">
                              {order.number} · {L(`${number(daysBetween(order.createdAt.slice(0, 10), today))} দিন আগের অর্ডার`, `ordered ${number(daysBetween(order.createdAt.slice(0, 10), today))} days ago`)}
                            </span>
                          </span>
                          <span className="font-display font-bold text-warn">{money(balance)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
