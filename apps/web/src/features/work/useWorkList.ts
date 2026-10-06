import type { ItemRef } from '@darzikhata/domain';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useCurrentStaff, useSnapshot } from '../../data/StoreContext';
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

  const view: WorkView = params.get('view') === 'list' ? 'list' : 'board';
  const setQuery = useCallback(
    (next: WorkQuery) => {
      const written = writeWorkQuery(seesAll ? next : { ...next, by: 'stage', worker: 'all' });
      if (view === 'list') written.set('view', 'list');
      if (params.get('variant')) written.set('variant', params.get('variant')!);
      setParams(written, { replace: true });
    },
    [setParams, seesAll, view, params],
  );
  const setView = useCallback(
    (next: WorkView) => {
      const written = new URLSearchParams(params);
      if (next === 'list') written.set('view', 'list');
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
