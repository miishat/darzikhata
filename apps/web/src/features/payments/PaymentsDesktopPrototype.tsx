// PROTOTYPE (throwaway): desktop layouts for /app/payments, switched with ?variant=. A is the current page.
// Every other variant keeps the same list on the left and the same customer card (header, totals, docked actions); they differ only in how the picked order is shown:
// B: the orders as a row of tabs, the picked one solid, its details flat below.
// C: compact order rows with a check and an accent bar on the picked one, its details after the list.
// D: the picked order leads the card, the other orders wait below and swap in.
// E: a narrow rail of orders down the card's left, the picked one joined to the details like a folder tab.
import { balanceDue, effectSign, moneySummary, netPaid, orderTotal, type Order, type Payment, type PaymentMethod } from '@darzikhata/domain';
import { HandCoins, Pencil, Percent, Phone, Search, SlidersHorizontal, Undo2, Wallet, X, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { NumberField } from '../../ui/NumberField';
import { PaidBar } from '../../ui/PaidBar';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { useSave } from '../orders/itemDialogs';
import { matchesText, orderRow } from '../orders/orderList';
import { receiptModel, type ReceiptModel } from '../print/receipt';
import { CorrectionDialog, DiscountDialog, PriceAdjustmentDialog, RefundDialog, TakePaymentDialog } from './paymentDialogs';

export const PAYMENT_VARIANTS = { A: 'Current', B: 'Order tabs', C: 'Order list + check', D: 'Picked order first', E: 'Order rail' };

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const PAGE = 'flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4';
const HEAD = 'sticky top-0 z-10 whitespace-nowrap border-b border-line bg-panel px-3 py-2 text-start text-sm font-semibold text-muted';
const SIDE = `${CARD} w-[min(600px,46%)] shrink-0`;
const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];

/** Language-aware text for strings the app has no key for yet (prototype only). */
function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
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
    const todayEntries = orders
      .flatMap((order) => order.payments.map((payment) => ({ order, payment, effect: effectSign(payment, order.payments) * payment.amount })))
      .filter((e) => e.payment.at.slice(0, 10) === today)
      .sort((a, b) => b.payment.at.localeCompare(a.payment.at));
    return {
      due,
      credit,
      todayEntries,
      dueTotal: due.reduce((s, r) => s + r.balance, 0),
      creditTotal: credit.reduce((s, r) => s + r.credit, 0),
      todayTotal: todayEntries.reduce((s, e) => s + e.effect, 0),
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
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-start ring-inset hover:bg-surface ${ring}`}>
      <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-lg ${chip}`}>
        <Icon size={18} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs text-muted">{label}</span>
        <span className="font-display text-xl font-bold leading-tight">{value}</span>
        {sub && <span className="truncate text-xs text-muted">{sub}</span>}
      </span>
    </button>
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

/* ---------------------------------------------------------------- the list ---------------------------------------------------------------- */

/** The list every variant shares: tiles for money due, credit and today's takings, search, and the table scrolling inside the card. */
function DueList({ side }: { side: (id: string) => ReactNode }) {
  const { t, money, number, date } = useI18n();
  const L = useL();
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'due' | 'credit' | 'today'>('due');
  const [picked, pick] = usePicked();
  const data = useMoneyData(text);
  const name = useCustomerName();
  const today = useToday();
  const state = useScopedState();
  const pickedCustomer = picked ? state.orders[picked]?.customerId : undefined;
  const lastPaid = (o: Order) => o.payments.reduce<string | null>((m, p) => (m && m > p.at ? m : p.at), null);
  const row = (o: Order, cells: ReactNode) => (
    <tr
      key={o.id}
      aria-selected={picked === o.id}
      onClick={() => pick(o.id)}
      className={`cursor-pointer border-b border-line ${picked === o.id ? 'bg-brand-soft' : o.customerId === pickedCustomer ? 'bg-brand-soft/40 hover:bg-surface' : 'hover:bg-surface'}`}
    >
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
  const empty = (tab === 'due' && data.due.length === 0) || (tab === 'credit' && data.credit.length === 0) || (tab === 'today' && data.todayEntries.length === 0);
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
          {empty && <p className="p-4 text-muted">{L('এখানে কিছু নেই', 'Nothing here')}</p>}
        </div>
      </div>
      {picked && state.orders[picked] && side(picked)}
    </div>
  );
}

