import { currentVersion, profileKey, type Customer } from '@darzikhata/domain';
import { CalendarDays, ClipboardList, Shirt, UsersRound, Wallet, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { NEW_HOUSEHOLD, type CustomerInput } from './customerInput';
import { directoryRows } from './directoryView';
import { useMeasurementTemplates } from './MobileMeasurements';

function Fact({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2">
      <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon size={16} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-display font-bold leading-tight">{value}</span>
      </span>
    </div>
  );
}

/**
 * Beside the desktop customer form: the profile's header as it will look with what is typed, who else is in the
 * chosen household, and for a saved customer their orders, what they owe and when each garment was last measured.
 */
export function CustomerPreview({ customer, input }: { customer: Customer | null; input: CustomerInput }) {
  const { t, money, number, date, label } = useI18n();
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const templates = useMeasurementTemplates();
  const row = useMemo(() => (customer ? directoryRows([customer], Object.values(scoped.orders))[0] : undefined), [customer, scoped.orders]);

  const household = input.householdId && input.householdId !== NEW_HOUSEHOLD ? state.households[input.householdId] : undefined;
  const householdName = input.householdId === NEW_HOUSEHOLD ? input.newHousehold.trim() : household?.label;
  const others = household ? Object.values(state.customers).filter((c) => c.householdId === household.id && c.id !== customer?.id) : [];
  const gender = input.gender ? t(`gender.${input.gender}`) : null;
  const name = input.name.trim();

  return (
    <aside
      aria-label={t('customerForm.preview')}
      className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm xl:w-[340px]"
    >
      <div className="flex flex-col items-center gap-2 border-b border-line bg-surface/60 px-5 py-6 text-center">
        <p className="text-xs font-semibold text-muted">{t('customerForm.preview')}</p>
        <Avatar id={customer?.id ?? 'new'} name={name} size="xl" />
        <p className={`font-display text-xl font-bold ${name ? '' : 'text-muted'}`}>{name || t('customerForm.previewNoName')}</p>
        {input.nameAlt.trim() && <p className="-mt-1 text-sm text-muted">{input.nameAlt.trim()}</p>}
        <p className="text-sm">{input.phone.trim() || <span className="text-muted">{t('customerForm.previewNoPhone')}</span>}</p>
        {(gender || householdName) && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {gender && <span className="rounded-full bg-panel px-2.5 py-0.5 text-xs font-semibold ring-1 ring-line">{gender}</span>}
            {householdName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
                <UsersRound aria-hidden="true" size={12} />
                {householdName}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-4">
        {others.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-muted">{t('customerForm.sameHousehold')}</p>
            <ul className="flex flex-col gap-2">
              {others.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <Avatar id={m.id} name={m.name} size="sm" />
                  <span className="truncate">{m.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {customer && row ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Fact icon={ClipboardList} label={t('customer.stat.orders')} value={number(row.orderCount)} tone="bg-brand-soft text-brand-strong" />
              <Fact icon={ClipboardList} label={t('entry.fact.open')} value={number(row.openCount)} tone="bg-brand-soft text-brand-strong" />
              {can('money.view') && (
                <Fact
                  icon={Wallet}
                  label={t('customer.stat.owed')}
                  value={money(row.owed)}
                  tone={row.owed > 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}
                />
              )}
              <Fact
                icon={CalendarDays}
                label={t('customer.stat.last')}
                value={row.lastVisit ? date(row.lastVisit.slice(0, 10)) : t('customer.stat.none')}
                tone="bg-panel text-muted"
              />
            </div>
            {hasAccess(customer) && templates.length > 0 && (
              <div className="flex flex-col">
                <p className="text-xs font-bold text-muted">{t('measure.section')}</p>
                <ul className="flex flex-col">
                  {templates.map((tpl) => {
                    const profile = state.profiles[profileKey(customer.id, tpl.id)];
                    const version = profile ? currentVersion(profile) : null;
                    return (
                      <li key={tpl.id} className="flex items-center gap-2 border-b border-dotted border-line py-2 text-sm">
                        <Shirt aria-hidden="true" size={15} className="text-muted" />
                        <span className="me-auto">{label(tpl.name)}</span>
                        <span className={version ? '' : 'text-muted'}>
                          {version ? date(version.takenAt.slice(0, 10)) : t('customerForm.notMeasured')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        ) : (
          !customer && <p className="rounded-xl bg-surface p-3 text-sm text-muted">{t('customerForm.afterSave')}</p>
        )}
      </div>
    </aside>
  );
}
