import { searchCustomers, type Gender } from '@darzikhata/domain';
import { ArrowLeftRight, CalendarDays, ClipboardList, Search, UserRound, UserRoundPlus, Wallet, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { Avatar } from '../../../ui/Avatar';
import { Button } from '../../../ui/Button';
import { ChoiceGroup } from '../../../ui/ChoiceGroup';
import { TextField } from '../../../ui/TextField';
import { useScopedState } from '../../branches/BranchScopeProvider';
import { useCan } from '../../common/hooks';
import { directoryRows } from '../../customers/directoryView';
import type { DraftErrors } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

const MATCHES = 6;

/** Matching customers under a search box, with "new customer" at the end. Picking one calls `onDone`. */
function CustomerSearch({
  entry,
  error,
  onDone,
  autoFocus = false,
  floating = false,
}: {
  entry: OrderEntry;
  error?: string | undefined;
  onDone?(): void;
  autoFocus?: boolean;
  /** Show the results over the page under the box, instead of pushing what follows down. */
  floating?: boolean;
}) {
  const { t } = useI18n();
  const { state } = useSnapshot();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => (query.trim() ? searchCustomers(Object.values(state.customers), query, MATCHES) : []), [state.customers, query]);
  return (
    <div className="relative flex flex-col gap-2">
      <label
        className={`flex min-h-11 items-center gap-2 rounded-lg border bg-panel px-3 focus-within:outline-2 focus-within:outline-focus ${error ? 'border-danger' : 'border-line'}`}
      >
        <Search aria-hidden="true" size={16} className="shrink-0 text-muted" />
        <input
          type="search"
          // Focus moves here when the change menu opens.
          autoFocus={autoFocus} // eslint-disable-line jsx-a11y/no-autofocus
          aria-label={t('customers.search')}
          placeholder={t('customers.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      {query.trim() && (
        <div className={floating ? 'absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-line bg-panel-raised p-1 shadow-xl' : ''}>
          {matches.length === 0 && <p className="px-2 py-1.5 text-sm text-muted">{t('customers.none')}</p>}
          {matches.length > 0 && (
            <ul className="flex max-h-72 flex-col overflow-auto">
              {matches.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    onClick={() => {
                      entry.setCustomer({ kind: 'existing', customerId: match.id });
                      onDone?.();
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-start hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <Avatar id={match.id} name={match.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{match.name}</span>
                    {match.phone && <span className="text-sm text-muted">{match.phone}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function newCustomer(entry: OrderEntry) {
  entry.setCustomer({ kind: 'new', name: '', nameAlt: '', phone: '', gender: null });
}

/** A fact about the chosen customer, as a small tile with a tinted icon. */
function Fact({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-1.5">
      <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon size={16} />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-display font-bold leading-tight">{value}</span>
      </span>
    </div>
  );
}

/** The chosen customer: name and phone, links to their profile and to change them, and what the shop knows about them. */
function ChosenCustomer({ entry, customerId }: { entry: OrderEntry; customerId: string }) {
  const { t, money, number, date } = useI18n();
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const can = useCan();
  const [changing, setChanging] = useState(false);
  const customer = state.customers[customerId];
  const row = useMemo(() => (customer ? directoryRows([customer], Object.values(scoped.orders))[0] : undefined), [customer, scoped.orders]);
  if (!customer || !row) return null;
  const action =
    'inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus';
  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar id={customer.id} name={customer.name} size="lg" />
        <div className="flex min-w-0 flex-col">
          <p className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-display text-lg font-bold leading-tight">{customer.name}</span>
            {customer.phone && <span className="shrink-0 text-sm text-muted">{customer.phone}</span>}
          </p>
          <div className="-ms-2 flex items-center gap-1">
            <Link to={`/app/customers/${customer.id}`} className={action}>
              <UserRound aria-hidden="true" size={15} />
              {t('entry.customerProfile', { n: number(row.orderCount) })}
            </Link>
            <div
              className="relative"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setChanging(false);
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setChanging(false);
              }}
            >
              <button type="button" aria-expanded={changing} onClick={() => setChanging((v) => !v)} className={action}>
                <ArrowLeftRight aria-hidden="true" size={15} />
                {t('entry.switchCustomer')}
              </button>
              {changing && (
                <div
                  role="group"
                  aria-label={t('entry.pickAnotherCustomer')}
                  className="absolute start-0 top-full z-30 mt-2 flex w-96 flex-col gap-2 rounded-xl border border-line bg-panel-raised p-3 shadow-xl"
                >
                  <CustomerSearch entry={entry} autoFocus onDone={() => setChanging(false)} />
                  <button
                    type="button"
                    onClick={() => {
                      newCustomer(entry);
                      setChanging(false);
                    }}
                    className="flex min-h-10 items-center gap-2 border-t border-line px-2 pt-2 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <UserRoundPlus aria-hidden="true" size={16} />
                    {t('customers.new')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="ms-auto flex flex-wrap gap-2">
        {can('money.view') && (
          <Fact icon={Wallet} label={t('entry.fact.owes')} value={money(row.owed)} tone={row.owed > 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'} />
        )}
        <Fact icon={ClipboardList} label={t('entry.fact.open')} value={number(row.openCount)} tone="bg-brand-soft text-brand-strong" />
        <Fact icon={CalendarDays} label={t('entry.fact.lastVisit')} value={row.lastVisit ? date(row.lastVisit.slice(0, 10)) : '–'} tone="bg-panel text-muted" />
      </div>
    </>
  );
}

/** A new customer's details in one row, with a way back to searching. */
function NewCustomerFields({ entry, errors }: { entry: OrderEntry; errors: DraftErrors }) {
  const { t } = useI18n();
  const errorText = useErrorText(errors);
  const customer = entry.draft.customer;
  if (customer?.kind !== 'new') return null;
  const set = (changes: Partial<typeof customer>) => entry.setCustomer({ ...customer, ...changes });
  const genders: Array<{ value: Gender; label: string }> = [
    { value: 'male', label: t('gender.male') },
    { value: 'female', label: t('gender.female') },
    { value: 'other', label: t('gender.other') },
  ];
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
      <TextField
        label={t('customerForm.name')}
        className="w-56"
        value={customer.name}
        onChange={(e) => set({ name: e.target.value })}
        error={errorText('customer.name')}
        autoComplete="off"
      />
      <TextField label={t('customerForm.nameAlt')} className="w-56" value={customer.nameAlt} onChange={(e) => set({ nameAlt: e.target.value })} autoComplete="off" />
      <TextField
        label={t('customerForm.phone')}
        className="w-44"
        value={customer.phone}
        onChange={(e) => set({ phone: e.target.value })}
        error={errorText('customer.phone')}
        type="tel"
        inputMode="tel"
        autoComplete="off"
      />
      <ChoiceGroup legend={t('customerForm.gender')} value={customer.gender} options={genders} onChange={(gender) => set({ gender })} />
      <Button variant="ghost" onClick={() => entry.setCustomer(null)}>
        <ArrowLeftRight aria-hidden="true" size={16} />
        {t('entry.changeCustomer')}
      </Button>
    </div>
  );
}

/**
 * Desktop order entry's top bar: the page title, then the customer. Before one is chosen, a search with a "new
 * customer" button; a new customer's fields in a row; or the chosen customer with what they owe and their orders.
 */
export function CustomerBar({ entry, errors, heading }: { entry: OrderEntry; errors: DraftErrors; heading: ReactNode }) {
  const { t } = useI18n();
  const errorText = useErrorText(errors);
  const customer = entry.draft.customer;
  return (
    <section aria-label={t('entry.step.customer')} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      {heading}
      <span aria-hidden="true" className="h-8 w-px bg-line" />
      {customer?.kind === 'existing' ? (
        <ChosenCustomer entry={entry} customerId={customer.customerId} />
      ) : customer?.kind === 'new' ? (
        <NewCustomerFields entry={entry} errors={errors} />
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="relative w-full max-w-xl">
            <CustomerSearch entry={entry} error={errorText('customer')} floating />
          </div>
          <Button variant="secondary" className="min-h-11" data-tour="new-customer" onClick={() => newCustomer(entry)}>
            <UserRoundPlus aria-hidden="true" size={16} />
            {t('customers.new')}
          </Button>
        </div>
      )}
    </section>
  );
}
