import type { ItemRef } from '@darzikhata/domain';
import { useEffect, useMemo, useState } from 'react';
import { Columns3, List, Printer } from 'lucide-react';
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

type Open = { kind: 'assign' | 'stage'; refs: ItemRef[] } | null;

/** Everyone's unfinished garments for supervisors, or just your own; with batch assign and stage moves. */
function DesktopWorkPage() {
  const { t, number, label } = useI18n();
  const can = useCan();
  const { config } = useSnapshot();
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

  const empty = view === 'board' ? boardRows.length === 0 : groups.length === 0;

  return (
    // One card the height of the window less the shell header (3.5rem) and the page padding (2 × 1.5rem):
    // the board's columns and the list scroll inside it, and the selection sits in its footer.
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
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
          groups.map((group) => (
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
