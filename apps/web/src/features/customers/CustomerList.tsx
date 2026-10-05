import { balanceDue, searchCustomers, type Customer } from '@darzikhata/domain';
import { Plus, Search } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';

interface Props {
  query: string;
  onQueryChange(query: string): void;
}

/** Phone: a search bar with an add button and one card per customer it finds. The desktop page uses CustomerDirectory. */
export function CustomerList({ query, onQueryChange }: Props) {
  const { t } = useI18n();
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
