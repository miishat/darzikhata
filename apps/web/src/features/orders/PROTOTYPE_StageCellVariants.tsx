// PROTOTYPE (throwaway): variants of the "Garments and stage" cell in the desktop orders table.
// Switch with ?variant=A|B|C|D on /app/orders. A is the current layout.
import { itemSummaryGroup, type Order } from '@darzikhata/domain';
import { useI18n } from '../../i18n/I18nProvider';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { itemTitle } from '../common/orderText';

type Item = Order['items'][number];
const MAX = 3;

function usePill() {
  const { label } = useI18n();
  return (item: Item) => {
    const index = item.stages.findIndex((s) => s.key === item.stageKey);
    const stage = item.stages[index];
    return <StagePill label={stage ? label(stage.label) : item.stageKey} tone={stageTone(stage, itemSummaryGroup(item), Math.max(index, 0))} />;
  };
}

/** A: current. Wrapping pills. */
export function CellA({ order, live }: { order: Order; live: Item[] }) {
  const { t, language, number } = useI18n();
  const pill = usePill();
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
      {live.slice(0, MAX).map((item) => (
        <li key={item.id} className="flex items-center gap-1.5 text-sm">
          <span className="text-muted">{itemTitle(order, item, language)}</span>
          {pill(item)}
        </li>
      ))}
      {live.length > MAX && <li className="text-sm text-muted">{t('orders.moreGarments', { n: number(live.length - MAX) })}</li>}
    </ul>
  );
}

/** B: one garment per line, garment name left, stage pill in an aligned column. */
export function CellB({ order, live }: { order: Order; live: Item[] }) {
  const { t, language, number } = useI18n();
  const pill = usePill();
  return (
    <ul className="m-0 grid min-w-[14rem] list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 p-0">
      {live.slice(0, MAX).map((item) => (
        <li key={item.id} className="col-span-2 grid grid-cols-subgrid items-center text-sm">
          <span className="truncate text-ink">{itemTitle(order, item, language)}</span>
          <span className="justify-self-start">{pill(item)}</span>
        </li>
      ))}
      {live.length > MAX && <li className="col-span-2 text-sm text-muted">{t('orders.moreGarments', { n: number(live.length - MAX) })}</li>}
    </ul>
  );
}

/** C: grouped by stage. One pill per stage, the garments in it listed after. */
export function CellC({ order, live }: { order: Order; live: Item[] }) {
  const { language } = useI18n();
  const pill = usePill();
  const groups: { key: string; first: Item; titles: string[] }[] = [];
  for (const item of live) {
    const group = groups.find((g) => g.key === item.stageKey);
    const title = itemTitle(order, item, language);
    if (group) group.titles.push(title);
    else groups.push({ key: item.stageKey, first: item, titles: [title] });
  }
  return (
    <ul className="m-0 flex list-none flex-col items-start gap-1 p-0">
      {groups.map((g) => (
        <li key={g.key} className="flex items-baseline gap-2 text-sm">
          {pill(g.first)}
          <span className="text-muted">{g.titles.join(', ')}</span>
        </li>
      ))}
    </ul>
  );
}

/** D: compact. Garment count, a segmented progress bar, and the furthest-behind stage. */
export function CellD({ order, live }: { order: Order; live: Item[] }) {
  const { number, label, language } = useI18n();
  const pill = usePill();
  if (live.length === 0) return <span className="text-muted">-</span>;
  const progress = (item: Item) => {
    const index = item.stages.findIndex((s) => s.key === item.stageKey);
    return item.stages.length > 1 ? Math.max(index, 0) / (item.stages.length - 1) : 1;
  };
  const behind = live.reduce((a, b) => (progress(b) < progress(a) ? b : a));
  const stage = behind.stages.find((s) => s.key === behind.stageKey);
  return (
    <div className="flex min-w-[12rem] flex-col gap-1.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">{number(live.length)}</span>
        <span className="truncate text-muted" title={live.map((i) => itemTitle(order, i, language)).join(', ')}>
          {live.slice(0, 2).map((i) => itemTitle(order, i, language)).join(', ')}
          {live.length > 2 ? '…' : ''}
        </span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {live.map((item) => (
          <span key={item.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <span className="block h-full bg-brand" style={{ width: `${Math.round(progress(item) * 100)}%` }} />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {pill(behind)}
        {stage && live.length > 1 && <span className="sr-only">{label(stage.label)}</span>}
      </div>
    </div>
  );
}

export const CELL_VARIANTS = {
  A: { name: 'Wrapping pills (current)', Cell: CellA },
  B: { name: 'One garment per line', Cell: CellB },
  C: { name: 'Grouped by stage', Cell: CellC },
  D: { name: 'Compact progress bars', Cell: CellD },
} as const;
export type CellVariant = keyof typeof CELL_VARIANTS;
