import { balanceDue, searchCustomers, type Customer } from '@darzikhata/domain';
import { Plus, Search, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { buttonClasses } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';

interface Props {
  query: string;
  onQueryChange(query: string): void;
  activeId: string | undefined;
  /** The desktop column is a compact sidebar list; the phone gets a search bar with an add button and one card per customer. */
  desktop?: boolean;
}

/** Search box and the customers it finds, one link each. */
export function CustomerList({ query, onQueryChange, activeId, desktop = false }: Props) {
  const { t, money } = useI18n();
  const scoped = useScopedState();
  const can = useCan();
  const { state } = useSnapshot();

  const shown = useMemo(() => {
    const all = Object.values(state.customers);
    return query.trim() ? searchCustomers(all, query, 50) : all.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.customers, query]);

  const owedBy = useMemo(() => {
    const owed = new Map<string, number>();
    for (const order of Object.values(scoped.orders)) {
      const due = balanceDue(order);
      if (due > 0) owed.set(order.customerId, (owed.get(order.customerId) ?? 0) + due);
    }
    return owed;
  }, [scoped.orders]);
  const showOwed = desktop && can('money.view');

  if (!desktop) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus">
            <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <span className="sr-only">{t('customers.search')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t('customers.search')}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
          </label>
          {can('customers.edit') && (
            <Link
              to="/app/customers/new"
              aria-label={t('customers.new')}
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Plus size={22} aria-hidden="true" />
            </Link>
          )}
        </div>
        {shown.length === 0 ? (
          <p className="text-muted">{t('customers.none')}</p>
        ) : (
          <ul aria-label={t('customers.list')} className="flex flex-col gap-2.5">
            {shown.map((customer) => (
              <li key={customer.id}>
                <CustomerCard customer={customer} owed={can('money.view') ? (owedBy.get(customer.id) ?? 0) : 0} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <TextField
        label={desktop ? t('customers.searchField') : t('customers.search')}
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {can('customers.edit') && (
        <Link to="/app/customers/new" className={buttonClasses('secondary')}>
          {desktop && <Plus aria-hidden="true" size={16} />}
          {t('customers.new')}
        </Link>
      )}
      {shown.length === 0 ? (
        <p className="text-muted">{t('customers.none')}</p>
      ) : (
        <ul aria-label={t('customers.list')} className="-m-1 flex min-h-0 flex-col gap-1 overflow-auto p-1">
          {shown.map((customer) => (
            <li key={customer.id}>
              <DesktopRow customer={customer} active={customer.id === activeId} owed={showOwed ? (owedBy.get(customer.id) ?? 0) : 0} money={money} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerCard({ customer, owed }: { customer: Customer; owed: number }) {
  const { t, money } = useI18n();
  const detail = [customer.nameAlt, customer.phone].filter(Boolean).join(' · ');
  return (
    <Link
      to={`/app/customers/${customer.id}`}
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-panel p-3.5 focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Avatar id={customer.id} name={customer.name} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{customer.name}</span>
        <span className="truncate text-sm text-muted">{detail || t('customer.noPhone')}</span>
      </span>
      {owed > 0 && (
        <span className="flex flex-col items-end">
          <span className="font-display text-lg font-bold text-warn">{money(owed)}</span>
          <span className="text-xs text-muted">{t('orders.card.owed')}</span>
        </span>
      )}
    </Link>
  );
}

function DesktopRow({ customer, active, owed, money }: { customer: Customer; active: boolean; owed: number; money: (amount: number) => string }) {
  const { t } = useI18n();
  return (
    <Link
      to={`/app/customers/${customer.id}`}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 focus-visible:outline-2 focus-visible:outline-focus ${
        active ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface'
      }`}
    >
      <Avatar id={customer.id} name={customer.name} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold [overflow-wrap:anywhere]">{customer.name}</span>
        <span className="text-sm text-muted [overflow-wrap:anywhere]">{customer.phone ?? t('customer.noPhone')}</span>
        {owed > 0 && (
          <span className="mt-1 inline-flex items-center gap-1 self-start rounded-md ring-1 ring-inset ring-warn-line bg-warn-soft px-2 py-0.5 text-sm font-semibold text-warn-ink">
            <TriangleAlert aria-hidden="true" size={14} />
            {t('customer.balance', { amount: money(owed) })}
          </span>
        )}
      </span>
    </Link>
  );
}
