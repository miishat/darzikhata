import { searchCustomers, type Gender } from '@darzikhata/domain';
import { useMemo, useState } from 'react';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { Avatar } from '../../../ui/Avatar';
import { Button } from '../../../ui/Button';
import { ChoiceGroup } from '../../../ui/ChoiceGroup';
import { TextField } from '../../../ui/TextField';
import { useScopedState } from '../../branches/BranchScopeProvider';
import type { DraftErrors } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

const MATCHES = 8;

/** Choose an existing customer by search, or type a new one. */
export function CustomerPicker({ entry, errors, card = false }: { entry: OrderEntry; errors: DraftErrors; card?: boolean }) {
  const { t, number } = useI18n();
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const [query, setQuery] = useState('');
  const errorText = useErrorText(errors);
  const customer = entry.draft.customer;

  const matches = useMemo(
    () => (query.trim() ? searchCustomers(Object.values(state.customers), query, MATCHES) : []),
    [state.customers, query],
  );

  if (customer?.kind === 'existing') {
    const chosen = state.customers[customer.customerId];
    if (card) {
      // Desktop: avatar, name, phone and how many orders they have had, with a short "change".
      const earlier = Object.values(scoped.orders).filter((o) => o.customerId === customer.customerId).length;
      return (
        <div className="flex flex-col gap-2">
          {chosen && (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2">
              <Avatar id={chosen.id} name={chosen.name} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{chosen.name}</span>
                {chosen.phone && <span className="text-sm text-muted">{chosen.phone}</span>}
                <span className="text-sm text-muted">{t('entry.earlierOrders', { n: number(earlier) })}</span>
              </div>
              <Button variant="ghost" onClick={() => entry.setCustomer(null)}>
                {t('entry.changeCustomerShort')}
              </Button>
            </div>
          )}
          {errorText('customer') && <p className="text-sm text-danger">{errorText('customer')}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {chosen && (
          <p className="flex flex-col rounded-lg border border-line bg-panel px-3 py-2">
            <span className="font-semibold">{chosen.name}</span>
            {chosen.phone && <span className="text-sm text-muted">{chosen.phone}</span>}
          </p>
        )}
        {errorText('customer') && <p className="text-sm text-danger">{errorText('customer')}</p>}
        <Button variant="secondary" onClick={() => entry.setCustomer(null)}>
          {t('entry.changeCustomer')}
        </Button>
      </div>
    );
  }

  if (customer?.kind === 'new') {
    const set = (changes: Partial<typeof customer>) => entry.setCustomer({ ...customer, ...changes });
    const genders: Array<{ value: Gender; label: string }> = [
      { value: 'male', label: t('gender.male') },
      { value: 'female', label: t('gender.female') },
      { value: 'other', label: t('gender.other') },
    ];
    return (
      <div className="flex flex-col gap-3">
        <TextField
          label={t('customerForm.name')}
          value={customer.name}
          onChange={(e) => set({ name: e.target.value })}
          error={errorText('customer.name')}
          autoComplete="off"
        />
        <TextField
          label={t('customerForm.nameAlt')}
          value={customer.nameAlt}
          onChange={(e) => set({ nameAlt: e.target.value })}
          autoComplete="off"
        />
        <TextField
          label={t('customerForm.phone')}
          value={customer.phone}
          onChange={(e) => set({ phone: e.target.value })}
          error={errorText('customer.phone')}
          type="tel"
          inputMode="tel"
          autoComplete="off"
        />
        <ChoiceGroup
          legend={t('customerForm.gender')}
          value={customer.gender}
          options={genders}
          onChange={(gender) => set({ gender })}
        />
        <Button variant="secondary" onClick={() => entry.setCustomer(null)}>
          {t('entry.changeCustomer')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label={t('customers.search')}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        error={errorText('customer')}
        autoComplete="off"
      />
      {query.trim() && matches.length === 0 && <p className="text-muted">{t('customers.none')}</p>}
      {matches.length > 0 && (
        <ul className="flex flex-col gap-1">
          {matches.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                className="flex min-h-12 w-full flex-col rounded-lg border border-line bg-panel px-3 py-2 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
                onClick={() => entry.setCustomer({ kind: 'existing', customerId: match.id })}
              >
                <span className="font-semibold">{match.name}</span>
                {match.phone && <span className="text-sm text-muted">{match.phone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        data-tour="new-customer"
        onClick={() => entry.setCustomer({ kind: 'new', name: '', nameAlt: '', phone: '', gender: null })}
      >
        {t('customers.new')}
      </Button>
    </div>
  );
}
