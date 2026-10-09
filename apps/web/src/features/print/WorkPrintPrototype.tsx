// PROTOTYPE (throwaway): phone layouts for the work list's print preview, behind ?variant=.
import { labelIn, shopContact, type ItemRef, type Language, type ShopConfig } from '@darzikhata/domain';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { formatDate, formatNumber, translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { itemTitle } from '../common/orderText';
import type { WorkGroup, WorkQuery } from '../work/workList';
import { DesktopWorkPaper } from './DesktopWorkPaper';

export const WORK_PRINT_VARIANTS = {
  A: 'Current',
  B: 'A4 page shrunk to fit',
  C: 'Phone cards',
  D: 'Checklist, bottom bar',
} as const;

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);
const INK = 'bg-ink [print-color-adjust:exact]';
const LANGUAGES: Array<{ language: Language; name: string }> = [
  { language: 'bn', name: 'বাংলা' },
  { language: 'en', name: 'English' },
];

export interface WorkPrintProps {
  variant: string;
  back: string;
  language: Language;
  onLanguage(language: Language): void;
  config: ShopConfig;
  query: WorkQuery;
  groups: WorkGroup[];
  heading: string;
  today: string;
  onlyToday: boolean;
  customerName(ref: ItemRef): string;
}

export function WorkPrintPrototype(props: WorkPrintProps) {
  if (props.variant === 'B') return <VariantB {...props} />;
  if (props.variant === 'C') return <VariantC {...props} />;
  return <VariantD {...props} />;
}

