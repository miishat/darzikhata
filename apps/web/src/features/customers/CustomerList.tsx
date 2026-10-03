import { searchCustomers, type Customer } from '@darzikhata/domain';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { useCan } from '../common/hooks';

interface Props {
  query: string;
  onQueryChange(query: string): void;
  activeId: string | undefined;
}

/** Search box and the customers it finds, one link each. */
export function CustomerList({ query, onQueryChange, activeId }: Props) {
  const { t } = useI18n();
  const can = useCan();
  const { state } = useSnapshot();

  const shown = useMemo(() => {
    const all = Object.values(state.customers);
    return query.trim() ? searchCustomers(all, query, 50) : all.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.customers, query]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <TextField
        label={t('customers.search')}
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {can('customers.edit') && (
        <Link to="/app/customers/new" className={buttonClasses('secondary')}>
          {t('customers.new')}
        </Link>
      )}
      {shown.length === 0 ? (
        <p className="text-muted">{t('customers.none')}</p>
      ) : (
        <ul aria-label={t('customers.list')} className="flex min-h-0 flex-col gap-1 overflow-auto">
          {shown.map((customer) => (
            <li key={customer.id}>
              <CustomerLink customer={customer} active={customer.id === activeId} />
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
