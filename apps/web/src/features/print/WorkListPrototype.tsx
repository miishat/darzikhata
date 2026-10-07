// PROTOTYPE (throwaway): desktop layouts for the printed work list, switched with ?variant=. Never merged.
import { labelIn, shopContact, type ItemRef, type Language, type ShopConfig } from '@darzikhata/domain';
import { Fragment, type ReactNode } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { formatDate, formatNumber, translate } from '../../i18n/format';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { itemTitle } from '../common/orderText';
import type { WorkGroup, WorkQuery } from '../work/workList';

export const WORK_PAPER_VARIANTS = {
  A: 'Current paper',
  D: 'By due date: each group split into late, this week and later, with a calendar block per row',
  F: 'D, the tick box swapped for a write-in: done on (date) and initials',
  G: "D, the tick box swapped for each garment's stages as circles to fill in with a pen",
  H: 'D, the tick box swapped for two boxes to write in: got it and handed back',
  I: 'D tighter: one line a garment, the bands down the left margin, the weekday in the calendar block',
};

export function useWorkPaperVariant() {
  return useVariant(Object.keys(WORK_PAPER_VARIANTS));
}

export function WorkPaperSwitcher() {
  return <PrototypeSwitcher variants={WORK_PAPER_VARIANTS} />;
}

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

export interface WorkPaperProps {
  variant: string;
  language: Language;
  config: ShopConfig;
  query: WorkQuery;
  groups: WorkGroup[];
  heading: string;
  today: string;
  onlyToday: boolean;
}

function useText(language: Language, config: ShopConfig, query: WorkQuery) {
  const { state } = useSnapshot();
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const staffName = (id: string | null) => (id === null ? t('work.unassigned') : (config.staff.find((s) => s.id === id)?.name ?? id));
  const stageName = (r: ItemRef) => {
    const stage = r.item.stages.find((s) => s.key === r.item.stageKey);
    return stage ? labelIn(stage.label, language) : r.item.stageKey;
  };
  const groupTitle = (group: WorkGroup) =>
    query.by === 'worker' ? (group.staff?.name ?? t('work.unassigned')) : group.stage ? labelIn(group.stage.label, language) : group.key;
  /** What the other grouping says about a row: the stage when grouped by worker, else the worker. */
  const other = (r: ItemRef) => (query.by === 'worker' ? stageName(r) : staffName(r.item.assignedTo));
  const customer = (r: ItemRef) => state.customers[r.order.customerId]?.name ?? '';
  const short = (d: string | null | undefined) => (d ? formatDate(d, language, { year: false }) : '');
  const n = (v: number) => formatNumber(v, language);
  const notes = (r: ItemRef) => [r.item.designNotes, ...r.item.adjustments.map((a) => a.note)].filter(Boolean).join(' · ');
  return { t, staffName, stageName, groupTitle, other, customer, short, n, notes };
}

const late = (r: ItemRef, today: string) => Boolean(r.item.deliveryDate && r.item.deliveryDate.slice(0, 10) < today);

