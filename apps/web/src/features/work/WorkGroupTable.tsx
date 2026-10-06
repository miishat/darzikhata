import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { itemTitle } from '../common/orderText';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { useSnapshot } from '../../data/StoreContext';
import { useToday } from '../common/hooks';
import { isLate } from './BoardView';
import { itemSummaryGroup, type ItemRef } from '@darzikhata/domain';
import type { WorkGrouping } from './workList';

interface Props {
  title: string;
  refs: ItemRef[];
  by: WorkGrouping;
  /** Item ids currently selected, or null when the person cannot act on garments. */
  selected: ReadonlySet<string> | null;
  onToggle(ids: string[], on: boolean): void;
}

/**
 * One group's garments as a table named by the group's title, laid flat inside the work card. The title
 * stays at the top of the card while its rows scroll past. Clicking a row ticks it. No money is shown.
 */
export function WorkGroupTable({ title, refs, by, selected, onToggle }: Props) {
  const { t, language, date, label, number } = useI18n();
  const { config } = useSnapshot();
  const today = useToday();
  const head = 'whitespace-nowrap px-3 py-2 text-start text-sm font-semibold text-muted';
  const ids = refs.map((r) => r.item.id);
  const allOn = selected !== null && ids.every((id) => selected.has(id));
  const staffName = (id: string | null) => (id === null ? t('work.unassigned') : (config?.staff.find((s) => s.id === id)?.name ?? id));
  const stagePill = (r: ItemRef) => {
    const index = r.item.stages.findIndex((s) => s.key === r.item.stageKey);
    const stage = r.item.stages[index];
    return <StagePill label={stage ? label(stage.label) : r.item.stageKey} tone={stageTone(stage, itemSummaryGroup(r.item), Math.max(index, 0))} />;
  };

  return (
    <section aria-label={title}>
      <h2 className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface px-3 py-1.5 font-semibold">
        {title}
        <span className="rounded-full bg-panel px-2 text-xs font-normal text-muted">{number(refs.length)}</span>
      </h2>
      <div className="overflow-x-auto">
        <table aria-label={title} className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              {selected && (
                <th scope="col" className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={t('work.selectGroup', { group: title })}
                    checked={allOn}
                    onChange={(event) => onToggle(ids, event.target.checked)}
                    className="size-5 accent-brand"
                  />
                </th>
              )}
              <th scope="col" className={head}>{t('orders.col.order')}</th>
              <th scope="col" className={head}>{t('receipt.garment')}</th>
              <th scope="col" className={head}>{t('receipt.wearer')}</th>
              <th scope="col" className={head}>{by === 'worker' ? t('work.stage') : t('work.worker')}</th>
              <th scope="col" className={head}>{t('receipt.delivery')}</th>
            </tr>
          </thead>
          <tbody>
            {refs.map((r) => {
              const name = itemTitle(r.order, r.item, language);
              const due = r.item.deliveryDate;
              const on = selected?.has(r.item.id) ?? false;
              return (
                <tr
                  key={r.item.id}
                  onClick={selected ? () => onToggle([r.item.id], !on) : undefined}
                  className={`border-b border-line ${selected ? 'cursor-pointer' : ''} ${on ? 'bg-brand-soft' : isLate(r, today) ? 'bg-warn-soft/40 hover:bg-surface' : 'hover:bg-surface'}`}
                >
                  {selected && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={t('work.select', { item: `${r.order.number} ${name}` })}
                        checked={on}
                        onChange={(event) => onToggle([r.item.id], event.target.checked)}
                        onClick={(event) => event.stopPropagation()}
                        className="size-5 accent-brand"
                      />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">
                    <Link to={`/app/orders/${r.order.id}`} onClick={(event) => event.stopPropagation()} className="text-brand-strong underline focus-visible:outline-2 focus-visible:outline-focus">
                      {r.order.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2">{r.item.wearer}</td>
                  <td className="px-3 py-2 text-sm">{by === 'worker' ? stagePill(r) : staffName(r.item.assignedTo)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                    {due && (
                      <span className="inline-flex items-center gap-2">
                        {date(due)}
                        <DueLabel date={due} />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
