import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { useCan } from '../common/hooks';
import { DEFAULT_LIST_QUERY, type OrderListQuery, type OrderSort, type OrderStatusFilter } from './orderList';

interface Props {
  query: OrderListQuery;
  /** Called with the changed fields; the caller resets to page 1. */
  onChange(change: Partial<OrderListQuery>): void;
  onClear(): void;
}

const STATUSES: OrderStatusFilter[] = ['all', 'open', 'ready', 'overdue', 'closed'];

/** Search, status, money and sort controls, and the chips for whatever is switched on. */
export function OrderFilters({ query, onChange, onClear }: Props) {
  const { t } = useI18n();
  const can = useCan();
  const money = can('money.view');
  const sorts: OrderSort[] = money ? ['newest', 'oldest', 'delivery', 'balance'] : ['newest', 'oldest', 'delivery'];

  const chips: string[] = [];
  if (query.status !== DEFAULT_LIST_QUERY.status) chips.push(t('orders.filterStatus', { status: t(`orders.status.${query.status}`) }));
  if (query.text.trim()) chips.push(t('orders.filterText', { text: query.text.trim() }));
  if (query.dueOnly && money) chips.push(t('orders.dueOnly'));

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
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <ul aria-label={t('orders.activeFilters')} className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip} className="rounded-full border border-line bg-brand-soft px-3 py-1 text-sm text-brand-strong">
                {chip}
              </li>
            ))}
          </ul>
          <Button variant="ghost" onClick={onClear}>
            {t('orders.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
}
