import type { ItemRef } from '@darzikhata/domain';
import { Printer, Ruler, Search, Shirt } from 'lucide-react';
import { useRef, useState } from 'react';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { ChipGroup } from '../../ui/ChipGroup';
import { usePageSearch } from '../../shell/pageSearch';
import { searchWords, WORK_KEYS, WORK_VARIANTS } from './workHeaderPrototype';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { rovingTabsKeyDown } from '../../ui/rovingTabs';
import { DueLabel } from '../../ui/DueLabel';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { MoveOn } from '../orders/ItemCard';
import { nextMove } from '../orders/stageMoves';
import { useWorkList } from './useWorkList';
import { WORK_PHASES, phaseCounts, workPhase, type WorkPhase } from './workList';
import { MeasurementSheet } from '../customers/MeasurementSheet';

const NO_BOX = { current: null }; // PROTOTYPE: no search box to offer

function Card({ refItem, showWorker }: { refItem: ItemRef; showWorker: boolean }) {
  const { t, language, label } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [measuring, setMeasuring] = useState(false);
  const { order, item } = refItem;

  const title = itemTitle(order, item, language);
  const stage = item.stages.find((s) => s.key === item.stageKey);
  const customer = state.customers[order.customerId];
  const template = config?.templates.find((tpl) => tpl.id === item.templateId);
  const worker = item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo)?.name : undefined;
  const next = can('work.updateStage') ? nextMove(item) : null;
  const canMeasure = item.measurements !== null && template !== undefined && customer !== undefined && hasAccess(customer);
  const meta = [order.number, item.wearer, showWorker ? worker : null].filter(Boolean).join(' · ');

  return (
    <li>
      <section aria-label={`${order.number} ${title}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <Shirt size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <p className="truncate text-sm text-muted">{meta}</p>
          </div>
          {item.deliveryDate && <DueLabel date={item.deliveryDate} />}
        </div>
        {item.designNotes && <p className="rounded-xl bg-surface px-2.5 py-2 text-sm">{item.designNotes}</p>}
        <div className="flex gap-2">
          {canMeasure && (
            <Button variant="secondary" size="lg" className="shrink-0" onClick={() => setMeasuring(true)}>
              <Ruler aria-hidden="true" size={18} />
              {t('measure.section')}
              <span className="sr-only">{` ${title}`}</span>
            </Button>
          )}
          {next && (
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <MoveOn
                order={order}
                item={item}
                stageKey={next.stage.key}
                label={t('work.finishStage', { stage: stage ? label(stage.label) : item.stageKey })}
                render={({ children, ...props }) => (
                  <button
                    type="button"
                    className="flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-brand px-4 text-base font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                    {...props}
                  >
                    {children}
                  </button>
                )}
              />
            </div>
          )}
        </div>
      </section>
      {measuring && template && item.measurements && (
        <MeasurementSheet title={t('item.measureTitle', { item: title })} template={template} snapshot={item.measurements} onClose={() => setMeasuring(false)} />
      )}
    </li>
  );
}

/** The phone work list: three steps with counts, then one large card per garment with a single move-on button. */
export function MobileWorkPage() {
  const { t, number, language } = useI18n();
  const { viewer, all } = useWorkList();
  const { state } = useSnapshot();
  // PROTOTYPE
  const variant = useVariant(WORK_KEYS);
  const searchable = variant === '2' || variant === '5';
  const [text, setText] = useState('');
  const searchBox = useRef<HTMLInputElement>(null);
  usePageSearch(searchable ? searchBox : NO_BOX);
  const [params] = useSearchParams();
  const counts = phaseCounts(all);
  const [chosen, setChosen] = useState<WorkPhase | null>(null);
  const phase: WorkPhase = chosen ?? (['making', 'start', 'finish'] as const).find((p) => counts[p] > 0) ?? 'making';
  const needle = searchable ? text.trim().toLowerCase() : '';
  const refs = all.filter(
    (r) =>
      workPhase(r.item) === phase &&
      (needle === '' ||
        [r.order.number, itemTitle(r.order, r.item, language), state.customers[r.order.customerId]?.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(needle)),
  );
  const search = params.toString();
  const onKeyDown = rovingTabsKeyDown(WORK_PHASES, phase, setChosen, (p) => `work-tab-${p}`);

  const printTo = `/print/work${search ? `?${search}` : ''}`;
  const printLink = (
    <Link
      to={printTo}
      aria-label={t('work.print')}
      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Printer aria-hidden="true" size={22} />
    </Link>
  );
  const tabs = (
    <div role="tablist" aria-label={t('work.stage')} className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-2xl bg-line p-1">
      {WORK_PHASES.map((p) => {
        const active = p === phase;
        return (
          <button
            key={p}
            id={`work-tab-${p}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="work-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => setChosen(p)}
            onKeyDown={onKeyDown}
            className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-1 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
              active ? 'bg-panel font-bold text-brand-strong shadow-sm' : 'text-muted'
            }`}
          >
            {t(`work.phase.${p}`)}
            <b>{number(counts[p])}</b>
          </button>
        );
      })}
    </div>
  );
  const chips = (
    <ChipGroup
      label={t('work.stage')}
      value={phase}
      options={WORK_PHASES.map((p) => ({ value: p, label: t(`work.phase.${p}`), count: number(counts[p]) }))}
      onChange={(p) => setChosen(p as WorkPhase)}
    />
  );
  const searchRow = (
    <div className="flex items-center gap-2">
      <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-panel px-4 text-muted">
        <Search aria-hidden="true" size={20} />
        <input
          ref={searchBox}
          type="search"
          aria-label={searchWords(language)}
          placeholder={searchWords(language)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
        />
      </label>
      {printLink}
    </div>
  );
  const PIN = 'sticky top-14 z-[8] -mx-4 -mt-4 flex flex-col gap-2 bg-surface px-4 pt-3 pb-2 shadow-sm';
  const panel = (
    <div role="tabpanel" id="work-panel" aria-labelledby={`work-tab-${phase}`}>
      {refs.length === 0 ? (
        <p className="text-muted">{all.length === 0 ? t('work.empty') : t('work.phaseEmpty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {refs.map((r) => (
            <Card key={r.item.id} refItem={r} showWorker={viewer.seesAll} />
          ))}
        </ul>
      )}
    </div>
  );

  if (variant !== '0') {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="sr-only">{viewer.seesAll ? t('nav.work') : t('work.mine')}</h1>
        {variant === '1' && (
          <div className={PIN}>
            <div className="flex items-center gap-2">
              {tabs}
              {printLink}
            </div>
          </div>
        )}
        {variant === '2' && (
          <div className={PIN}>
            {searchRow}
            {tabs}
          </div>
        )}
        {variant === '3' && (
          <>
            <div className={PIN}>{tabs}</div>
            <div className="-mt-1 flex items-center justify-between gap-2 text-sm text-muted">
              {t('work.count', { n: number(all.length) })}
              <Link to={printTo} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-strong">
                <Printer aria-hidden="true" size={18} />
                {t('work.print')}
              </Link>
            </div>
          </>
        )}
        {variant === '4' && (
          <div className={PIN}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 overflow-hidden">{chips}</div>
              {printLink}
            </div>
          </div>
        )}
        {variant === '5' && (
          <div className={PIN}>
            {searchRow}
            {chips}
          </div>
        )}
        {panel}
        <PrototypeSwitcher variants={WORK_VARIANTS} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PrototypeSwitcher variants={WORK_VARIANTS} />
      <header className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] font-bold">{viewer.seesAll ? t('nav.work') : t('work.mine')}</h1>
          <p className="text-sm text-muted">{t('work.count', { n: number(all.length) })}</p>
        </div>
        <Link
          to={`/print/work${search ? `?${search}` : ''}`}
          aria-label={t('work.print')}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-panel text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Printer aria-hidden="true" size={22} />
        </Link>
      </header>

      <div role="tablist" aria-label={t('work.stage')} className="grid grid-cols-3 gap-1 rounded-2xl bg-line p-1">
        {WORK_PHASES.map((p) => {
          const active = p === phase;
          return (
            <button
              key={p}
              id={`work-tab-${p}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="work-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setChosen(p)}
              onKeyDown={onKeyDown}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 text-[15px] focus-visible:outline-2 focus-visible:outline-focus ${
                active ? 'bg-panel font-bold text-brand-strong shadow-sm' : 'text-muted'
              }`}
            >
              {t(`work.phase.${p}`)}
              <b>{number(counts[p])}</b>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="work-panel" aria-labelledby={`work-tab-${phase}`}>
        {refs.length === 0 ? (
          <p className="text-muted">{all.length === 0 ? t('work.empty') : t('work.phaseEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {refs.map((r) => (
              <Card key={r.item.id} refItem={r} showWorker={viewer.seesAll} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
