import { ArrowDownUp, Search } from 'lucide-react';
import { useSnapshot } from '../../data/StoreContext';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button } from '../../ui/Button';
import { ChipGroup } from '../../ui/ChipGroup';
import { Dialog } from '../../ui/Dialog';
import { FilterButton } from '../../ui/FilterButton';
import { FilterChip } from '../../ui/FilterChip';
import { useBranchScope } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';
import { type OrderListQuery, type OrderSort, type OrderStatusFilter } from './orderList';
import { viewOfQuery } from './orderViews';

interface Props {
  query: OrderListQuery;
  /** Called with the changed fields; the caller resets to page 1. */
  onChange(change: Partial<OrderListQuery>): void;
  onClear(): void;
  /** Orders per chip; the phone's chips show them. */
  counts: Record<OrderStatusFilter | 'owed', number>;
}

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

  return <DesktopFilters query={query} onChange={onChange} onClear={onClear} />;
}

const DATE_INPUT = 'min-h-9 rounded-lg border border-line bg-panel px-2 text-sm focus-visible:outline-2 focus-visible:outline-brand';

/** The laptop filter row: table search, worker and date filters, a chip for each active filter, and the sort on the right. */
function DesktopFilters({ query, onChange, onClear }: Omit<Props, 'counts'>) {
  const { t, date, label } = useI18n();
  const can = useCan();
  const money = can('money.view');
  const sorts = useSortOptions();
  const { config } = useSnapshot();
  const { allowed, choice, setChoice } = useBranchScope();
  const staff = config?.staff ?? [];
  const workerName = (id: string) => staff.find((s) => s.id === id)?.name ?? id;

  const chips: Array<{ key: string; label: string; remove(): void }> = [];
  // A tab shows the status or money filter; only what no tab can show is listed as a chip.
  if (viewOfQuery(query, money) === null) {
    const status: OrderStatusFilter = query.status;
    if (status !== 'all') chips.push({ key: 'status', label: t('orders.filterStatus', { status: t(`orders.status.${status}`) }), remove: () => onChange({ status: 'all' }) });
    if (query.dueOnly && money) chips.push({ key: 'due', label: t('orders.dueOnly'), remove: () => onChange({ dueOnly: false }) });
  }
  if (query.worker) chips.push({ key: 'worker', label: t('orders.chipWorker', { name: workerName(query.worker) }), remove: () => onChange({ worker: '' }) });
  if (query.from) chips.push({ key: 'from', label: t('orders.chipFrom', { date: date(query.from) }), remove: () => onChange({ from: '' }) });
  if (query.to) chips.push({ key: 'to', label: t('orders.chipTo', { date: date(query.to) }), remove: () => onChange({ to: '' }) });
  if (allowed.length > 1 && choice !== 'all') {
    const branch = allowed.find((b) => b.id === choice);
    if (branch) chips.push({ key: 'branch', label: t('orders.chipBranch', { name: label(branch.name) }), remove: () => setChoice('all') });
  }
  const clearable = chips.some((chip) => chip.key !== 'branch') || query.text.trim() !== '';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-10 w-72 max-w-full items-center gap-2 rounded-lg border border-line bg-panel px-3 text-muted focus-within:outline-2 focus-within:outline-brand">
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            aria-label={t('orders.search')}
            placeholder={t('orders.searchPlaceholder')}
            value={query.text}
            onChange={(event) => onChange({ text: event.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
        <FilterButton label={t('orders.filter.worker')}>
          <button
            type="button"
            aria-pressed={query.worker === ''}
            onClick={() => onChange({ worker: '' })}
            className={`rounded-lg px-3 py-2 text-start text-sm ${query.worker === '' ? 'bg-brand-soft font-semibold text-brand-strong' : 'text-ink hover:bg-surface'}`}
          >
            {t('orders.filter.anyWorker')}
          </button>
          {staff.map((person) => (
            <button
              key={person.id}
              type="button"
              aria-pressed={query.worker === person.id}
              onClick={() => onChange({ worker: person.id })}
              className={`rounded-lg px-3 py-2 text-start text-sm ${query.worker === person.id ? 'bg-brand-soft font-semibold text-brand-strong' : 'text-ink hover:bg-surface'}`}
            >
              {person.name}
            </button>
          ))}
        </FilterButton>
        <FilterButton label={t('orders.filter.dates')}>
          <label className="flex items-center justify-between gap-2 px-1 text-sm">
            {t('orders.filter.from')}
            <input type="date" value={query.from} max={query.to || undefined} onChange={(e) => onChange({ from: e.target.value })} className={DATE_INPUT} />
          </label>
          <label className="flex items-center justify-between gap-2 px-1 text-sm">
            {t('orders.filter.to')}
            <input type="date" value={query.to} min={query.from || undefined} onChange={(e) => onChange({ to: e.target.value })} className={DATE_INPUT} />
          </label>
        </FilterButton>
        {chips.length > 0 && (
          <ul aria-label={t('orders.activeFilters')} className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
            {chips.map((chip) => (
              <li key={chip.key}>
                <FilterChip label={chip.label} onRemove={chip.remove} />
              </li>
            ))}
          </ul>
        )}
        {clearable && (
          <Button variant="ghost" className="min-h-9!" onClick={onClear}>
            {t('orders.clearFilters')}
          </Button>
        )}
        <label className="ms-auto flex items-center gap-2 text-sm text-muted">
          {t('orders.sort')}
          <select
            value={query.sort}
            onChange={(e) => onChange({ sort: e.target.value as OrderSort })}
            className="min-h-9 rounded-lg border border-line bg-panel px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            {sorts.map((value) => (
              <option key={value} value={value}>
                {t(`orders.sort.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
