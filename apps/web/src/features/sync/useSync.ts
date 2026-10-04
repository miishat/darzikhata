import { syncStatus, type ReviewItem, type SyncStatus } from '@darzikhata/domain';
import { useMemo } from 'react';
import { useCurrentStaff, useSnapshot } from '../../data/StoreContext';
import { useScopedState } from '../branches/BranchScopeProvider';
import { canReview } from './reviewView';

/** The review items the signed-in person may settle, within the chosen branches. */
export function useVisibleReview(): ReviewItem[] {
  const { sync } = useSnapshot();
  const scoped = useScopedState();
  const role = useCurrentStaff()?.role ?? null;
  return useMemo(() => (role ? sync.review.filter((item) => canReview(item, scoped, role)) : []), [sync.review, scoped, role]);
}

/** Online, offline, syncing, or needs attention when something here waits for this person. */
export function useSyncStatus(): SyncStatus {
  const { sync } = useSnapshot();
  const review = useVisibleReview();
  return syncStatus({ online: sync.online, syncing: sync.syncing, reviewCount: review.length });
}
