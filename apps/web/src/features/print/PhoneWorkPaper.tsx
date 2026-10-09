import { labelIn, shopContact, type ItemRef } from '@darzikhata/domain';
import { formatDate, formatNumber, translate } from '../../i18n/format';
import { itemTitle } from '../common/orderText';
import { DateBlock, deliveryBands, INK, type DesktopWorkPaperProps } from './DesktopWorkPaper';

/**
 * The work list on a phone: the shop, the title and the filters, then each group's garments in the same bands by
 * delivery as the desktop paper. Each garment is one card: its delivery date as a calendar block, the order and
 * garment, who wears it, and its stages as a row of circles underneath (done ones filled, the current one ringed).
 */
export function PhoneWorkPaper({ language, config, query, groups, heading, today, onlyToday, customerName }: DesktopWorkPaperProps) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const n = (value: number) => formatNumber(value, language);
  const staffName = (id: string | null) => (id === null ? t('work.unassigned') : (config.staff.find((s) => s.id === id)?.name ?? id));
  const stageName = (r: ItemRef) => {
    const stage = r.item.stages.find((s) => s.key === r.item.stageKey);
    return stage ? labelIn(stage.label, language) : r.item.stageKey;
  };
  const { due, bands } = deliveryBands(language, today);
  const refs = groups.flatMap((g) => g.refs);
  const filterStage = query.stage === 'all' ? null : refs.find((r) => r.item.stageKey === query.stage);
  const filters = [
    query.worker !== 'all' && t('item.worker', { name: query.worker === 'none' ? t('work.unassigned') : staffName(query.worker) }),
    query.stage !== 'all' && t('item.stage', { stage: filterStage ? stageName(filterStage) : query.stage }),
  ].filter((f): f is string => Boolean(f));

  return (
    <>
      <header className="mb-4 border-b-2 border-ink pb-2">
        <p className="font-display text-xl font-bold">{shopContact(config, language).name}</p>
        <h1 className="text-base font-semibold">{heading}</h1>
        <p className="text-xs text-muted">
          {t('print.printedOn', { date: formatDate(today, language) })} · {t('work.count', { n: n(refs.length) })}
        </p>
        {filters.map((filter) => (
          <p key={filter} className="text-xs font-semibold">
            {filter}
          </p>
        ))}
      </header>
      {onlyToday && groups.length === 0 && <p>{t('print.noWorkToday')}</p>}
      {groups.map((group) => {
        const title =
          query.by === 'worker' ? (group.staff?.name ?? t('work.unassigned')) : group.stage ? labelIn(group.stage.label, language) : group.key;
        const sorted = [...group.refs].sort((a, b) => (due(a) ?? '9').localeCompare(due(b) ?? '9'));
        return (
          <section key={group.key} aria-label={title} className="mb-5">
            <h2 className="flex items-baseline justify-between border-b border-ink pb-1 font-display text-lg font-bold">
              {title}
              <span className="font-sans text-xs font-normal text-muted">{t('work.count', { n: n(group.refs.length) })}</span>
            </h2>
            {bands.map((band) => {
              const rows = sorted.filter(band.has);
              if (rows.length === 0) return null;
              return (
                <div key={band.key}>
                  <h3 className={`pt-2 pb-1 text-xs font-bold ${band.key === 'late' ? 'text-ink' : 'text-muted'}`}>
                    {band.label} · {n(rows.length)}
                  </h3>
                  <ul className="m-0 list-none p-0">
                    {rows.map((r) => {
                      const at = r.item.stages.findIndex((s) => s.key === r.item.stageKey);
                      const other = query.by === 'worker' ? stageName(r) : staffName(r.item.assignedTo);
                      const notes = [r.item.designNotes, ...r.item.adjustments.map((a) => a.note)].filter(Boolean).join(' · ');
                      return (
                        <li key={r.item.id} className="print-block flex gap-3 border-b border-line py-2">
                          <DateBlock due={r.item.deliveryDate} late={band.key === 'late'} language={language} className="w-12 shrink-0 self-start" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">
                              <b className="tabular-nums">{r.order.number}</b> · <b>{itemTitle(r.order, r.item, language)}</b>
                            </p>
                            <p className="text-xs text-muted">
                              {[
                                r.item.wearer,
                                customerName(r),
                                other,
                                r.item.trialDate && `${t('print.trial')}: ${formatDate(r.item.trialDate, language, { year: false })}`,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            {notes && <p className="text-xs text-muted">{notes}</p>}
                            <ol aria-label={t('print.stages')} className="m-0 mt-1.5 flex list-none flex-wrap gap-x-2 gap-y-1 p-0">
                              {r.item.stages.map((stage, i) => (
                                <li key={stage.key} className="flex items-center gap-1">
                                  <span
                                    aria-hidden="true"
                                    className={`size-3 rounded-full border-ink ${i < at ? `border-2 ${INK}` : i === at ? 'border-[3px]' : 'border'}`}
                                  />
                                  <span className={`text-[10px] ${i === at ? 'font-bold' : 'text-muted'}`}>
                                    {labelIn(stage.label, language)}
                                    {i <= at && <span className="sr-only"> ({t(i < at ? 'print.stageDone' : 'print.stageNow')})</span>}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
