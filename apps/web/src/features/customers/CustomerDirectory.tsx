import { searchCustomers, type GarmentTemplate } from '@darzikhata/domain';
import { Plus, Scissors, Search, Users, Wallet, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { buttonClasses } from '../../ui/Button';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { directoryCounts, directoryRows, filterRows, type DirectoryFilter, type DirectoryRow } from './directoryView';

interface Props {
  query: string;
  onQueryChange(query: string): void;
  activeId: string | undefined;
  /** A customer's profile is open beside the list, so rows show only the name, phone and what they owe. */
  compact: boolean;
}

/** Columns of a full-width row: customer, phone, garments measured, orders, last visit, owed. */
const WIDE_COLUMNS = 'grid grid-cols-[minmax(13rem,2fr)_9rem_minmax(9rem,2fr)_7rem_8rem_7rem] items-center gap-3';

/** Desktop customer directory: search, filter tiles with counts, and a list that scrolls inside its card. */
export function CustomerDirectory({ query, onQueryChange, activeId, compact }: Props) {
  const { t, money, number } = useI18n();
  const can = useCan();
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const [filter, setFilter] = useState<DirectoryFilter>('all');
  const showMoney = can('money.view');

  const rows = useMemo(() => {
    const all = Object.values(state.customers);
    const found = query.trim() ? searchCustomers(all, query, 50) : all.sort((a, b) => a.name.localeCompare(b.name));
    return directoryRows(found, Object.values(scoped.orders));
  }, [state.customers, scoped.orders, query]);
  const counts = directoryCounts(rows);
  const active = showMoney || filter !== 'owes' ? filter : 'all';
  const shown = filterRows(rows, active);

  const tile = (key: DirectoryFilter, Icon: LucideIcon, label: string, count: number, tone: 'brand' | 'warn') => (
    <button
      type="button"
      aria-pressed={active === key}
      onClick={() => setFilter(key)}
      className={`flex min-w-0 flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
        active === key
          ? tone === 'warn'
            ? 'bg-warn-soft text-warn-ink ring-warn-line'
            : 'bg-brand-soft text-brand-strong ring-brand'
          : 'bg-surface/60 ring-line hover:bg-surface'
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icon size={15} aria-hidden="true" className={tone === 'warn' ? 'text-warn' : 'text-brand-strong'} />
        <span className="font-display text-lg font-bold leading-tight">{number(count)}</span>
      </span>
      <span className="max-w-full truncate text-xs font-semibold text-muted">{label}</span>
    </button>
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm" aria-label={t('nav.customers')}>
      <div className="flex flex-col gap-3 border-b border-line p-3">
        <div className="flex items-center gap-2">
          {!compact && <h1 className="mr-2 font-display text-xl font-bold">{t('nav.customers')}</h1>}
          <label className={`flex min-h-10 min-w-0 items-center gap-2 rounded-xl border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus ${compact ? 'flex-1' : 'w-96'}`}>
            <Search size={16} aria-hidden="true" className="shrink-0 text-muted" />
            <span className="sr-only">{t('customers.searchField')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t('customers.searchField')}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
            />
          </label>
          {!compact && <div className="flex-1" />}
          {can('customers.edit') && (
            <Link
              to="/app/customers/new"
              aria-label={compact ? t('customers.new') : undefined}
              title={compact ? t('customers.new') : undefined}
              className={`${buttonClasses(compact ? 'secondary' : 'primary')} shrink-0 ${compact ? 'w-10 px-0!' : ''}`}
            >
              <Plus size={compact ? 20 : 16} aria-hidden="true" />
              {!compact && t('customers.new')}
            </Link>
          )}
        </div>
        <div role="group" aria-label={t('customers.filters')} className={`grid gap-2 ${showMoney ? 'grid-cols-3' : 'grid-cols-2'} ${compact ? '' : 'max-w-xl'}`}>
          {tile('all', Users, t('customers.filter.all'), counts.all, 'brand')}
          {showMoney && tile('owes', Wallet, t('customers.filter.owes', { amount: money(counts.owedTotal) }), counts.owes, 'warn')}
          {tile('open', Scissors, t('customers.filter.open'), counts.open, 'brand')}
        </div>
      </div>
      {/* relative: keeps absolutely placed screen-reader text inside this scroll area, so the page itself never scrolls. */}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {!compact && (
          <div className={`${WIDE_COLUMNS} sticky top-0 z-10 border-b border-line bg-panel px-4 py-2 text-sm font-semibold text-muted`}>
            <span>{t('customers.col.customer')}</span>
            <span>{t('customers.col.phone')}</span>
            <span>{t('customers.col.measured')}</span>
            <span>{t('customer.stat.orders')}</span>
            <span>{t('customer.stat.last')}</span>
            <span className="text-right">{showMoney && t('customer.stat.owed')}</span>
          </div>
        )}
        {shown.length === 0 ? (
          <p className="p-4 text-muted">{t('customers.none')}</p>
        ) : (
          <ul aria-label={t('customers.list')} className="m-0 list-none p-0">
            {shown.map((row) => (
              <li key={row.customer.id} className="border-b border-line last:border-0">
                <DirectoryRowLink row={row} active={row.customer.id === activeId} compact={compact} showMoney={showMoney} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DirectoryRowLink({ row, active, compact, showMoney }: { row: DirectoryRow; active: boolean; compact: boolean; showMoney: boolean }) {
  const { t, money, date, number, label } = useI18n();
  const { state, config } = useSnapshot();
  const hasAccess = useMeasurementAccess();
  const { customer } = row;
  const name = customer.name;
  const owed = showMoney && row.owed > 0 ? <span className="font-display font-semibold text-warn">{money(row.owed)}</span> : <span className="text-muted">–</span>;
  const linkClass = `px-4 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${active ? 'bg-brand-soft' : 'hover:bg-surface'}`;

  if (compact) {
    return (
      <Link to={`/app/customers/${customer.id}`} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 ${linkClass}`}>
        <Avatar id={customer.id} name={name} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold [overflow-wrap:anywhere]">{name}</span>
          <span className="text-xs text-muted">{customer.phone ?? t('customer.noPhone')}</span>
        </span>
        <span className="text-right">{owed}</span>
      </Link>
    );
  }

  const measured: GarmentTemplate[] = hasAccess(customer)
    ? (config?.templates ?? []).filter((tpl) => (state.profiles[`${customer.id}:${tpl.id}`]?.versions.length ?? 0) > 0)
    : [];
  return (
    <Link to={`/app/customers/${customer.id}`} aria-current={active ? 'page' : undefined} className={`${WIDE_COLUMNS} ${linkClass}`}>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar id={customer.id} name={name} size="sm" />
        <span className="font-semibold [overflow-wrap:anywhere]">{name}</span>
      </span>
      <span className="text-sm text-muted">{customer.phone ?? '–'}</span>
      <span className="flex flex-wrap gap-1">
        {measured.map((tpl) => (
          <span key={tpl.id} className="rounded-md bg-surface px-1.5 py-0.5 text-xs ring-1 ring-line">
            {label(tpl.name)}
          </span>
        ))}
      </span>
      <span className="text-sm">
        {number(row.orderCount)}
        {row.openCount > 0 && <span className="ml-1 text-xs text-brand-strong">({t('customers.openCount', { n: number(row.openCount) })})</span>}
      </span>
      <span className="text-sm text-muted">{row.lastVisit ? date(row.lastVisit) : '–'}</span>
      <span className="text-right">{owed}</span>
    </Link>
  );
}
