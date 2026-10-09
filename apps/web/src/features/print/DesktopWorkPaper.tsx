import { labelIn, shopContact, type ItemRef, type Language, type ShopConfig } from '@darzikhata/domain';
import { formatDate, formatNumber, translate } from '../../i18n/format';
import { itemTitle } from '../common/orderText';
import type { WorkGroup, WorkQuery } from '../work/workList';

export interface DesktopWorkPaperProps {
  language: Language;
  config: ShopConfig;
  query: WorkQuery;
  groups: WorkGroup[];
  heading: string;
  today: string;
  onlyToday: boolean;
  /** Each garment's customer, for the line under the garment. */
  customerName(ref: ItemRef): string;
}

// Filled shapes must print as they look, not be dropped with the background colours.
export const INK = 'bg-ink [print-color-adjust:exact]';

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const deliveryDay = (r: ItemRef) => r.item.deliveryDate?.slice(0, 10) ?? null;

/** A work paper's three bands by delivery: late, this week and later. Garments with no delivery date go under later. */
export function deliveryBands(language: Language, today: string) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const isLate = (r: ItemRef) => (deliveryDay(r) ?? today) < today;
  const week = addDays(today, 7);
  return {
    due: deliveryDay,
    isLate,
    bands: [
      { key: 'late', label: t('work.late'), has: isLate },
      { key: 'week', label: t('print.dueWeek'), has: (r: ItemRef) => !isLate(r) && deliveryDay(r) !== null && deliveryDay(r)! <= week },
      { key: 'later', label: t('print.dueLater'), has: (r: ItemRef) => !isLate(r) && (deliveryDay(r) === null || deliveryDay(r)! > week) },
    ],
  };
}

/** The delivery date as a small calendar block, filled in when the garment is late. */
export function DateBlock({ due, late, language, className = '' }: { due: string | null | undefined; late: boolean; language: Language; className?: string }) {
  return (
    <div className={`rounded-md border-2 border-ink text-center leading-tight ${late ? `${INK} text-panel` : ''} ${className}`}>
      {due ? (
        <>
          <span className="block font-display text-lg font-bold">{formatNumber(Number(due.slice(8, 10)), language)}</span>
          <span className="block text-[10px] font-semibold">{formatDate(due, language, { year: false }).split(' ').slice(1).join(' ')}</span>
        </>
      ) : (
        <span className="block py-2 text-xs">-</span>
      )}
    </div>
  );
}

/**
 * The desktop work list on A4: the shop and the title like the receipt, then a table per group with its garments
 * in three bands by delivery (late, this week, later). Each row starts with the delivery date as a calendar block,
 * filled in when late, and ends with the garment's stages as circles: done ones filled, the current one ringed, so
 * the worker can fill in each stage with a pen as it is finished.
 */