/* ------------------------------------------------------------ shared card parts ------------------------------------------------------------ */

type MoneyDialog = { kind: 'take' | 'refund' | 'discount' | 'adjust'; order: Order } | { kind: 'correct'; order: Order; payment: Payment } | null;

interface Entry {
  order: Order;
  payment: Payment;
  effect: number;
  by: string;
}

/** Everything the customer card needs about the picked order's customer. */
function useCustomerMoney(id: string) {
  const { language } = useI18n();
  const { config } = useSnapshot();
  const state = useScopedState();
  const picked = state.orders[id]!;
  const customer = state.customers[picked.customerId] ?? null;
  const orders = Object.values(state.orders)
    .filter((o) => o.customerId === picked.customerId)
    .sort((a, b) => balanceDue(b) - balanceDue(a) || b.createdAt.localeCompare(a.createdAt));
  const staff = (sid: string) => config?.staff.find((s) => s.id === sid)?.name ?? '';
  const models = new Map<string, ReceiptModel>(config ? orders.map((o) => [o.id, receiptModel(o, customer, config, language)]) : []);
  const timeline: Entry[] = orders
    .flatMap((order) => order.payments.map((payment) => ({ order, payment, effect: effectSign(payment, order.payments) * payment.amount, by: staff(payment.by) })))
    .sort((a, b) => b.payment.at.localeCompare(a.payment.at));
  const owed = orders.reduce((s, o) => s + Math.max(0, balanceDue(o)), 0);
  const credit = orders.reduce((s, o) => s + Math.max(0, -balanceDue(o)), 0);
  const paid = orders.reduce((s, o) => s + netPaid(o.payments), 0);
  const billed = orders.reduce((s, o) => s + orderTotal(o), 0);
  return { picked, customer, orders, models, timeline, owed, credit, paid, billed, staff };
}

function DialogHost({ dialog, close }: { dialog: MoneyDialog; close(): void }) {
  if (!dialog) return null;
  if (dialog.kind === 'take') return <TakePaymentDialog order={dialog.order} onClose={close} />;
  if (dialog.kind === 'refund') return <RefundDialog order={dialog.order} onClose={close} />;
  if (dialog.kind === 'discount') return <DiscountDialog order={dialog.order} onClose={close} />;
  if (dialog.kind === 'adjust') return <PriceAdjustmentDialog order={dialog.order} onClose={close} />;
  return dialog.kind === 'correct' ? <CorrectionDialog order={dialog.order} payment={dialog.payment} onClose={close} /> : null;
}

/** Which money actions this person may take on this order. */
function useActions(order: Order) {
  const { t } = useI18n();
  const can = useCan();
  const m = moneySummary(order);
  return [
    { kind: 'take' as const, icon: HandCoins, label: t('payments.take'), show: can('payments.record') && m.balance > 0 },
    { kind: 'refund' as const, icon: Undo2, label: t('payments.refund'), show: can('payments.refund') && netPaid(order.payments) > 0 },
    { kind: 'discount' as const, icon: Percent, label: t('payments.discount'), show: can('orders.edit') },
    { kind: 'adjust' as const, icon: SlidersHorizontal, label: t('payments.adjust'), show: can('orders.edit') },
  ].filter((a) => a.show);
}

function CardHeader({ customerId, phone, onClose, children }: { customerId: string; phone: string | null; onClose(): void; children?: ReactNode }) {
  const { t } = useI18n();
  const L = useL();
  const name = useCustomerName();
  return (
    <div className="flex items-start gap-3 border-b border-line p-4">
      <Avatar id={customerId} name={name(customerId)} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="truncate font-display text-xl font-bold">{name(customerId)}</h2>
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
          {phone && (
            <span className="inline-flex items-center gap-1">
              <Phone aria-hidden="true" size={13} />
              {phone}
            </span>
          )}
          <Link to={`/app/customers/${customerId}`} className="font-semibold text-brand-strong hover:underline">
            {L('প্রোফাইল', 'Profile')}
          </Link>
        </p>
      </div>
      {children}
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
        <X size={18} />
      </button>
    </div>
  );
}

