import type { ItemRef } from '@darzikhata/domain';
import { useEffect, useMemo, useState } from 'react';
import { Columns3, List, Printer, Search, TriangleAlert } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, buttonClasses } from '../../ui/Button';
import { SelectionBar } from '../../ui/SelectionBar';
import { ViewTabs, viewTabId } from '../../ui/ViewTabs';
import { useBranchScope } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { useShell } from '../../shell/ShellPreference';
import { BatchAssignDialog, BatchStageDialog } from './batchDialogs';
import { MobileWorkPage } from './MobileWorkPage';
import { useWorkList } from './useWorkList';
import { WorkBoard, WorkerChips, isLate } from './BoardView';
import { WorkGroupTable } from './WorkGroupTable';
import { assignees, filterWork, stageOptions } from './workList';
import { Select } from '../../ui/Select';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { itemTitle } from '../common/orderText';
import { searchWords, TOP_KEYS, TOP_VARIANTS } from './workTopBarPrototype';

type Open = { kind: 'assign' | 'stage'; refs: ItemRef[] } | null;

/** Everyone's unfinished garments for supervisors, or just your own; with batch assign and stage moves. */
function DesktopWorkPage() {
  const { t, number, label, language } = useI18n();
  const can = useCan();
  const { config, state } = useSnapshot();
  // PROTOTYPE
  const variant = useVariant(TOP_KEYS);
  const [text, setText] = useState('');
  const { branchIds } = useBranchScope();
  const { view, setView, viewer, query, setQuery, all, shown, groups } = useWorkList();
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [open, setOpen] = useState<Open>(null);

  const canAssign = can('work.assign');
  const canMove = can('work.updateStage');
  const selectable = canAssign || canMove;

  const stages = useMemo(() => (config ? stageOptions(all, config) : []), [all, config]);
  const workers = useMemo(() => {
    if (!config) return [];
    const base = assignees(config, branchIds).map((s) => ({ id: s.id, name: s.name }));
    const known = new Set(base.map((s) => s.id));
    const others = new Map<string, string>();
    for (const { item } of all) {
      const id = item.assignedTo;
      if (id && !known.has(id) && !others.has(id)) others.set(id, config.staff.find((s) => s.id === id)?.name ?? id);
    }
    return [...base, ...[...others].map(([id, name]) => ({ id, name }))];
  }, [config, branchIds, all]);

  const toggle = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const openDialog = (kind: 'assign' | 'stage') => setOpen({ kind, refs: all.filter((r) => selected.has(r.item.id)) });
  const closeDialog = (finished: boolean) => {
    setOpen(null);
    if (finished) setSelected(new Set());
  };

  const today = useToday();
  const { chipCounts, lateCounts } = useMemo(() => {
    const counts: Record<string, number> = { all: all.length, none: 0 };
    const late: Record<string, number> = { all: 0 };
    for (const ref of all) {
      const key = ref.item.assignedTo ?? 'none';
      counts[key] = (counts[key] ?? 0) + 1;
      if (isLate(ref, today)) {
        late.all! += 1;
        late[key] = (late[key] ?? 0) + 1;
      }
    }
    return { chipCounts: counts, lateCounts: late };
  }, [all, today]);
  const lateCount = lateCounts.all ?? 0;
  const boardRows = useMemo(() => filterWork(all, { ...query, stage: 'all' }), [all, query]);
  const panelId = 'work-view';

  // A garment a filter or the view has hidden must not stay selected, or the batch and the bar's count
  // would not match what is on screen.
  const visible = view === 'board' ? boardRows : shown;
  useEffect(() => {
    const ids = new Set(visible.map((r) => r.item.id));
    setSelected((prev) => (prev.size > 0 && [...prev].some((id) => !ids.has(id)) ? new Set([...prev].filter((id) => ids.has(id))) : prev));
  }, [visible]);
  // The board shows every stage, so its printout must not carry the list's stage filter.
  const printParams = new URLSearchParams(params);
  if (view === 'board') printParams.delete('stage');
  const printSearch = printParams.toString();

  // PROTOTYPE 1: the search box narrows the list.
  const needle = variant === '1' ? text.trim().toLowerCase() : '';
  const matches = (r: ItemRef) =>
    needle === '' ||
    [r.order.number, itemTitle(r.order, r.item, language), state.customers[r.order.customerId]?.name ?? ''].join(' ').toLowerCase().includes(needle);
  const shownGroups = needle === '' ? groups : groups.map((g) => ({ ...g, refs: g.refs.filter(matches) })).filter((g) => g.refs.length > 0);
  const empty = view === 'board' ? boardRows.length === 0 : shownGroups.length === 0;

  const printTo = `/print/work${printSearch ? `?${printSearch}` : ''}`;
  const title = <h1 className="font-display text-xl font-bold">{t('nav.work')}</h1>;
  const summary = (
    <p className="flex items-center gap-3 text-sm text-muted">
      <span>{t('work.inProgress', { n: number(all.length) })}</span>
      {lateCount > 0 && <span className="font-semibold text-warn-ink">{t('work.lateCount', { n: number(lateCount) })}</span>}
    </p>
  );
  const viewSwitch = (
    <ViewTabs
      segmented
      label={t('work.view')}
      views={[
        { value: 'list', label: t('work.view.list'), icon: List },
        { value: 'board', label: t('work.view.board'), icon: Columns3 },
      ]}
      value={view}
      onChange={(next) => setView(next === 'board' ? 'board' : 'list')}
      panelId={panelId}
    />
  );
  const printButton = (
    <Link to={printTo} className={`${buttonClasses('secondary')} min-h-9!`}>
      <Printer aria-hidden="true" size={16} />
      {t('work.print')}
    </Link>
  );
  const printIcon = (
    <Link
      to={printTo}
      aria-label={t('work.print')}
      title={t('work.print')}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Printer aria-hidden="true" size={16} />
    </Link>
  );
  const groupSelect =
    view === 'list' && viewer.seesAll ? (
      <Select
        label={t('work.groupBy')}
        value={query.by}
        options={[
          { value: 'worker', label: t('work.byWorker') },
          { value: 'stage', label: t('work.byStage') },
        ]}
        onChange={(by) => setQuery({ ...query, by: by === 'stage' ? 'stage' : 'worker' })}
      />
    ) : null;
  const stageSelect =
    view === 'list' ? (
      <Select
        label={t('work.stage')}
        value={query.stage}
        options={[{ value: 'all', label: t('work.allStages') }, ...stages.map((s) => ({ value: s.key, label: label(s.label) }))]}
        onChange={(stage) => setQuery({ ...query, stage })}
      />
    ) : null;
  const tiles = viewer.seesAll ? (
    <WorkerChips workers={workers} counts={chipCounts} late={lateCounts} value={query.worker} onChange={(worker) => setQuery({ ...query, worker })} />
  ) : null;
  const pill = (id: string, name: string, warn = false) => {
    const on = query.worker === id;
    const behind = lateCounts[id] ?? 0;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => setQuery({ ...query, worker: id })}
        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ring-1 ring-inset focus-visible:outline-2 focus-visible:outline-focus ${
          on ? 'bg-navy font-semibold text-on-navy ring-navy' : warn ? 'bg-warn-soft/50 text-warn-ink ring-warn-line' : 'bg-panel text-ink ring-line hover:bg-surface'
        }`}
      >
        {warn && <TriangleAlert aria-hidden="true" size={14} />}
        {name}
        <b>{number(chipCounts[id] ?? 0)}</b>
        {behind > 0 && <span className={`text-xs font-semibold ${on ? 'text-on-navy' : 'text-warn-ink'}`}>· {t('work.lateCount', { n: number(behind) })}</span>}
      </button>
    );
  };
  const pills = viewer.seesAll ? (
    <div role="group" aria-label={t('work.workerFilter')} className="flex min-w-0 flex-1 gap-2 overflow-x-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pill('all', t('work.everyone'))}
      {workers.map((w) => pill(w.id, w.name))}
      {pill('none', t('work.unassigned'), true)}
    </div>
  ) : (
    <div className="flex-1" />
  );
  const workerSelect = viewer.seesAll ? (
    <Select
      label={t('work.workerFilter')}
      value={query.worker}
      options={[
        { value: 'all', label: `${t('work.everyone')} (${number(chipCounts.all ?? 0)})` },
        ...workers.map((w) => ({ value: w.id, label: `${w.name} (${number(chipCounts[w.id] ?? 0)})` })),
        { value: 'none', label: `${t('work.unassigned')} (${number(chipCounts.none ?? 0)})` },
      ]}
      onChange={(worker) => setQuery({ ...query, worker })}
    />
  ) : null;
  const searchBox = (
    <label className="flex min-h-10 min-w-0 max-w-72 grow basis-44 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-muted focus-within:outline-2 focus-within:outline-focus">
      <Search aria-hidden="true" size={18} />
      <input
        type="search"
        aria-label={searchWords(language)}
        placeholder={searchWords(language)}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
      />
    </label>
  );
  const BAR = 'flex flex-col gap-3 border-b border-line p-4';
  const prototypeBar =
    variant === '1' ? (
      <div className={BAR}>
        {title}
        {tiles}
        <div className="flex flex-wrap items-center gap-2">
          {searchBox}
          {groupSelect}
          {stageSelect}
          <div className="ms-auto flex items-center gap-2">
            {viewSwitch}
            {printButton}
          </div>
        </div>
      </div>
    ) : variant === '2' ? (
      <div className={BAR}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {title}
          {summary}
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {groupSelect}
            {stageSelect}
            {viewSwitch}
            {printButton}
          </div>
        </div>
        {tiles}
      </div>
    ) : variant === '3' ? (
      <div className={BAR}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {title}
          {summary}
          <div className="ms-auto flex items-center gap-2">
            {viewSwitch}
            {printButton}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pills}
          {groupSelect}
          {stageSelect}
        </div>
      </div>
    ) : variant === '4' ? (
      <div className={BAR}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {title}
          {summary}
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {workerSelect}
            {groupSelect}
            {stageSelect}
            {viewSwitch}
            {printIcon}
          </div>
        </div>
      </div>
    ) : (
      <div className={BAR}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {title}
          {viewSwitch}
          {summary}
          <div className="ms-auto">{printIcon}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">{tiles}</div>
          {(groupSelect || stageSelect) && (
            <div className="flex shrink-0 flex-col gap-2">
              {groupSelect}
              {stageSelect}
            </div>
          )}
        </div>
      </div>
    );

  return (
    // One card the height of the window less the shell header (3.5rem) and the page padding (2 × 1.5rem):
    // the board's columns and the list scroll inside it, and the selection sits in its footer.
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
      <PrototypeSwitcher variants={TOP_VARIANTS} />
      {variant !== '0' ? prototypeBar : (
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-xl font-bold">{t('nav.work')}</h1>
          <p className="flex items-center gap-3 text-sm text-muted">
            <span>{t('work.inProgress', { n: number(all.length) })}</span>
            {lateCount > 0 && <span className="font-semibold text-warn-ink">{t('work.lateCount', { n: number(lateCount) })}</span>}
          </p>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <ViewTabs
              segmented
              label={t('work.view')}
              views={[
                { value: 'list', label: t('work.view.list'), icon: List },
                { value: 'board', label: t('work.view.board'), icon: Columns3 },
              ]}
              value={view}
              onChange={(next) => setView(next === 'board' ? 'board' : 'list')}
              panelId={panelId}
            />
            <Link to={`/print/work${printSearch ? `?${printSearch}` : ''}`} className={`${buttonClasses('secondary')} min-h-9!`}>
              <Printer aria-hidden="true" size={16} />
              {t('work.print')}
            </Link>
          </div>
        </div>
        {viewer.seesAll && (
          <WorkerChips workers={workers} counts={chipCounts} late={lateCounts} value={query.worker} onChange={(worker) => setQuery({ ...query, worker })} />
        )}
        {view === 'list' && (
          <div className="flex flex-wrap items-center gap-2">
            {viewer.seesAll && (
              <Select
                label={t('work.groupBy')}
                value={query.by}
                options={[
                  { value: 'worker', label: t('work.byWorker') },
                  { value: 'stage', label: t('work.byStage') },
                ]}
                onChange={(by) => setQuery({ ...query, by: by === 'stage' ? 'stage' : 'worker' })}
              />
            )}
            <Select
              label={t('work.stage')}
              value={query.stage}
              options={[{ value: 'all', label: t('work.allStages') }, ...stages.map((s) => ({ value: s.key, label: label(s.label) }))]}
              onChange={(stage) => setQuery({ ...query, stage })}
            />
          </div>
        )}
      </div>
      )}
      {/* relative: keeps absolutely placed screen-reader text inside this scroll area, so the page itself never scrolls. */}
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={viewTabId(panelId, view)}
        className={`relative min-h-0 flex-1 ${view === 'board' ? 'bg-surface/40' : 'overflow-auto'}`}
      >
        {empty ? (
          <p className="p-4 text-muted">{t('work.empty')}</p>
        ) : view === 'board' ? (
          <WorkBoard rows={boardRows} selected={selectable ? selected : null} onToggle={toggle} />
        ) : (
          shownGroups.map((group) => (
            <WorkGroupTable
              key={group.key}
              title={query.by === 'worker' ? (group.staff?.name ?? t('work.unassigned')) : group.stage ? label(group.stage.label) : group.key}
              refs={group.refs}
              by={query.by}
              selected={selectable ? selected : null}
              onToggle={toggle}
            />
          ))
        )}
      </div>
      {selectable && selected.size > 0 ? (
        <SelectionBar docked count={selected.size} onClear={() => setSelected(new Set())}>
          {canAssign && <Button onClick={() => openDialog('assign')}>{t('work.assign')}</Button>}
          {canMove && <Button onClick={() => openDialog('stage')}>{t('item.changeStage')}</Button>}
        </SelectionBar>
      ) : (
        <p className="border-t border-line px-4 py-2 text-sm text-muted">{t('work.count', { n: number(visible.length) })}</p>
      )}
      {open?.kind === 'assign' && <BatchAssignDialog refs={open.refs} onClose={closeDialog} />}
      {open?.kind === 'stage' && <BatchStageDialog refs={open.refs} onClose={closeDialog} />}
    </div>
  );
}

/** Phones get one card per garment; desktops keep the table with batch assign and stage moves. */
export function WorkPage() {
  const { kind } = useShell();
  return kind === 'mobile' ? <MobileWorkPage /> : <DesktopWorkPage />;
}
