import { useState } from 'react';
import { useParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { CustomerList } from './CustomerList';
import { CustomerProfile } from './CustomerProfile';

/** Desktop: list beside profile. Mobile: one at a time, with a way back. */
export function CustomersPage() {
  const { t } = useI18n();
  const { kind } = useShell();
  const { customerId } = useParams();
  const [query, setQuery] = useState('');
  const list = <CustomerList query={query} onQueryChange={setQuery} activeId={customerId} desktop={kind !== 'mobile'} />;

  if (kind === 'mobile') {
    return customerId ? <CustomerProfile customerId={customerId} /> : list;
  }

  return (
    <div className="flex items-start gap-6">
      <div className="sticky top-0 flex max-h-[calc(100dvh-8.5rem)] w-[300px] shrink-0 flex-col rounded-2xl border border-line bg-panel p-3">{list}</div>
      <div className="min-w-0 flex-1">
        {customerId ? <CustomerProfile customerId={customerId} /> : <p className="text-muted">{t('customers.choose')}</p>}
      </div>
    </div>
  );
}