function LanguageToggle({ language, onLanguage }: { language: Language; onLanguage(l: Language): void }) {
  const app = useI18n();
  return (
    <div role="group" aria-label={pick(app.language, 'কাগজের ভাষা', 'Paper Language')} className="flex rounded-xl bg-line/60 p-1">
      {LANGUAGES.map((o) => {
        const on = language === o.language;
        return (
          <button
            key={o.language}
            type="button"
            aria-pressed={on}
            onClick={() => onLanguage(o.language)}
            className={`min-h-9 flex-1 rounded-lg px-3 text-sm ${on ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted'}`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

function TopBar({ back, heading, children }: { back: string; heading: string; children?: ReactNode }) {
  const app = useI18n();
  return (
    <div className="no-print sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-panel/95 px-3 py-2 backdrop-blur">
      <Link to={back} aria-label={app.t('print.backToWork')} className="grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface">
        <ArrowLeft size={22} aria-hidden="true" />
      </Link>
      <span className="min-w-0 flex-1 truncate font-display text-lg font-bold">{heading}</span>
      {children}
    </div>
  );
}

function PrintButton({ wide }: { wide?: boolean }) {
  const app = useI18n();
  return (
    <button type="button" onClick={() => window.print()} className={`${buttonClasses('primary')} ${wide ? 'flex-1' : ''}`}>
      <Printer size={18} aria-hidden="true" />
      {app.t('print.print')}
    </button>
  );
}

const A4_PX = 794;

/** B: the desktop's A4 paper, shrunk to the phone's width. What you see is the page that comes out. */
function VariantB(props: WorkPrintProps) {
  const app = useI18n();
  const [zoom, setZoom] = useState(0.4);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current!;
    const fit = () => setZoom(Math.min(1, (el.clientWidth - 24) / A4_PX));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink">
      <TopBar back={props.back} heading={props.heading}>
        <PrintButton />
      </TopBar>
      <div className="no-print flex items-center gap-3 px-3 pt-3">
        <span className="text-sm text-muted">{pick(app.language, 'কাগজের ভাষা', 'Paper Language')}</span>
        <div className="ms-auto w-48">
          <LanguageToggle language={props.language} onLanguage={props.onLanguage} />
        </div>
      </div>
      <p className="no-print px-3 pt-2 text-xs text-muted">{pick(app.language, 'A4 কাগজে যেমন আসবে। বড় করে দেখতে দুই আঙুলে টানুন।', 'As it comes out on A4. Pinch to zoom in.')}</p>
      <div ref={box} className="overflow-hidden p-3 print:overflow-visible print:p-0">
        <main
          lang={props.language}
          style={{ ['--z' as string]: zoom }}
          className="mx-auto w-[210mm] bg-panel p-[14mm] shadow-lg ring-1 ring-line [zoom:var(--z)] print:w-auto print:p-0 print:shadow-none print:ring-0 print:[zoom:1]"
        >
          <DesktopWorkPaper {...props} />
        </main>
      </div>
    </div>
  );
}

function useBands(props: WorkPrintProps) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(props.language, key, vars);
  const due = (r: ItemRef) => r.item.deliveryDate?.slice(0, 10) ?? null;
  const isLate = (r: ItemRef) => (due(r) ?? props.today) < props.today;
  const d = new Date(`${props.today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  const week = d.toISOString().slice(0, 10);
  return {
    t,
    due,
    isLate,
    bands: [
      { key: 'late', label: t('work.late'), has: isLate },
      { key: 'week', label: t('print.dueWeek'), has: (r: ItemRef) => !isLate(r) && due(r) !== null && due(r)! <= week },
      { key: 'later', label: t('print.dueLater'), has: (r: ItemRef) => !isLate(r) && (due(r) === null || due(r)! > week) },
    ],
  };
}

function groupTitle(props: WorkPrintProps, group: WorkGroup, t: (k: Parameters<typeof translate>[1]) => string) {
  return props.query.by === 'worker'
    ? (group.staff?.name ?? t('work.unassigned'))
    : group.stage
      ? labelIn(group.stage.label, props.language)
      : group.key;
}

function PaperHeader(props: WorkPrintProps & { center?: boolean }) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(props.language, key, vars);
  const n = (v: number) => formatNumber(v, props.language);
  const count = props.groups.reduce((s, g) => s + g.refs.length, 0);
  return (
    <header className="mb-4 border-b-2 border-ink pb-2">
      <p className="font-display text-xl font-bold">{shopContact(props.config, props.language).name}</p>
      <h1 className="text-base font-semibold">{props.heading}</h1>
      <p className="text-xs text-muted">
        {t('print.printedOn', { date: formatDate(props.today, props.language) })} · {t('work.count', { n: n(count) })}
      </p>
    </header>
  );
}

function DateBlock({ due, late, language }: { due: string | null | undefined; late: boolean; language: Language }) {
  return (
    <div className={`w-12 shrink-0 rounded-md border-2 border-ink text-center leading-tight ${late ? `${INK} text-panel` : ''}`}>
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

/** C: the same paper reflowed for a phone: one card per garment, with the stage circles in a row underneath. */
function VariantC(props: WorkPrintProps) {
  const { t, due, bands } = useBands(props);
  const n = (v: number) => formatNumber(v, props.language);
  const staffName = (id: string | null) => (id === null ? t('work.unassigned') : (props.config.staff.find((s) => s.id === id)?.name ?? id));
  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink">
      <TopBar back={props.back} heading={props.heading}>
        <PrintButton />
      </TopBar>
      <div className="no-print px-3 pt-3">
        <LanguageToggle language={props.language} onLanguage={props.onLanguage} />
      </div>
      <main lang={props.language} className="m-3 rounded-2xl bg-panel p-4 shadow-sm ring-1 ring-line print:m-0 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <PaperHeader {...props} />
        {props.groups.map((group) => {
          const title = groupTitle(props, group, t);
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
                    <p className={`pt-2 pb-1 text-xs font-bold ${band.key === 'late' ? 'text-ink' : 'text-muted'}`}>
                      {band.label} · {n(rows.length)}
                    </p>
                    <ul className="m-0 list-none p-0">
                      {rows.map((r) => {
                        const at = r.item.stages.findIndex((s) => s.key === r.item.stageKey);
                        const other = props.query.by === 'worker' ? labelIn(r.item.stages[at]?.label ?? { bn: '', en: '' }, props.language) : staffName(r.item.assignedTo);
                        return (
                          <li key={r.item.id} className="print-block flex gap-3 border-b border-line py-2">
                            <DateBlock due={r.item.deliveryDate} late={band.key === 'late'} language={props.language} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm">
                                <b className="tabular-nums">{r.order.number}</b> · <b>{itemTitle(r.order, r.item, props.language)}</b>
                              </p>
                              <p className="truncate text-xs text-muted">
                                {[r.item.wearer, props.customerName(r), other].filter(Boolean).join(' · ')}
                              </p>
                              <ol aria-label={t('print.stages')} className="m-0 mt-1.5 flex list-none flex-wrap gap-x-2 gap-y-1 p-0">
                                {r.item.stages.map((stage, i) => (
                                  <li key={stage.key} className="flex items-center gap-1">
                                    <span aria-hidden="true" className={`size-3 rounded-full border-ink ${i < at ? `border-2 ${INK}` : i === at ? 'border-[3px]' : 'border'}`} />
                                    <span className={`text-[10px] ${i === at ? 'font-bold' : 'text-muted'}`}>{labelIn(stage.label, props.language)}</span>
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
      </main>
    </div>
  );
}

/** D: a tick-box checklist per group, with the language and a wide Print button in a bar at the bottom. */
function VariantD(props: WorkPrintProps) {
  const app = useI18n();
  const { t, due, isLate } = useBands(props);
  const n = (v: number) => formatNumber(v, props.language);
  return (
    <div className="min-h-dvh bg-surface pb-40 text-ink">
      <TopBar back={props.back} heading={props.heading} />
      <main lang={props.language} className="m-3 rounded-2xl bg-panel p-4 shadow-sm ring-1 ring-line print:m-0 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <PaperHeader {...props} />
        {props.groups.map((group) => {
          const title = groupTitle(props, group, t);
          const sorted = [...group.refs].sort((a, b) => (due(a) ?? '9').localeCompare(due(b) ?? '9'));
          return (
            <section key={group.key} aria-label={title} className="mb-5">
              <h2 className="mb-1 rounded-md bg-ink px-2 py-1 font-display text-base font-bold text-panel [print-color-adjust:exact]">
                {title} <span className="font-sans text-xs font-normal">· {t('work.count', { n: n(group.refs.length) })}</span>
              </h2>
              <ul className="m-0 list-none p-0">
                {sorted.map((r) => {
                  const late = isLate(r);
                  const stage = r.item.stages.find((s) => s.key === r.item.stageKey);
                  return (
                    <li key={r.item.id} className="print-block flex items-start gap-3 border-b border-dashed border-line py-2">
                      <span aria-hidden="true" className="mt-0.5 size-5 shrink-0 rounded border-2 border-ink" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <b className="tabular-nums">{r.order.number}</b> · {itemTitle(r.order, r.item, props.language)}
                          {stage && <span className="text-muted"> · {labelIn(stage.label, props.language)}</span>}
                        </p>
                        <p className="truncate text-xs text-muted">{[r.item.wearer, props.customerName(r)].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className={`shrink-0 text-xs ${late ? `rounded px-1.5 py-0.5 font-bold text-panel ${INK}` : 'font-semibold'}`}>
                        {r.item.deliveryDate ? formatDate(r.item.deliveryDate, props.language, { year: false }) : '-'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>
      <div className="no-print fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2 border-t border-line bg-panel/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{pick(app.language, 'কাগজের ভাষা', 'Paper Language')}</span>
          <div className="ms-auto w-48">
            <LanguageToggle language={props.language} onLanguage={props.onLanguage} />
          </div>
        </div>
        <div className="flex">
          <PrintButton wide />
        </div>
      </div>
    </div>
  );
}