/** The shop and the paper's title like the receipt, then the date, filters and count between double rules. */
function MemoHeader({ language, config, query, groups, heading, today }: WorkPaperProps) {
  const x = useText(language, config, query);
  const refs = groups.flatMap((g) => g.refs);
  const lateCount = refs.filter((r) => late(r, today)).length;
  const filters = [
    query.worker !== 'all' && x.t('item.worker', { name: query.worker === 'none' ? x.t('work.unassigned') : x.staffName(query.worker) }),
    query.stage !== 'all' && x.t('item.stage', { stage: refs[0] ? x.stageName(refs[0]) : query.stage }),
  ].filter(Boolean);
  return (
    <header className="mb-6">
      <div className="text-center">
        <p className="font-display text-3xl font-bold">{shopContact(config, language).name}</p>
        <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold uppercase ${language === 'en' ? 'tracking-[0.2em]' : ''}`}>{heading}</h1>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 border-y-4 border-double border-ink py-2 text-sm">
        <p>{x.t('print.printedOn', { date: formatDate(today, language) })}</p>
        {filters.map((f) => (
          <p key={String(f)} className="font-semibold">
            {f}
          </p>
        ))}
        <p className="ml-auto">
          <b>{x.t('work.count', { n: x.n(refs.length) })}</b>
          {lateCount > 0 && <span> · {x.t('work.lateCount', { n: x.n(lateCount) })}</span>}
        </p>
      </div>
    </header>
  );
}

const Tick = ({ big = false }: { big?: boolean }) => <span aria-hidden="true" className={`inline-block shrink-0 rounded-sm border-2 border-ink ${big ? 'size-6' : 'size-4'}`} />;

function LateTag({ language }: { language: Language }) {
  return <span className="ml-1 rounded border border-ink px-1 text-[10px] font-bold uppercase">{translate(language, 'work.late')}</span>;
}

/** B: one table per group with a tick box, the garment over its wearer and customer, short dates and the notes. */
function Ledger(props: WorkPaperProps) {
  const { language, config, query, groups, today } = props;
  const x = useText(language, config, query);
  const head = 'py-1 pr-2 text-start text-xs font-semibold text-muted';
  return (
    <>
      <MemoHeader {...props} />
      {groups.map((group) => {
        const title = x.groupTitle(group);
        return (
          <section key={group.key} className="mb-7">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-1">
              <h2 className="font-display text-xl font-bold">{title}</h2>
              <span className="text-sm text-muted">{x.t('work.count', { n: x.n(group.refs.length) })}</span>
            </div>
            <table aria-label={title} className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className={`${head} w-6`}>
                    <span className="sr-only">{x.t('work.done')}</span>
                  </th>
                  <th scope="col" className={`${head} w-16`}>{x.t('orders.col.order')}</th>
                  <th scope="col" className={head}>{x.t('receipt.garment')}</th>
                  <th scope="col" className={`${head} w-24`}>{query.by === 'worker' ? x.t('work.stage') : x.t('work.worker')}</th>
                  <th scope="col" className={`${head} w-20`}>{x.t('print.trial')}</th>
                  <th scope="col" className={`${head} w-28`}>{x.t('receipt.delivery')}</th>
                  <th scope="col" className={`${head} w-[28%]`}>{x.t('work.col.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {group.refs.map((r) => (
                  <tr key={r.item.id} className="print-block border-t border-line align-top">
                    <td className="py-2 pr-2">
                      <Tick />
                    </td>
                    <td className="whitespace-nowrap py-2 pr-2 font-semibold tabular-nums">{r.order.number}</td>
                    <td className="py-2 pr-2">
                      <b>{itemTitle(r.order, r.item, language)}</b>
                      <span className="block text-xs text-muted">{[r.item.wearer, x.customer(r)].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="py-2 pr-2">{x.other(r)}</td>
                    <td className="whitespace-nowrap py-2 pr-2">{x.short(r.item.trialDate)}</td>
                    <td className={`whitespace-nowrap py-2 pr-2 ${late(r, today) ? 'font-bold' : ''}`}>
                      {x.short(r.item.deliveryDate)}
                      {late(r, today) && <LateTag language={language} />}
                    </td>
                    <td className="py-2 text-xs">
                      {x.notes(r) || <span aria-hidden="true" className="mt-3 block border-b border-dotted border-muted" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}

/** C: every group on its own page to hand to that worker, with the rows as a checklist and a sign-off at the foot. */
function Sheets(props: WorkPaperProps) {
  const { language, config, query, groups, today, heading } = props;
  const x = useText(language, config, query);
  return (
    <>
      {groups.map((group, i) => {
        const title = x.groupTitle(group);
        const lateCount = group.refs.filter((r) => late(r, today)).length;
        return (
          <section key={group.key} aria-label={title} className={`flex min-h-[269mm] flex-col print:min-h-0 ${i > 0 ? 'mt-[14mm] border-t-2 border-dashed border-line pt-[14mm] print:mt-0 print:break-before-page print:border-0 print:pt-0' : ''}`}>
            <header className="flex items-end justify-between gap-4 border-b-4 border-ink pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{heading}</p>
                <h2 className="font-display text-4xl font-bold">{title}</h2>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{shopContact(config, language).name}</p>
                <p>{x.t('print.printedOn', { date: formatDate(today, language) })}</p>
                <p>
                  <b>{x.t('work.count', { n: x.n(group.refs.length) })}</b>
                  {lateCount > 0 && <span> · {x.t('work.lateCount', { n: x.n(lateCount) })}</span>}
                </p>
              </div>
            </header>
            <ol className="m-0 list-none p-0">
              {group.refs.map((r) => (
                <li key={r.item.id} className="print-block border-b border-line py-3">
                  <div className="grid grid-cols-[auto_5rem_1fr_auto] items-center gap-4">
                    <Tick big />
                    <span className="rounded-lg border-2 border-ink py-1 text-center font-display text-lg font-bold tabular-nums">{r.order.number}</span>
                    <div>
                      <p className="font-semibold">
                        {itemTitle(r.order, r.item, language)} <span className="font-normal text-muted">· {x.other(r)}</span>
                      </p>
                      <p className="text-sm text-muted">{[r.item.wearer, x.customer(r)].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg ${late(r, today) ? 'font-bold' : 'font-semibold'}`}>
                        {x.short(r.item.deliveryDate)}
                        {late(r, today) && <LateTag language={language} />}
                      </p>
                      {r.item.trialDate && (
                        <p className="text-xs text-muted">
                          {x.t('print.trial')}: {x.short(r.item.trialDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="ml-10 mt-2 flex gap-2 text-sm">
                    <span className="text-muted">{x.t('work.col.notes')}:</span>
                    {x.notes(r) ? <span>{x.notes(r)}</span> : <span aria-hidden="true" className="flex-1 border-b border-dotted border-muted" />}
                  </p>
                </li>
              ))}
            </ol>
            <footer className="mt-auto grid grid-cols-2 gap-10 pt-12 text-sm">
              <p className="border-t-2 border-ink pt-1 text-muted">{pick(language, 'বুঝিয়ে দিলেন', 'Handed out by')}</p>
              <p className="border-t-2 border-ink pt-1 text-muted">{pick(language, 'বুঝে নিলেন', 'Received by')}</p>
            </footer>
          </section>
        );
      })}
    </>
  );
}

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type Mark = 'box' | 'writeIn' | 'stages' | 'cells';
interface DueOptions {
  mark: Mark;
  tight?: boolean;
}