export function DesktopWorkPaper({ language, config, query, groups, heading, today, onlyToday, customerName }: DesktopWorkPaperProps) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const n = (value: number) => formatNumber(value, language);
  const staffName = (id: string | null) => (id === null ? t('work.unassigned') : (config.staff.find((s) => s.id === id)?.name ?? id));
  const stageName = (r: ItemRef) => {
    const stage = r.item.stages.find((s) => s.key === r.item.stageKey);
    return stage ? labelIn(stage.label, language) : r.item.stageKey;
  };
  const { due, isLate, bands } = deliveryBands(language, today);

  const refs = groups.flatMap((g) => g.refs);
  const lateCount = refs.filter(isLate).length;
  const filterStage = query.stage === 'all' ? null : refs.find((r) => r.item.stageKey === query.stage);
  const filters = [
    query.worker !== 'all' && t('item.worker', { name: query.worker === 'none' ? t('work.unassigned') : staffName(query.worker) }),
    query.stage !== 'all' && t('item.stage', { stage: filterStage ? stageName(filterStage) : query.stage }),
  ].filter((f): f is string => Boolean(f));

  return (
    <>
      <header className="mb-6">
        <div className="text-center">
          <p className="font-display text-3xl font-bold">{shopContact(config, language).name}</p>
          <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>
            {heading}
          </h1>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 border-y-4 border-double border-ink py-2 text-sm">
          <p>{t('print.printedOn', { date: formatDate(today, language) })}</p>
          {filters.map((filter) => (
            <p key={filter} className="font-semibold">
              {filter}
            </p>
          ))}
          <p className="ms-auto">
            <b>{t('work.count', { n: n(refs.length) })}</b>
            {lateCount > 0 && <> · <span>{t('work.lateCount', { n: n(lateCount) })}</span></>}
          </p>
        </div>
      </header>
      {onlyToday && groups.length === 0 && <p>{t('print.noWorkToday')}</p>}
      {groups.map((group) => {
        const title =
          query.by === 'worker' ? (group.staff?.name ?? t('work.unassigned')) : group.stage ? labelIn(group.stage.label, language) : group.key;
        const sorted = [...group.refs].sort((a, b) => (due(a) ?? '9').localeCompare(due(b) ?? '9'));
        return (
          <section key={group.key} className="mb-8">
            <h2 className="mb-1 flex items-baseline justify-between border-b-2 border-ink pb-1 font-display text-xl font-bold">
              {title}
              <span className="font-sans text-sm font-normal text-muted">{t('work.count', { n: n(group.refs.length) })}</span>
            </h2>
            <table aria-label={title} className="w-full border-collapse text-sm">
              <thead className="sr-only">
                <tr>
                  <th scope="col">{t('receipt.delivery')}</th>
                  <th scope="col">{t('receipt.garment')}</th>
                  <th scope="col">{t('print.stages')}</th>
                </tr>
              </thead>
              {bands.map((band) => {
                const rows = sorted.filter(band.has);
                if (rows.length === 0) return null;
                return (
                  <tbody key={band.key}>
                    <tr>
                      <th scope="rowgroup" colSpan={3} className={`pt-3 pb-1 text-start text-xs font-bold ${band.key === 'late' ? 'text-ink' : 'text-muted'}`}>
                        {band.label} · {n(rows.length)}
                      </th>
                    </tr>
                    {rows.map((r) => (
                      <GarmentRow
                        key={r.item.id}
                        r={r}
                        late={band.key === 'late'}
                        language={language}
                        other={query.by === 'worker' ? stageName(r) : staffName(r.item.assignedTo)}
                        customer={customerName(r)}
                      />
                    ))}
                  </tbody>
                );
              })}
            </table>
          </section>
        );
      })}
    </>
  );
}

function GarmentRow({ r, late, language, other, customer }: { r: ItemRef; late: boolean; language: Language; other: string; customer: string }) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const due = r.item.deliveryDate;
  const notes = [r.item.designNotes, ...r.item.adjustments.map((a) => a.note)].filter(Boolean).join(' · ');
  const at = r.item.stages.findIndex((s) => s.key === r.item.stageKey);
  const cell = 'border-b border-line py-1.5 align-middle';
  return (
    <tr className="print-block">
      <td className={`${cell} w-14 pe-3`}>
        <DateBlock due={due} late={late} language={language} />
      </td>
      <td className={`${cell} pe-3`}>
        <p>
          <b className="tabular-nums">{r.order.number}</b> · <b>{itemTitle(r.order, r.item, language)}</b>
          <span className="text-muted"> · {[r.item.wearer, customer].filter(Boolean).join(' · ')}</span>
        </p>
        <p className="text-xs text-muted">
          {[other, r.item.trialDate && `${t('print.trial')}: ${formatDate(r.item.trialDate, language, { year: false })}`, notes].filter(Boolean).join(' · ')}
        </p>
      </td>
      <td className={`${cell} w-0`}>
        <ol aria-label={t('print.stages')} className="m-0 flex list-none items-start justify-end gap-1.5 p-0">
          {r.item.stages.map((stage, i) => (
            <li key={stage.key} className="flex w-10 flex-col items-center gap-0.5 text-center">
              <span aria-hidden="true" className={`size-4 rounded-full border-ink ${i < at ? `border-2 ${INK}` : i === at ? 'border-[3px]' : 'border'}`} />
              <span className={`text-[9px] leading-tight ${i === at ? 'font-bold' : 'text-muted'}`}>
                {labelIn(stage.label, language)}
                {i <= at && <span className="sr-only"> ({t(i < at ? 'print.stageDone' : 'print.stageNow')})</span>}
              </span>
            </li>
          ))}
        </ol>
      </td>
    </tr>
  );
}
