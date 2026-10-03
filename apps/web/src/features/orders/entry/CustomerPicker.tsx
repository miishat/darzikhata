import { searchCustomers, type Gender } from '@darzikhata/domain';
import { useMemo, useState } from 'react';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../../ui/Button';
import { ChoiceGroup } from '../../../ui/ChoiceGroup';
import { TextField } from '../../../ui/TextField';
import type { DraftErrors } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

const MATCHES = 8;

/** Choose an existing customer by search, or type a new one. */
export function CustomerPicker({ entry, errors }: { entry: OrderEntry; errors: DraftErrors }) {
  const { t } = useI18n();
  const { state } = useSnapshot();
  const [query, setQuery] = useState('');
  const errorText = useErrorText(errors);
  const customer = entry.draft.customer;

  const matches = useMemo(
    () => (query.trim() ? searchCustomers(Object.values(state.customers), query, MATCHES) : []),
    [state.customers, query],
  );

  if (customer?.kind === 'existing') {
    const chosen = state.customers[customer.customerId];
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
        onClick={() => entry.setCustomer({ kind: 'new', name: '', nameAlt: '', phone: '', gender: null })}
      >
        {t('customers.new')}
      </Button>
    </div>
  );
}
