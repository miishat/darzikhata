import type { ItemRef } from '@darzikhata/domain';
import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, buttonClasses } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { SelectionBar } from '../../ui/SelectionBar';
import { ViewTabs, viewTabId } from '../../ui/ViewTabs';
import { useBranchScope } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { useShell } from '../../shell/ShellPreference';
import { BatchAssignDialog, BatchStageDialog } from './batchDialogs';
import { MobileWorkPage } from './MobileWorkPage';
import { useWorkList } from './useWorkList';
import { WorkBoard, WorkerChips } from './BoardView';
import { WorkGroupTable } from './WorkGroupTable';
import { assignees, filterWork, stageOptions } from './workList';

type Open = { kind: 'assign' | 'stage'; refs: ItemRef[] } | null;

/** Everyone's unfinished garments for supervisors, or just your own; with batch assign and stage moves. */
function DesktopWorkPage() {
  const { t, number, label } = useI18n();
  const can = useCan();
  const { config } = useSnapshot();
  const { branchIds } = useBranchScope();
  const { view, setView, viewer, query, setQuery, all, shown, groups } = useWorkList();
  const [params] = useSearchParams();
  const search = params.toString();
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
  const lateCount = all.filter((r) => r.item.deliveryDate !== null && r.item.deliveryDate < today).length;
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { all: all.length, none: 0 };
    for (const { item } of all) {
      const key = item.assignedTo ?? 'none';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [all]);
  const boardRows = useMemo(() => filterWork(all, { ...query, stage: 'all' }), [all, query]);
  const panelId = 'work-view';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-xl font-semibold">{t('nav.work')}</h1>
          <p className="flex items-center gap-3 text-sm text-muted">
            <span>{t('work.inProgress', { n: number(all.length) })}</span>
            {lateCount > 0 && <span className="font-semibold text-warn-ink">{t('work.lateCount', { n: number(lateCount) })}</span>}
          </p>
        </div>
        <Link to={`/print/work${search ? `?${search}` : ''}`} className={buttonClasses('secondary')}>
          <Printer aria-hidden="true" size={16} />
          {t('work.print')}
        </Link>
      </div>
      <ViewTabs
        label={t('work.view')}
        views={[
          { value: 'board', label: t('work.view.board') },
          { value: 'list', label: t('work.view.list') },
        ]}
        value={view}
        onChange={(next) => setView(next === 'list' ? 'list' : 'board')}
        panelId={panelId}
      />
      {viewer.seesAll && (
        <WorkerChips workers={workers} counts={chipCounts} value={query.worker} onChange={(worker) => setQuery({ ...query, worker })} />
      )}
      {view === 'list' && (
        <div className="flex flex-wrap items-end gap-3">
          {viewer.seesAll && (
            <SelectField
              label={t('work.groupBy')}
              value={query.by}
              options={[
                { value: 'worker', label: t('work.byWorker') },
                { value: 'stage', label: t('work.byStage') },
              ]}
              onChange={(by) => setQuery({ ...query, by: by === 'stage' ? 'stage' : 'worker' })}
            />
          )}
          <SelectField
            label={t('work.stage')}
            value={query.stage}
            options={[{ value: 'all', label: t('work.allStages') }, ...stages.map((s) => ({ value: s.key, label: label(s.label) }))]}
            onChange={(stage) => setQuery({ ...query, stage })}
          />
        </div>
      )}
      <div role="tabpanel" id={panelId} aria-labelledby={viewTabId(panelId, view)} className="flex flex-col gap-3">
        {view === 'list' && <p className="text-sm text-muted">{t('work.count', { n: number(shown.length) })}</p>}
        {(view === 'board' ? boardRows.length === 0 : groups.length === 0) ? (
          <p className="text-muted">{t('work.empty')}</p>
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
      {selectable && (
        <SelectionBar count={selected.size} onClear={() => setSelected(new Set())}>
          {canAssign && <Button onClick={() => openDialog('assign')}>{t('work.assign')}</Button>}
          {canMove && <Button onClick={() => openDialog('stage')}>{t('item.changeStage')}</Button>}
        </SelectionBar>
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
