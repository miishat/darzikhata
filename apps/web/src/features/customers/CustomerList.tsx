import { balanceDue, searchCustomers, type Customer } from '@darzikhata/domain';
import { Plus, TriangleAlert } from 'lucide-react';
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
  /** The desktop column shows avatars and what each customer owes; the phone keeps its plain rows. */
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
        <ul aria-label={t('customers.list')} className="flex min-h-0 flex-col gap-1 overflow-auto">
          {shown.map((customer) => (
            <li key={customer.id}>
              {desktop ? (
                <DesktopRow customer={customer} active={customer.id === activeId} owed={showOwed ? (owedBy.get(customer.id) ?? 0) : 0} money={money} />
              ) : (
                <CustomerLink customer={customer} active={customer.id === activeId} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerLink({ customer, active }: { customer: Customer; active: boolean }) {
  return (
    <Link
      to={`/app/customers/${customer.id}`}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col rounded-lg border px-3 py-2 focus-visible:outline-2 focus-visible:outline-brand ${
        active ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel hover:bg-surface'
      }`}
    >
      <span className="font-semibold">{customer.name}</span>
      {customer.nameAlt && <span className="text-sm text-muted">{customer.nameAlt}</span>}
      {customer.phone && <span className="text-sm text-muted">{customer.phone}</span>}
    </Link>
  );
}

function DesktopRow({ customer, active, owed, money }: { customer: Customer; active: boolean; owed: number; money: (amount: number) => string }) {
  const { t } = useI18n();
  return (
    <Link
      to={`/app/customers/${customer.id}`}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 focus-visible:outline-2 focus-visible:outline-brand ${
        active ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface'
      }`}
    >
      <Avatar id={customer.id} name={customer.name} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{customer.name}</span>
        <span className="truncate text-sm text-muted">{customer.phone ?? t('customer.noPhone')}</span>
      </span>
      {owed > 0 && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warn-soft px-2 py-0.5 text-sm font-semibold text-warn-ink">
          <TriangleAlert aria-hidden="true" size={14} />
          {t('customer.balance', { amount: money(owed) })}
        </span>
      )}
    </Link>
  );
}
