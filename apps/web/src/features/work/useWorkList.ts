import type { ItemRef } from '@darzikhata/domain';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useCurrentStaff, useSnapshot } from '../../data/StoreContext';
import { readSetting, writeSetting } from '../../lib/safeStorage';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';
import {
  filterWork,
  groupWork,
  readWorkQuery,
  workItems,
  writeWorkQuery,
  type Viewer,
  type WorkGroup,
  type WorkQuery,
} from './workList';

const NO_REFS: ItemRef[] = [];
const NO_GROUPS: WorkGroup[] = [];
const VIEW_KEY = 'dk.work.view';

export type WorkView = 'board' | 'list';

export interface WorkList {
  /** Board or list, kept in the address; the board is the default. */
  view: WorkView;
  setView(view: WorkView): void;
  viewer: Viewer;
  query: WorkQuery;
  setQuery(query: WorkQuery): void;
  all: ItemRef[];
  shown: ItemRef[];
  groups: WorkGroup[];
}

/**
 * The work list for the signed-in person: their garments within the chosen branches, the
 * filters from the URL, and the groups to show. People who only see their own garments
 * always get the by-stage view with no worker filter.
 */
export function useWorkList(): WorkList {
  const { config } = useSnapshot();
  const current = useCurrentStaff();
  const can = useCan();
  const state = useScopedState();
  const [params, setParams] = useSearchParams();

  const seesAll = can('work.view.all');
  const staffId = current?.staff.id ?? '';
  const viewer = useMemo<Viewer>(() => ({ staffId, seesAll }), [staffId, seesAll]);

  const parsed = readWorkQuery(params);
  const by = seesAll ? parsed.by : 'stage';
  const worker = seesAll ? parsed.worker : 'all';
  const { stage } = parsed;
  const query = useMemo<WorkQuery>(() => ({ by, worker, stage }), [by, worker, stage]);

  // The address wins; without one, the view last chosen on this device, and the list before any choice.
  // Only the board is written to the address (an old `view=list` still opens the list).
  const asked = params.get('view');
  const view: WorkView = asked === 'board' || asked === 'list' ? asked : readSetting(VIEW_KEY) === 'board' ? 'board' : 'list';
  const setQuery = useCallback(
    (next: WorkQuery) => {
      const written = writeWorkQuery(seesAll ? next : { ...next, by: 'stage', worker: 'all' });
      if (view === 'board') written.set('view', 'board');
      // PROTOTYPE: keep the mockup letter while filtering.
      const variant = params.get('variant');
      if (variant) written.set('variant', variant);
      setParams(written, { replace: true });
    },
    [setParams, seesAll, view, params],
  );
  const setView = useCallback(
    (next: WorkView) => {
      writeSetting(VIEW_KEY, next);
      const written = new URLSearchParams(params);
      if (next === 'board') written.set('view', 'board');
      else written.delete('view');
      setParams(written, { replace: true });
    },
    [setParams, params],
  );

  const orders = state.orders;
  const all = useMemo(() => (current ? workItems(Object.values(orders), viewer) : NO_REFS), [orders, viewer, current]);
  const shown = useMemo(() => filterWork(all, query), [all, query]);
  const groups = useMemo(() => (config ? groupWork(shown, query.by, config) : NO_GROUPS), [shown, query.by, config]);

  return { view, setView, viewer, query, setQuery, all, shown, groups };
}