const WEEKDAYS: Record<Language, string[]> = {
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const Blank = ({ label, w }: { label: string; w: string }) => (
  <span className="flex items-end gap-1 text-[10px] text-muted">
    {label}
    <span aria-hidden="true" className={`${w} border-b border-ink`} />
  </span>
);

/** What the worker marks by hand at the end of a row. */
function RowMark({ mark, r, language }: { mark: Mark; r: ItemRef; language: Language }) {
  if (mark === 'box') return <Tick />;
  if (mark === 'writeIn')
    return (
      <span className="flex flex-col gap-2 pb-0.5">
        <Blank label={pick(language, 'শেষ', 'Done')} w="w-16" />
        <Blank label={pick(language, 'সই', 'Initials')} w="w-16" />
      </span>
    );
  if (mark === 'cells')
    return (
      <span className="grid grid-cols-2 gap-1">
        <span aria-hidden="true" className="h-9 w-14 rounded border border-ink" />
        <span aria-hidden="true" className="h-9 w-14 rounded border border-ink" />
      </span>
    );
  const at = r.item.stages.findIndex((s) => s.key === r.item.stageKey);
  return (
    <span className="flex items-start gap-1.5">
      {r.item.stages.map((stage, i) => (
        <span key={stage.key} className="flex w-10 flex-col items-center gap-0.5 text-center">
          <span
            aria-hidden="true"
            className={`size-4 rounded-full border-ink ${i < at ? 'border-2 bg-ink' : i === at ? 'border-[3px]' : 'border'}`}
          />
          <span className={`text-[9px] leading-tight ${i === at ? 'font-bold' : 'text-muted'}`}>{labelIn(stage.label, language)}</span>
        </span>
      ))}
    </span>
  );
}

/** D: within each group, the garments in three bands by delivery, each row led by a calendar block. */
function ByDue(props: WorkPaperProps & { options?: DueOptions }) {
  const { mark, tight = false } = props.options ?? { mark: 'box' };
  const { language, config, query, groups, today } = props;
  const x = useText(language, config, query);
  const week = addDays(today, 7);
  const bands: Array<{ key: string; label: string; test(r: ItemRef): boolean }> = [
    { key: 'late', label: x.t('work.late'), test: (r) => late(r, today) },
    { key: 'week', label: pick(language, 'এই সপ্তাহে', 'This week'), test: (r) => !late(r, today) && Boolean(r.item.deliveryDate) && r.item.deliveryDate!.slice(0, 10) <= week },
    { key: 'later', label: pick(language, 'পরে', 'Later'), test: (r) => !late(r, today) && (!r.item.deliveryDate || r.item.deliveryDate.slice(0, 10) > week) },
  ];
  const day = (d: string) => formatNumber(Number(d.slice(8, 10)), language);
  const month = (d: string) => formatDate(d, language, { year: false }).split(' ').slice(1).join(' ');
  return (
    <>
      <MemoHeader {...props} />
      {groups.map((group) => {
        const title = x.groupTitle(group);
        const sorted = [...group.refs].sort((a, b) => (a.item.deliveryDate ?? '9').localeCompare(b.item.deliveryDate ?? '9'));
        return (
          <section key={group.key} aria-label={title} className="mb-8">
            <h2 className="mb-2 flex items-baseline justify-between border-b-2 border-ink pb-1 font-display text-xl font-bold">
              {title}
              <span className="font-sans text-sm font-normal text-muted">{x.t('work.count', { n: x.n(group.refs.length) })}</span>
            </h2>
            {mark === 'cells' && (
              <p className="flex justify-end gap-1 text-[10px] font-semibold text-muted">
                <span className="w-14 text-center">{pick(language, 'পেলাম', 'Got it')}</span>
                <span className="w-14 text-center">{pick(language, 'ফেরত দিলাম', 'Handed back')}</span>
              </p>
            )}
            {bands.map((band) => {
              const rows = sorted.filter(band.test);
              if (rows.length === 0) return null;
              if (tight)
                return (
                  <div key={band.key} className="grid grid-cols-[4.5rem_1fr] border-b-2 border-ink last:border-b-0">
                    <h3 className={`py-1.5 pr-2 text-xs font-bold ${band.key === 'late' ? 'text-ink' : 'text-muted'}`}>
                      {band.label}
                      <span className="block font-display text-2xl">{x.n(rows.length)}</span>
                    </h3>
                    <ul className="m-0 list-none border-l border-line p-0 pl-3">
                      {rows.map((r) => {
                        const due = r.item.deliveryDate;
                        const isLate = band.key === 'late';
                        return (
                          <li key={r.item.id} className="print-block grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 border-b border-line py-1 text-sm last:border-b-0">
                            <span className={`flex items-baseline gap-1 rounded border-2 border-ink px-1.5 ${isLate ? 'bg-ink text-panel' : ''}`}>
                              {due ? (
                                <>
                                  <b className="font-display">{day(due)}</b>
                                  <span className="text-[10px]">{month(due)}</span>
                                  <span className="ml-auto text-[10px] font-semibold">{WEEKDAYS[language][new Date(`${due.slice(0, 10)}T00:00:00Z`).getUTCDay()]}</span>
                                </>
                              ) : (
                                '-'
                              )}
                            </span>
                            <p className="truncate">
                              <b className="tabular-nums">{r.order.number}</b> · <b>{itemTitle(r.order, r.item, language)}</b>{' '}
                              <span className="text-muted">
                                · {[r.item.wearer || x.customer(r), x.other(r), r.item.trialDate && `${x.t('print.trial')}: ${x.short(r.item.trialDate)}`, x.notes(r)].filter(Boolean).join(' · ')}
                              </span>
                            </p>
                            <RowMark mark={mark} r={r} language={language} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              return (
                <Fragment key={band.key}>
                  <h3 className={`mt-3 mb-1 text-xs font-bold uppercase tracking-[0.15em] ${band.key === 'late' ? 'text-ink' : 'text-muted'}`}>
                    {band.label} · {x.n(rows.length)}
                  </h3>
                  <ul className="m-0 list-none p-0">
                    {rows.map((r) => {
                      const due = r.item.deliveryDate;
                      const isLate = band.key === 'late';
                      return (
                        <li key={r.item.id} className="print-block grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-line py-1.5">
                          <div className={`rounded-md border-2 border-ink text-center leading-tight ${isLate ? 'bg-ink text-panel' : ''}`}>
                            {due ? (
                              <>
                                <p className="font-display text-lg font-bold">{day(due)}</p>
                                <p className="text-[10px] font-semibold">{month(due)}</p>
                              </>
                            ) : (
                              <p className="py-2 text-xs">-</p>
                            )}
                          </div>
                          <div className="min-w-0 text-sm">
                            <p>
                              <b className="tabular-nums">{r.order.number}</b> · <b>{itemTitle(r.order, r.item, language)}</b> <span className="text-muted">· {[r.item.wearer, x.customer(r)].filter(Boolean).join(' · ')}</span>
                            </p>
                            <p className="text-xs text-muted">
                              {[x.other(r), r.item.trialDate && `${x.t('print.trial')}: ${x.short(r.item.trialDate)}`, x.notes(r)].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <RowMark mark={mark} r={r} language={language} />
                        </li>
                      );
                    })}
                  </ul>
                </Fragment>
              );
            })}
          </section>
        );
      })}
    </>
  );
}

/** E: a ticket per garment, two to a row with dashed cut lines, grouped under a full-width heading. */
function Tickets(props: WorkPaperProps) {
  const { language, config, query, groups, today } = props;
  const x = useText(language, config, query);
  return (
    <>
      <MemoHeader {...props} />
      {groups.map((group) => {
        const title = x.groupTitle(group);
        return (
          <section key={group.key} aria-label={title} className="mb-6">
            <h2 className="mb-2 flex items-baseline justify-between font-display text-xl font-bold">
              {title}
              <span className="font-sans text-sm font-normal text-muted">{x.t('work.count', { n: x.n(group.refs.length) })}</span>
            </h2>
            <div className="grid grid-cols-2 border-l-2 border-t-2 border-dashed border-muted">
              {group.refs.map((r) => (
                <article key={r.item.id} className="print-block flex flex-col gap-1 border-b-2 border-r-2 border-dashed border-muted p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl font-bold tabular-nums">{r.order.number}</p>
                    <p className={`text-right ${late(r, today) ? 'font-bold' : ''}`}>
                      <span className="block text-[10px] font-semibold uppercase text-muted">{x.t('receipt.delivery')}</span>
                      {x.short(r.item.deliveryDate) || '-'}
                      {late(r, today) && <LateTag language={language} />}
                    </p>
                  </div>
                  <p className="font-semibold">{itemTitle(r.order, r.item, language)}</p>
                  <p className="text-xs text-muted">{[r.item.wearer, x.customer(r)].filter(Boolean).join(' · ')}</p>
                  <p className="text-xs">
                    <span className="rounded border border-line px-1.5 py-0.5">{x.other(r)}</span>
                    {r.item.trialDate && (
                      <span className="ml-2 text-muted">
                        {x.t('print.trial')}: {x.short(r.item.trialDate)}
                      </span>
                    )}
                  </p>
                  {x.notes(r) ? <p className="text-xs">{x.notes(r)}</p> : null}
                  <span aria-hidden="true" className="mt-3 block border-b border-dotted border-muted" />
                  <span aria-hidden="true" className="mt-4 block border-b border-dotted border-muted" />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export function WorkPaper(props: WorkPaperProps): ReactNode {
  const empty = props.onlyToday && props.groups.length === 0 ? <p>{translate(props.language, 'print.noWorkToday')}</p> : null;
  const options: Record<string, DueOptions> = {
    D: { mark: 'box' },
    F: { mark: 'writeIn' },
    G: { mark: 'stages' },
    H: { mark: 'cells' },
    I: { mark: 'box', tight: true },
  };
  const body = <ByDue {...props} options={options[props.variant] ?? { mark: 'box' }} />;
  return (
    <>
      {body}
      {empty}
    </>
  );
}
