import { ArrowDownUp, Search } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { ChipGroup } from '../../ui/ChipGroup';
import { Dialog } from '../../ui/Dialog';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { useCan } from '../common/hooks';
import { DEFAULT_LIST_QUERY, type OrderListQuery, type OrderSort, type OrderStatusFilter } from './orderList';

interface Props {
  query: OrderListQuery;
  /** Called with the changed fields; the caller resets to page 1. */
  onChange(change: Partial<OrderListQuery>): void;
  onClear(): void;
  /** Orders per chip; the phone's chips show them. */
  counts: Record<OrderStatusFilter | 'owed', number>;
}

const STATUSES: OrderStatusFilter[] = ['all', 'open', 'trial', 'ready', 'overdue', 'closed'];
const CHIPS = ['all', 'open', 'trial', 'ready', 'overdue', 'owed'] as const;

/** Sort choices; the largest-balance sort needs money access. */
export function useSortOptions(): OrderSort[] {
  const money = useCan()('money.view');
  return money ? ['newest', 'oldest', 'delivery', 'balance'] : ['newest', 'oldest', 'delivery'];
}

/** The phone's sort control: a small button for the page header that opens a sheet of choices. */
export function SortButton({ sort, onChange }: { sort: OrderSort; onChange(sort: OrderSort): void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const sorts = useSortOptions();
  const current = t(`orders.sort.${sort}`);
  return (
    <>
      <button
        type="button"
        aria-label={t('orders.sortCurrent', { sort: current })}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowDownUp aria-hidden="true" size={18} />
        {current}
      </button>
      <Dialog
        open={open}
        title={t('orders.sort')}
        onClose={() => setOpen(false)}
        actions={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t('common.close')}
          </Button>
        }
      >
        <ul className="flex flex-col gap-1">
          {sorts.map((value) => (
            <li key={value}>
              <button
                type="button"
                aria-pressed={value === sort}
                onClick={() => {
                  onChange(value);
                  setOpen(false);
                }}
                className={`flex min-h-11 w-full items-center rounded-xl px-3 text-start font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
                  value === sort ? 'bg-brand-soft text-brand-strong' : 'text-ink'
                }`}
              >
                {t(`orders.sort.${value}`)}
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

/** Search, status, money and sort controls, and the chips for whatever is switched on. */
export function OrderFilters({ query, onChange, onClear, counts }: Props) {
  const { t, number } = useI18n();
  const { kind } = useShell();
  const can = useCan();
  const money = can('money.view');
  const sorts = useSortOptions();

  const active: string[] = [];
  if (query.status !== DEFAULT_LIST_QUERY.status) active.push(t('orders.filterStatus', { status: t(`orders.status.${query.status}`) }));
  if (query.text.trim()) active.push(t('orders.filterText', { text: query.text.trim() }));
  if (query.dueOnly && money) active.push(t('orders.dueOnly'));

  const activeList = (list: string[]) => (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label={t('orders.activeFilters')} className="flex flex-wrap gap-2">
        {list.map((chip) => (
          <li key={chip} className="rounded-full border border-line bg-brand-soft px-3 py-1 text-sm text-brand-strong">
            {chip}
          </li>
        ))}
      </ul>
      <Button variant="ghost" onClick={onClear}>
        {t('orders.clearFilters')}
      </Button>
    </div>
  );

  if (kind === 'mobile') {
    // A phone filters by one chip at a time; Owed is the money filter and stands in for the status.
    const chips = CHIPS.filter((value) => value !== 'owed' || money);
    const selected = query.dueOnly && money ? 'owed' : query.status;
    // One chip cannot show closed orders, or money due together with a status; list those so they are not hidden.
    const hidden: string[] = [];
    const status: OrderStatusFilter = query.status;
    if (status === 'closed' || (query.dueOnly && money && status !== 'all')) {
      hidden.push(t('orders.filterStatus', { status: t(`orders.status.${status}`) }));
      if (query.dueOnly && money) hidden.push(t('orders.dueOnly'));
    }
    return (
      <div className="flex flex-col gap-2">
        <label className="flex min-h-12 items-center gap-2.5 rounded-full border border-line bg-panel px-4 text-muted">
          <Search aria-hidden="true" size={20} />
          <input
            type="search"
            aria-label={t('orders.searchLabel')}
            placeholder={t('orders.searchPlaceholder')}
            value={query.text}
            onChange={(event) => onChange({ text: event.target.value })}
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
          />
        </label>
        <ChipGroup
          label={t('orders.chips')}
          value={selected}
          options={chips.map((value) => ({ value, label: t(`orders.chip.${value}`), count: number(counts[value]) }))}
          onChange={(value) =>
            onChange(value === 'owed' ? { status: 'all', dueOnly: true } : { status: value as OrderStatusFilter, dueOnly: false })
          }
        />
        {hidden.length > 0 && activeList(hidden)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label={t('orders.search')}
          type="search"
          value={query.text}
          onChange={(event) => onChange({ text: event.target.value })}
          className="min-w-56 flex-1"
        />
        <SelectField
          label={t('orders.status')}
          value={query.status}
          options={STATUSES.map((value) => ({ value, label: t(`orders.status.${value}`) }))}
          onChange={(value) => onChange({ status: value as OrderStatusFilter })}
        />
        <SelectField
          label={t('orders.sort')}
          value={query.sort}
          options={sorts.map((value) => ({ value, label: t(`orders.sort.${value}`) }))}
          onChange={(value) => onChange({ sort: value as OrderSort })}
        />
      </div>
      {money && <Checkbox label={t('orders.dueOnly')} checked={query.dueOnly} onChange={(dueOnly) => onChange({ dueOnly })} />}
      {active.length > 0 && activeList(active)}
    </div>
  );
}