/** The picked order's actions, docked at the bottom of the card: its balance and Take payment on top, the rest in one row below. */
function ActionBar({ order, open }: { order: Order; open(kind: 'take' | 'refund' | 'discount' | 'adjust'): void }) {
  const { t, money } = useI18n();
  const actions = useActions(order);
  const take = actions.find((a) => a.kind === 'take');
  const rest = actions.filter((a) => a.kind !== 'take');
  const m = moneySummary(order);
  return (
    <div className="flex flex-col gap-2 border-t border-line bg-surface/60 p-3">
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted">{order.number}</span>
          <span className={`font-display text-lg font-bold leading-tight ${m.creditDue > 0 ? 'text-ok' : 'text-warn'}`}>
            {m.creditDue > 0 ? t('money.creditDue') : t('money.balance')} {money(m.creditDue > 0 ? m.creditDue : m.balance)}
          </span>
        </span>
        {take && (
          <Button onClick={() => open('take')} className="min-w-40">
            <HandCoins aria-hidden="true" size={16} />
            {take.label}
          </Button>
        )}
      </div>
      {rest.length > 0 && (
        <div className="flex gap-2">
          {rest.map((a) => (
            <button
              key={a.kind}
              type="button"
              onClick={() => open(a.kind)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-panel px-2 text-sm font-semibold ring-1 ring-inset ring-line hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
            >
              <a.icon aria-hidden="true" size={15} className="text-muted" />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CorrectButton({ onClick }: { onClick(): void }) {
  const { t } = useI18n();
  const can = useCan();
  if (!can('payments.correct')) return null;
  return (
    <button type="button" aria-label={t('payments.correct')} title={t('payments.correct')} onClick={onClick} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
      <Pencil size={15} />
    </button>
  );
}

/** One line of money: a label, an optional note, and an amount on the right. */
function MoneyLine({ label, note, amount, strong, tone }: { label: string; note?: string | undefined; amount: string; strong?: boolean; tone?: 'warn' | 'ok' }) {
  return (
    <div className={`flex items-baseline gap-3 py-1 ${strong ? 'font-semibold' : ''}`}>
      <dt className="min-w-0 flex-1">
        {label}
        {note && <span className="ms-2 text-xs font-normal text-muted">{note}</span>}
      </dt>
      <dd className={`m-0 whitespace-nowrap ${strong ? 'font-display text-lg' : ''} ${tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : ''}`}>{amount}</dd>
    </div>
  );
}

function Breakdown({ model }: { model: ReceiptModel }) {
  const { t, money } = useI18n();
  return (
    <dl className="m-0 flex flex-col text-sm">
      <MoneyLine label={t('money.subtotal')} amount={money(model.subtotal)} />
      {model.discount && <MoneyLine label={t('money.discount')} note={model.discount.reason} amount={`− ${money(model.discount.amount)}`} />}
      {model.adjustments.map((a, i) => (
        <MoneyLine key={i} label={t('money.adjustments')} note={a.reason} amount={`${a.amount < 0 ? '− ' : '+ '}${money(Math.abs(a.amount))}`} />
      ))}
      <div className="my-1 border-t border-line" />
      <MoneyLine label={t('money.total')} amount={money(model.total)} strong />
      <MoneyLine label={t('money.paid')} amount={money(model.paid)} tone="ok" />
      {model.creditDue > 0 ? <MoneyLine label={t('money.creditDue')} amount={money(model.creditDue)} strong tone="ok" /> : <MoneyLine label={t('money.balance')} amount={money(model.balance)} strong tone="warn" />}
    </dl>
  );
}

function EntryLine({ e, showOrder, onCorrect }: { e: Entry; showOrder: boolean; onCorrect(): void }) {
  const { t, money, date } = useI18n();
  return (
    <li className="flex items-center gap-3 py-2">
      <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full ${e.effect < 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`}>
        {e.effect < 0 ? <Undo2 size={15} /> : <HandCoins size={15} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">
          {t(`receipt.kind.${e.payment.kind}`)} · {t(`method.${e.payment.method}`)}
          {e.payment.reference && <span className="font-normal text-muted"> · {e.payment.reference}</span>}
        </span>
        <span className="truncate text-xs text-muted">
          {date(e.payment.at.slice(0, 10))}
          {showOrder && ` · ${e.order.number}`}
          {e.by && ` · ${e.by}`}
          {e.payment.reason && ` · ${e.payment.reason}`}
        </span>
      </span>
      <span className={`whitespace-nowrap font-display font-bold ${e.effect < 0 ? 'text-warn' : 'text-ok'}`}>{money(e.effect)}</span>
      {e.payment.kind !== 'correction' ? <CorrectButton onClick={onCorrect} /> : <span className="size-8 shrink-0" />}
    </li>
  );
}

/* ------------------------------------------------------------- the B card frame ------------------------------------------------------------- */

type Customer = ReturnType<typeof useCustomerMoney>;
type OpenDialog = (dialog: MoneyDialog) => void;

/** B's frame: header, totals band, a scrolling body, and the picked order's actions docked at the bottom. */
function CustomerCard({ id, body }: { id: string; body: (c: Customer, open: OpenDialog) => ReactNode }) {
  const { t, money } = useI18n();
  const L = useL();
  const [, pick] = usePicked();
  const [dialog, setDialog] = useState<MoneyDialog>(null);
  const c = useCustomerMoney(id);
  return (
    <aside aria-label={c.customer?.name ?? ''} className={SIDE}>
      <CardHeader customerId={c.picked.customerId} phone={c.customer?.phone ?? null} onClose={() => pick(null)} />
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
        <div className="flex items-end gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted">{L('মোট বাকি', 'Owes in all')}</span>
            <span className="font-display text-3xl font-bold leading-none text-warn">{money(c.owed)}</span>
          </div>
          <div className="ms-auto flex gap-5 text-end text-sm">
            <span className="flex flex-col">
              <span className="text-xs text-muted">{L('মোট বিল', 'Billed')}</span>
              <span className="font-semibold">{money(c.billed)}</span>
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-muted">{L('মোট জমা', 'Paid')}</span>
              <span className="font-semibold text-ok">{money(c.paid)}</span>
            </span>
            {c.credit > 0 && (
              <span className="flex flex-col">
                <span className="text-xs text-muted">{t('payments.credit')}</span>
                <span className="font-semibold">{money(c.credit)}</span>
              </span>
            )}
          </div>
        </div>
        <PaidBar paid={c.paid} total={c.billed} />
      </div>
      {body(c, setDialog)}
      <ActionBar order={c.picked} open={(kind) => setDialog({ kind, order: c.picked })} />
      <DialogHost dialog={dialog} close={() => setDialog(null)} />
    </aside>
  );
}

/** The picked order laid flat: its garments, the price breakdown, and what was paid on it. */
function OrderDetail({ c, open, title = true, payments = true }: { c: Customer; open: OpenDialog; title?: boolean; payments?: boolean }) {
  const { money, date } = useI18n();
  const L = useL();
  const model = c.models.get(c.picked.id);
  const entries = c.timeline.filter((e) => e.order.id === c.picked.id);
  if (!model) return null;
  return (
    <div className="flex flex-col gap-3">
      {title && (
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-lg font-bold">{model.orderNumber}</h3>
          <span className="text-sm text-muted">{date(model.createdAt.slice(0, 10))}</span>
          <Link to={`/app/orders/${c.picked.id}`} className="ms-auto text-sm font-semibold text-brand-strong hover:underline">
            {L('অর্ডার খুলুন', 'Open order')}
          </Link>
        </div>
      )}
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-sm">
        {model.lines.map((l) => (
          <li key={l.itemId} className={`flex items-baseline gap-3 ${l.cancelled ? 'text-muted line-through' : ''}`}>
            <span className="min-w-0 flex-1 truncate">
              {l.garment}
              {l.wearer && <span className="text-xs text-muted"> · {l.wearer}</span>}
            </span>
            <span className="whitespace-nowrap text-muted">{money(l.price)}</span>
          </li>
        ))}
      </ul>
      <div className="rounded-xl bg-surface/60 px-3 py-2">
        <Breakdown model={model} />
      </div>
      {payments && <PickedPayments c={c} open={open} entries={entries} />}
    </div>
  );
}

/** What was paid on the picked order, with a correct button on each. */
function PickedPayments({ c, open, entries = c.timeline.filter((e) => e.order.id === c.picked.id) }: { c: Customer; open: OpenDialog; entries?: Entry[] }) {
  const L = useL();
  return (
    <div className="flex flex-col">
      <h4 className="text-xs font-semibold text-muted">
        {L('এই অর্ডারের জমা', 'Paid on this order')} · {c.picked.number}
      </h4>
      {entries.length === 0 ? (
        <p className="py-2 text-sm text-muted">{L('এখনো কিছু জমা হয়নি', 'Nothing paid yet')}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {entries.map((e) => (
            <EntryLine key={e.payment.id} e={e} showOrder={false} onCorrect={() => open({ kind: 'correct', order: e.order, payment: e.payment })} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Payments on the customer's other orders, for the bottom of the body. */
function OtherPayments({ c, open }: { c: Customer; open: OpenDialog }) {
  const L = useL();
  const others = c.timeline.filter((e) => e.order.id !== c.picked.id);
  if (others.length === 0) return null;
  return (
    <div className="flex flex-col">
      <h4 className="text-xs font-semibold text-muted">{L('অন্য অর্ডারের জমা', 'Paid on other orders')}</h4>
      <ul className="m-0 list-none divide-y divide-line p-0">
        {others.map((e) => (
          <EntryLine key={e.payment.id} e={e} showOrder onCorrect={() => open({ kind: 'correct', order: e.order, payment: e.payment })} />
        ))}
      </ul>
    </div>
  );
}

function balanceText(o: Order, money: (n: number) => string, L: (bn: string, en: string) => string) {
  const m = moneySummary(o);
  return m.balance > 0 ? money(m.balance) : m.creditDue > 0 ? money(m.creditDue) : L('পরিশোধিত', 'Paid');
}

/* ------------------------------------------------------------------ B ------------------------------------------------------------------ */

/** B: the orders as a row of tabs; the picked one is a solid tab and its details sit flat below. */
function TabsBody({ c, open }: { c: Customer; open: OpenDialog }) {
  const { money } = useI18n();
  const L = useL();
  const [, pick] = usePicked();
  return (
    <>
      {c.orders.length > 1 && (
        <div role="tablist" aria-label={L('অর্ডার', 'Orders')} className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2.5">
          {c.orders.map((o) => {
            const on = o.id === c.picked.id;
            const owing = moneySummary(o).balance > 0;
            return (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pick(o.id)}
                className={`flex shrink-0 flex-col items-start rounded-lg px-3 py-1.5 text-start ${on ? 'bg-ink text-panel' : 'bg-surface hover:bg-line/60'}`}
              >
                <span className="text-sm font-semibold">{o.number}</span>
                <span className={`text-xs ${on ? 'opacity-80' : owing ? 'text-warn-ink' : 'text-ok'}`}>{balanceText(o, money, L)}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4">
        <OrderDetail c={c} open={open} />
        <OtherPayments c={c} open={open} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ C ------------------------------------------------------------------ */

/** C: compact order rows that never expand; the picked one has a check and an accent bar, and its details follow the list. */
function ListBody({ c, open }: { c: Customer; open: OpenDialog }) {
  const { money, number, date } = useI18n();
  const L = useL();
  const [, pick] = usePicked();
  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4">
      {c.orders.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-muted">
            {L('অর্ডার', 'Orders')} · {number(c.orders.length)}
          </h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {c.orders.map((o) => {
              const on = o.id === c.picked.id;
              const m = moneySummary(o);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(o.id)}
                    className={`flex w-full items-center gap-3 border-s-4 py-2 pe-2 ps-3 text-start ${on ? 'border-brand font-semibold' : 'border-transparent hover:bg-surface'}`}
                  >
                    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${on ? 'bg-brand text-on-brand' : 'ring-1 ring-line'}`}>
                      {on ? '✓' : ''}
                    </span>
                    <span className="w-20">{o.number}</span>
                    <span className="w-28 text-xs font-normal text-muted">{date(o.createdAt.slice(0, 10))}</span>
                    <span className="min-w-0 flex-1">
                      <PaidBar paid={m.paid} total={m.total} />
                    </span>
                    <span className={`w-24 text-end font-display ${m.balance > 0 ? 'text-warn' : 'text-ok'}`}>{balanceText(o, money, L)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <OrderDetail c={c} open={open} />
      </section>
      <OtherPayments c={c} open={open} />
    </div>
  );
}

/* ------------------------------------------------------------------ D ------------------------------------------------------------------ */

/** D: the picked order leads the body; the customer's other orders wait below and swap in when clicked. */
function HeroBody({ c, open }: { c: Customer; open: OpenDialog }) {
  const { money, date } = useI18n();
  const L = useL();
  const [, pick] = usePicked();
  const rest = c.orders.filter((o) => o.id !== c.picked.id);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="border-b border-line p-4">
        <OrderDetail c={c} open={open} payments={false} />
      </div>
      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5 p-4">
          <h3 className="text-xs font-semibold text-muted">{L('এই কাস্টমারের অন্য অর্ডার', 'Other orders')}</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {rest.map((o) => {
              const m = moneySummary(o);
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => pick(o.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start ring-1 ring-inset ring-line hover:bg-surface">
                    <span className="flex w-24 flex-col">
                      <span className="font-semibold">{o.number}</span>
                      <span className="text-xs text-muted">{date(o.createdAt.slice(0, 10))}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <PaidBar paid={m.paid} total={m.total} />
                    </span>
                    <span className={`w-24 text-end font-display font-bold ${m.balance > 0 ? 'text-warn' : 'text-ok'}`}>{balanceText(o, money, L)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className={`flex flex-col gap-5 px-4 pb-4 ${rest.length > 0 ? 'border-t border-line pt-4' : 'pt-4'}`}>
        <PickedPayments c={c} open={open} />
        <OtherPayments c={c} open={open} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ E ------------------------------------------------------------------ */

/** E: a narrow rail of orders down the left of the card; the picked one joins the details pane like a folder tab. */
function RailBody({ c, open }: { c: Customer; open: OpenDialog }) {
  const { money, date } = useI18n();
  const L = useL();
  const [, pick] = usePicked();
  return (
    <div className="flex min-h-0 flex-1">
      <ul aria-label={L('অর্ডার', 'Orders')} className="m-0 flex w-36 shrink-0 list-none flex-col gap-1 overflow-y-auto border-e border-line bg-surface/60 py-2 ps-2">
        {c.orders.map((o) => {
          const on = o.id === c.picked.id;
          const m = moneySummary(o);
          return (
            <li key={o.id}>
              <button
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => pick(o.id)}
                className={`-me-px flex w-full flex-col gap-1 rounded-s-lg py-2 pe-2 ps-3 text-start ${on ? 'border border-e-0 border-line bg-panel' : 'hover:bg-surface'}`}
              >
                <span className="flex items-baseline justify-between gap-1">
                  <span className="text-sm font-semibold">{o.number}</span>
                </span>
                <span className="text-xs text-muted">{date(o.createdAt.slice(0, 10))}</span>
                <PaidBar paid={m.paid} total={m.total} />
                <span className={`text-sm font-display font-bold ${m.balance > 0 ? 'text-warn' : 'text-ok'}`}>{balanceText(o, money, L)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4">
        <OrderDetail c={c} open={open} />
        <OtherPayments c={c} open={open} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- variants ---------------------------------------------------------------- */

export function VariantB() {
  return <DueList side={(id) => <CustomerCard id={id} body={(c, open) => <TabsBody c={c} open={open} />} />} />;
}
export function VariantC() {
  return <DueList side={(id) => <CustomerCard id={id} body={(c, open) => <ListBody c={c} open={open} />} />} />;
}
export function VariantD() {
  return <DueList side={(id) => <CustomerCard id={id} body={(c, open) => <HeroBody c={c} open={open} />} />} />;
}
export function VariantE() {
  return <DueList side={(id) => <CustomerCard id={id} body={(c, open) => <RailBody c={c} open={open} />} />} />;
}
