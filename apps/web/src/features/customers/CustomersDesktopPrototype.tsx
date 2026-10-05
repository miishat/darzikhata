// PROTOTYPE (throwaway): three desktop layouts for /app/customers, switched with ?variant=. A is the current page.
// B: full-width directory table, profile slides in as a side panel (like Orders).
// C: slim list, wide all-garments measurement sheet in the middle, contact and orders in a right rail.
// D: no list; a search bar with recent customers, then a full-width profile with tabs.
import { balanceDue, currentVersion, isOrderClosed, formatMeasurement, orderTotal, searchCustomers, type Customer, type GarmentTemplate, type MeasurementVersion, type Order } from '@darzikhata/domain';
import { Phone, Plus, Ruler, Scissors, Search, Users, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { buttonClasses } from '../../ui/Button';
import { StagePill } from '../../ui/StagePill';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { garmentSummary } from '../common/orderText';
import { MeasurementSection } from './MeasurementSection';
import { deltaText, fieldGroups, groupLabel, valueDeltas } from './measurementView';

export const CUSTOMER_VARIANTS = { A: 'Current', B: 'Directory + panel', C: 'Three columns', D: 'Workspace' };

// ---------- shared data (not layout) ----------

interface Row {
  customer: Customer;
  orders: Order[];
  owed: number;
  open: number;
  last: string | null;
  garments: string[];
}

function useRows(query: string): Row[] {
  const { state, config } = useSnapshot();
  const scoped = useScopedState();
  const { label } = useI18n();
  return useMemo(() => {
    const all = Object.values(state.customers);
    const list = query.trim() ? searchCustomers(all, query, 50) : all.sort((a, b) => a.name.localeCompare(b.name));
    const byCustomer = new Map<string, Order[]>();
    for (const o of Object.values(scoped.orders)) byCustomer.set(o.customerId, [...(byCustomer.get(o.customerId) ?? []), o]);
    return list.map((customer) => {
      const orders = (byCustomer.get(customer.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const garments = (config?.templates ?? [])
        .filter((tpl) => (state.profiles[`${customer.id}:${tpl.id}`]?.versions.length ?? 0) > 0)
        .map((tpl) => label(tpl.name));
      return {
        customer,
        orders,
        owed: orders.reduce((s, o) => s + Math.max(0, balanceDue(o)), 0),
        open: orders.filter((o) => !isOrderClosed(o)).length,
        last: orders[0]?.createdAt ?? null,
        garments,
      };
    });
  }, [state.customers, state.profiles, scoped.orders, config, query, label]);
}

interface Garment {
  tpl: GarmentTemplate;
  current: MeasurementVersion;
  deltas: Record<string, number>;
}

function useGarments(customerId: string): Garment[] {
  const { state, config } = useSnapshot();
  return (config?.templates ?? []).flatMap((tpl) => {
    const profile = state.profiles[`${customerId}:${tpl.id}`];
    const current = profile ? currentVersion(profile) : null;
    if (!profile || !current) return [];
    return [{ tpl, current, deltas: valueDeltas(current.values, profile.versions.at(-2)?.values) }];
  });
}

/** The customer's name in the app's language: the English name in English when there is one. */
function nameIn(c: Customer, language: string): string {
  return language === 'en' && c.nameAlt ? c.nameAlt : c.name;
}

/** Prototype-only copy in the app's language, so English and Bangla never mix. */
function useL() {
  const { language } = useI18n();
  return (en: string, bn: string) => (language === 'bn' ? bn : en);
}

const OWED = 'rounded-md ring-1 ring-inset ring-warn-line bg-warn-soft px-2 py-0.5 text-sm font-semibold text-warn-ink';
const DELTA = 'rounded px-1 text-xs font-semibold bg-warn-soft text-warn-ink';

function SearchBox({ value, onChange, big = false, placeholder }: { value: string; onChange(v: string): void; big?: boolean; placeholder: string }) {
  return (
    <label className={`flex min-w-0 items-center gap-2 rounded-xl border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus ${big ? 'min-h-14 text-lg' : 'min-h-10'}`}>
      <Search size={big ? 22 : 16} aria-hidden="true" className="shrink-0 text-muted" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" />
    </label>
  );
}

function OrderLine({ order }: { order: Order }) {
  const { language, money, date, t } = useI18n();
  const due = balanceDue(order);
  const done = isOrderClosed(order);
  return (
    <Link to={`/app/orders/${order.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface">
      <span className="w-16 font-semibold">{order.number}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted">
        {date(order.createdAt)} · {garmentSummary(order, language)}
      </span>
      <StagePill label={done ? t('stageGroup.delivered') : t('stageGroup.unfinished')} tone={done ? 'done' : 'working'} />
      <span className={`w-20 text-right text-sm font-semibold ${due > 0 ? 'text-warn' : ''}`}>{money(due > 0 ? due : orderTotal(order))}</span>
    </Link>
  );
}

/** One garment's newest values as a dense grid, grouped. */
function GarmentSheet({ g, columns = 2 }: { g: Garment; columns?: 2 | 3 | 4 }) {
  const { t, label, language, date } = useI18n();
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns];
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold">{label(g.tpl.name)}</h3>
        <span className="text-xs text-muted">{date(g.current.takenAt, { year: true })}</span>
      </header>
      {fieldGroups(g.tpl.fields).map((grp) => (
        <div key={grp.group} className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{groupLabel(grp.group, t)}</p>
          <dl className={`m-0 grid ${cols} gap-x-4 gap-y-1`}>
            {grp.fields.map((f) => {
              const v = g.current.values[f.key];
              const d = g.deltas[f.key];
              return (
                <div key={f.key} className="flex items-baseline justify-between gap-2 border-b border-line/60 py-1">
                  <dt className="truncate text-sm text-muted">{label(f.label)}</dt>
                  <dd className="m-0 flex items-baseline gap-1">
                    {d !== undefined && <span className={DELTA}>{deltaText(d, language)}</span>}
                    <span className="font-display font-semibold">{v ? formatMeasurement(v.value, language) : '–'}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
      {g.current.notes && <p className="text-sm text-muted">{g.current.notes}</p>}
    </section>
  );
}

function Actions({ row }: { row: Row }) {
  const { t } = useI18n();
  const can = useCan();
  const latest = row.orders[0];
  return (
    <div className="flex flex-wrap gap-2">
      {row.customer.phone && (
        <a href={`tel:${row.customer.phone}`} className={buttonClasses('secondary')}>
          <Phone size={16} aria-hidden="true" />
          {t('customer.call')}
        </a>
      )}
      {can('customers.edit') && (
        <Link to={`/app/customers/${row.customer.id}/edit`} className={buttonClasses('secondary')}>
          {t('customer.edit')}
        </Link>
      )}
      {can('orders.create') && (
        <Link to={latest ? `/app/orders/new?repeat=${latest.id}` : `/app/orders/new?customer=${row.customer.id}`} className={buttonClasses('primary')}>
          {latest ? t('customer.orderAgain') : t('customer.newOrder')}
        </Link>
      )}
    </div>
  );
}

// ---------- B: directory table + side panel ----------

type Filter = 'all' | 'owes' | 'open';

export function VariantB({ activeId }: { activeId?: string }) {
  const { t, money, date, number, language } = useI18n();
  const L = useL();
  const can = useCan();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const rows = useRows(query);
  const shown = rows.filter((r) => (filter === 'owes' ? r.owed > 0 : filter === 'open' ? r.open > 0 : true));
  const active = rows.find((r) => r.customer.id === activeId);
  const narrow = Boolean(active);
  const owesCount = rows.filter((r) => r.owed > 0).length;
  const openCount = rows.filter((r) => r.open > 0).length;
  const owedTotal = rows.reduce((s, r) => s + r.owed, 0);
  // Filter tiles: a count you can read at a glance, coloured by what it means.
  const tile = (f: Filter, Icon: typeof Users, text: string, value: string, tone: { on: string; icon: string }) => (
    <button
      type="button"
      aria-pressed={filter === f}
      onClick={() => setFilter(f)}
      className={`flex min-w-0 flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left ring-1 ring-inset transition-colors ${
        filter === f ? tone.on : 'bg-surface/60 ring-line hover:bg-surface'
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icon size={15} aria-hidden="true" className={tone.icon} />
        <span className="font-display text-lg font-bold leading-tight">{value}</span>
      </span>
      <span className="max-w-full truncate text-xs font-semibold text-muted">{text}</span>
    </button>
  );
  const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] gap-4">
      <section className={`${CARD} ${narrow ? 'w-[360px] shrink-0' : 'min-w-0 flex-1'}`}>
        <div className="flex flex-col gap-3 border-b border-line p-3">
          <div className="flex items-center gap-2">
            {!narrow && <h1 className="mr-2 font-display text-xl font-bold">{t('nav.customers')}</h1>}
            <div className={narrow ? 'min-w-0 flex-1' : 'w-96'}>
              <SearchBox value={query} onChange={setQuery} placeholder={t('customers.searchField')} />
            </div>
            {!narrow && <div className="flex-1" />}
            {can('customers.edit') && (
              <Link
                to="/app/customers/new"
                aria-label={t('customers.new')}
                title={t('customers.new')}
                className={`${buttonClasses(narrow ? 'secondary' : 'primary')} shrink-0 ${narrow ? 'w-10 px-0' : ''}`}
              >
                <Plus size={16} aria-hidden="true" />
                {!narrow && t('customers.new')}
              </Link>
            )}
          </div>
          <div className={`grid grid-cols-3 gap-2 ${narrow ? '' : 'max-w-xl'}`}>
            {tile('all', Users, L('All Customers', 'সব কাস্টমার'), number(rows.length), { on: 'bg-brand-soft text-brand-strong ring-brand', icon: 'text-brand-strong' })}
            {tile('owes', Wallet, L(`Owe ${money(owedTotal)}`, `বাকি ${money(owedTotal)}`), number(owesCount), { on: 'bg-warn-soft text-warn-ink ring-warn-line', icon: 'text-warn' })}
            {tile('open', Scissors, L('Open Orders', 'চলমান অর্ডার'), number(openCount), { on: 'bg-brand-soft text-brand-strong ring-brand', icon: 'text-brand-strong' })}
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 border-b border-line bg-panel text-sm text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">{L('Customer', 'কাস্টমার')}</th>
                {!narrow && <th className="px-3 py-2 font-semibold">{L('Phone', 'ফোন')}</th>}
                {!narrow && <th className="px-3 py-2 font-semibold">{L('Measured', 'মাপ আছে')}</th>}
                {!narrow && <th className="px-3 py-2 font-semibold">{t('customer.stat.orders')}</th>}
                {!narrow && <th className="px-3 py-2 font-semibold">{t('customer.stat.last')}</th>}
                <th className="px-4 py-2 text-right font-semibold">{t('customer.stat.owed')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.customer.id}
                  onClick={() => navigate(`/app/customers/${r.customer.id}?variant=B`)}
                  className={`cursor-pointer border-b border-line last:border-0 ${r.customer.id === activeId ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                >
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-3">
                      <Avatar id={r.customer.id} name={nameIn(r.customer, language)} size="sm" />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold">{nameIn(r.customer, language)}</span>
                        {narrow && <span className="text-xs text-muted">{r.customer.phone}</span>}
                      </span>
                    </span>
                  </td>
                  {!narrow && <td className="px-3 py-2 text-sm text-muted">{r.customer.phone ?? '–'}</td>}
                  {!narrow && (
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1">
                        {r.garments.map((g) => (
                          <span key={g} className="rounded-md bg-surface px-1.5 py-0.5 text-xs ring-1 ring-line">
                            {g}
                          </span>
                        ))}
                      </span>
                    </td>
                  )}
                  {!narrow && (
                    <td className="px-3 py-2 text-sm">
                      {number(r.orders.length)}
                      {r.open > 0 && <span className="ml-1 text-xs text-brand-strong">({L(`${number(r.open)} open`, `${number(r.open)}টি চলমান`)})</span>}
                    </td>
                  )}
                  {!narrow && <td className="px-3 py-2 text-sm text-muted">{r.last ? date(r.last) : '–'}</td>}
                  <td className={`px-4 py-2 text-right font-display font-semibold ${r.owed > 0 ? 'text-warn' : 'text-muted'}`}>{r.owed > 0 ? money(r.owed) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="p-4 text-muted">{t('customers.none')}</p>}
        </div>
      </section>
      {active && (
        <aside className={`${CARD} min-w-0 flex-1`}>
          <div className="flex flex-wrap items-start gap-3 border-b border-line p-4">
            <Avatar id={active.customer.id} name={nameIn(active.customer, language)} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold">{nameIn(active.customer, language)}</h2>
              <p className="text-sm text-muted">{active.customer.phone}</p>
              {active.owed > 0 && <span className={`mt-1 inline-block ${OWED}`}>{t('customer.balance', { amount: money(active.owed) })}</span>}
            </div>
            <Actions row={active} />
            <Link to="/app/customers?variant=B" aria-label={L('Close', 'বন্ধ করুন')} className="rounded-lg p-2 hover:bg-surface">
              <X size={18} />
            </Link>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
            <MeasurementSection customerId={active.customer.id} />
            <section className="flex flex-col gap-1">
              <h3 className="font-semibold">{t('customer.orders')}</h3>
              {active.orders.slice(0, 5).map((o) => (
                <OrderLine key={o.id} order={o} />
              ))}
            </section>
          </div>
        </aside>
      )}
    </div>
  );
}

// ---------- C: three columns ----------

export function VariantC({ activeId }: { activeId?: string }) {
  const { t, money, date, number, language } = useI18n();
  const L = useL();
  const can = useCan();
  const [query, setQuery] = useState('');
  const rows = useRows(query);
  const all = useRows('');
  const active = all.find((r) => r.customer.id === activeId);

  return (
    <div className="flex items-start gap-4">
      <div className="sticky top-0 flex max-h-[calc(100dvh-6rem)] w-[260px] shrink-0 flex-col gap-2 rounded-2xl border border-line bg-panel p-2">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <SearchBox value={query} onChange={setQuery} placeholder={t('customers.search')} />
          </div>
          {can('customers.edit') && (
            <Link to="/app/customers/new" aria-label={t('customers.new')} className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
              <Plus size={18} />
            </Link>
          )}
        </div>
        <ul className="flex min-h-0 flex-col overflow-auto">
          {rows.map((r) => (
            <li key={r.customer.id}>
              <Link
                to={`/app/customers/${r.customer.id}?variant=C`}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${r.customer.id === activeId ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface'}`}
              >
                <Avatar id={r.customer.id} name={nameIn(r.customer, language)} size="sm" />
                <span className="min-w-0 flex-1 truncate font-semibold">{nameIn(r.customer, language)}</span>
                {r.owed > 0 && <span className="text-xs font-semibold text-warn">{money(r.owed)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {!active ? (
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">
          <section className="flex flex-col gap-1 rounded-2xl border border-line bg-panel p-4">
            <h2 className="font-semibold">{L('Owes Money', 'টাকা বাকি')}</h2>
            {all
              .filter((r) => r.owed > 0)
              .sort((a, b) => b.owed - a.owed)
              .slice(0, 8)
              .map((r) => (
                <Link key={r.customer.id} to={`/app/customers/${r.customer.id}?variant=C`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface">
                  <Avatar id={r.customer.id} name={nameIn(r.customer, language)} size="sm" />
                  <span className="flex-1">{nameIn(r.customer, language)}</span>
                  <span className="font-display font-semibold text-warn">{money(r.owed)}</span>
                </Link>
              ))}
          </section>
          <section className="flex flex-col gap-1 rounded-2xl border border-line bg-panel p-4">
            <h2 className="font-semibold">{L('Recently Visited', 'সম্প্রতি এসেছেন')}</h2>
            {all
              .filter((r) => r.last)
              .sort((a, b) => b.last!.localeCompare(a.last!))
              .slice(0, 8)
              .map((r) => (
                <Link key={r.customer.id} to={`/app/customers/${r.customer.id}?variant=C`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface">
                  <Avatar id={r.customer.id} name={nameIn(r.customer, language)} size="sm" />
                  <span className="flex-1">{nameIn(r.customer, language)}</span>
                  <span className="text-sm text-muted">{date(r.last!)}</span>
                </Link>
              ))}
          </section>
        </div>
      ) : (
        <>
          <CenterSheet row={active} />
          <aside className="sticky top-0 flex w-[300px] shrink-0 flex-col gap-3">
            <section className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-panel p-4 text-center">
              <Avatar id={active.customer.id} name={nameIn(active.customer, language)} size="xl" />
              <h1 className="font-display text-xl font-bold">{nameIn(active.customer, language)}</h1>
              <p className="text-sm text-muted">{active.customer.phone ?? t('customer.noPhone')}</p>
              <dl className="m-0 grid w-full grid-cols-2 gap-2 text-left">
                <div className="rounded-lg bg-surface px-3 py-2">
                  <dt className="text-xs text-muted">{t('customer.stat.orders')}</dt>
                  <dd className="m-0 font-display text-lg font-bold">{number(active.orders.length)}</dd>
                </div>
                <div className={`rounded-lg px-3 py-2 ${active.owed > 0 ? 'bg-warn-soft text-warn-ink' : 'bg-surface'}`}>
                  <dt className="text-xs">{t('customer.stat.owed')}</dt>
                  <dd className="m-0 font-display text-lg font-bold">{money(active.owed)}</dd>
                </div>
              </dl>
              <Actions row={active} />
            </section>
            <section className="flex flex-col gap-1 rounded-2xl border border-line bg-panel p-3">
              <h2 className="px-2 font-semibold">{t('customer.orders')}</h2>
              {active.orders.slice(0, 6).map((o) => (
                <Link key={o.id} to={`/app/orders/${o.id}`} className="flex flex-col rounded-lg px-2 py-1.5 hover:bg-surface">
                  <span className="flex justify-between">
                    <span className="font-semibold">{o.number}</span>
                    {balanceDue(o) > 0 && <span className="text-sm font-semibold text-warn">{money(balanceDue(o))}</span>}
                  </span>
                  <span className="text-xs text-muted">{date(o.createdAt)}</span>
                </Link>
              ))}
            </section>
          </aside>
        </>
      )}
    </div>
  );
}

function CenterSheet({ row }: { row: Row }) {
  const { t } = useI18n();
  const L = useL();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const garments = useGarments(row.customer.id);
  const { config } = useSnapshot();
  const { label } = useI18n();
  const missing = (config?.templates ?? []).filter((tpl) => tpl.active && tpl.fields.length > 0 && !garments.some((g) => g.tpl.id === tpl.id));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Ruler size={18} className="text-muted" />
        <h2 className="font-display text-xl font-bold">{t('measure.section')}</h2>
      </div>
      {!hasAccess(row.customer) ? (
        <p className="text-muted">{t('measure.hidden')}</p>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
            {garments.map((g) => (
              <div key={g.tpl.id} className="flex flex-col gap-1">
                <GarmentSheet g={g} />
                {can('measurements.edit') && (
                  <Link to={`/app/customers/${row.customer.id}/measure/${g.tpl.id}`} className="self-end text-sm font-semibold text-brand-strong">
                    {L('Re-measure', 'আবার মাপ নিন')}
                  </Link>
                )}
              </div>
            ))}
          </div>
          {can('measurements.edit') && missing.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{L('Measure For:', 'মাপ নিন:')}</span>
              {missing.map((tpl) => (
                <Link key={tpl.id} to={`/app/customers/${row.customer.id}/measure/${tpl.id}`} className="rounded-full border border-dashed border-line px-3 py-1 hover:bg-surface">
                  + {label(tpl.name)}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- D: workspace, no list ----------

type Tab = 'measure' | 'orders' | 'details';

export function VariantD({ activeId }: { activeId?: string }) {
  const { t, money, date, number, language } = useI18n();
  const L = useL();
  const can = useCan();
  const [query, setQuery] = useState('');
  const results = useRows(query);
  const all = useRows('');
  const active = all.find((r) => r.customer.id === activeId);
  const recent = all.filter((r) => r.last).sort((a, b) => b.last!.localeCompare(a.last!)).slice(0, 8);
  const [tab, setTab] = useState<Tab>('measure');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="relative flex items-center gap-3">
        <div className="flex-1">
          <SearchBox big value={query} onChange={setQuery} placeholder={t('customers.searchField')} />
        </div>
        {can('customers.edit') && (
          <Link to="/app/customers/new" className={buttonClasses('secondary', 'lg')}>
            <Plus size={18} aria-hidden="true" />
            {t('customers.new')}
          </Link>
        )}
        {query.trim() && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-96 overflow-auto rounded-xl border border-line bg-panel p-1 shadow-xl">
            {results.slice(0, 10).map((r) => (
              <li key={r.customer.id}>
                <Link to={`/app/customers/${r.customer.id}?variant=D`} onClick={() => setQuery('')} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface">
                  <Avatar id={r.customer.id} name={nameIn(r.customer, language)} size="sm" />
                  <span className="flex-1 font-semibold">{nameIn(r.customer, language)}</span>
                  <span className="text-sm text-muted">{r.customer.phone}</span>
                  {r.owed > 0 && <span className="w-20 text-right text-sm font-semibold text-warn">{money(r.owed)}</span>}
                </Link>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-2 text-muted">{t('customers.none')}</li>}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{L('Recent:', 'সাম্প্রতিক:')}</span>
        {recent.map((r) => (
          <Link
            key={r.customer.id}
            to={`/app/customers/${r.customer.id}?variant=D`}
            className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-3 text-sm ring-1 ${r.customer.id === activeId ? 'bg-brand-soft text-brand-strong ring-brand' : 'bg-panel ring-line hover:bg-surface'}`}
          >
            <Avatar id={r.customer.id} name={nameIn(r.customer, language)} size="sm" />
            {nameIn(r.customer, language)}
          </Link>
        ))}
      </div>

      {!active ? (
        <div className="grid grid-cols-3 gap-3">
          {all.slice(0, 18).map((r) => (
            <Link key={r.customer.id} to={`/app/customers/${r.customer.id}?variant=D`} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3 hover:bg-surface">
              <Avatar id={r.customer.id} name={nameIn(r.customer, language)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{nameIn(r.customer, language)}</span>
                <span className="text-xs text-muted">
                  {L(`${number(r.orders.length)} orders`, `${number(r.orders.length)}টি অর্ডার`)} · {r.garments.join(', ') || L('Not Measured', 'মাপ নেই')}
                </span>
              </span>
              {r.owed > 0 && <span className="text-sm font-semibold text-warn">{money(r.owed)}</span>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
          <header className="flex items-center gap-4 bg-surface/60 p-5">
            <Avatar id={active.customer.id} name={nameIn(active.customer, language)} size="xl" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-bold">{nameIn(active.customer, language)}</h1>
              <p className="text-muted">
                {active.customer.phone ?? t('customer.noPhone')} · {t('customer.since', { date: date(active.customer.createdAt, { year: true }) })}
              </p>
            </div>
            <dl className="m-0 flex gap-6 text-right">
              <div>
                <dt className="text-xs text-muted">{t('customer.stat.orders')}</dt>
                <dd className="m-0 font-display text-2xl font-bold">{number(active.orders.length)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('customer.stat.owed')}</dt>
                <dd className={`m-0 font-display text-2xl font-bold ${active.owed > 0 ? 'text-warn' : ''}`}>{money(active.owed)}</dd>
              </div>
            </dl>
          </header>
          <div className="flex items-center justify-between border-b border-line px-5">
            <div role="tablist" className="flex gap-1">
              {(
                [
                  ['measure', t('customer.tab.measurements')],
                  ['orders', `${t('customer.tab.orders')} (${number(active.orders.length)})`],
                  ['details', L('Details', 'বিবরণ')],
                ] as [Tab, string][]
              ).map(([k, text]) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`border-b-2 px-4 py-3 font-semibold ${tab === k ? 'border-brand text-brand-strong' : 'border-transparent text-muted hover:text-ink'}`}
                >
                  {text}
                </button>
              ))}
            </div>
            <div className="py-2">
              <Actions row={active} />
            </div>
          </div>
          <div className="p-5">
            {tab === 'measure' && <MeasureTab row={active} />}
            {tab === 'orders' && (
              <div className="flex flex-col">
                {active.orders.length === 0 ? <p className="text-muted">{t('customer.noOrders')}</p> : active.orders.map((o) => <OrderLine key={o.id} order={o} />)}
              </div>
            )}
            {tab === 'details' && (
              <dl className="m-0 grid max-w-xl grid-cols-[10rem_1fr] gap-y-2">
                <dt className="text-muted">{L('Name', 'নাম')}</dt>
                <dd className="m-0">{nameIn(active.customer, language)}</dd>
                <dt className="text-muted">{L('Other Name', 'অন্য নাম')}</dt>
                <dd className="m-0">{active.customer.nameAlt ?? '–'}</dd>
                <dt className="text-muted">{L('Phone', 'ফোন')}</dt>
                <dd className="m-0">{active.customer.phone ?? '–'}</dd>
                <dt className="text-muted">{L('Notes', 'নোট')}</dt>
                <dd className="m-0 whitespace-pre-line">{active.customer.notes || '–'}</dd>
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Vertical garment rail on the left, big values on the right. */
function MeasureTab({ row }: { row: Row }) {
  const { t, label } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const garments = useGarments(row.customer.id);
  const [pick, setPick] = useState<string | null>(null);
  if (!hasAccess(row.customer)) return <p className="text-muted">{t('measure.hidden')}</p>;
  if (garments.length === 0) return <p className="text-muted">{t('measure.none')}</p>;
  const g = garments.find((x) => x.tpl.id === pick) ?? garments[0]!;
  return (
    <div className="flex gap-5">
      <div className="flex w-48 shrink-0 flex-col gap-1">
        {garments.map((x) => (
          <button
            key={x.tpl.id}
            type="button"
            onClick={() => setPick(x.tpl.id)}
            className={`rounded-lg px-3 py-2 text-left font-semibold ${x.tpl.id === g.tpl.id ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface'}`}
          >
            {label(x.tpl.name)}
          </button>
        ))}
        {can('measurements.edit') && (
          <Link to={`/app/customers/${row.customer.id}/measure/${g.tpl.id}`} className={`${buttonClasses('secondary')} mt-2`}>
            {t('measure.take')}
          </Link>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <GarmentSheet g={g} columns={3} />
      </div>
    </div>
  );
}
