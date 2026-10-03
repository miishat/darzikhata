import type { Capability } from '@darzikhata/domain';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useCurrentStaff, useSnapshot } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';
import { canUse, homePath } from '../shell/nav';

export function Loading() {
  const { t } = useI18n();
  return (
    <p role="status" className="p-8 text-center text-muted">
      {t('common.loading')}
    </p>
  );
}

/** Sends people to the right first screen for the saved state. */
export function Entry() {
  const { status, session } = useSnapshot();
  if (status === 'loading') return <Loading />;
  if (status === 'empty') return <Navigate to="/welcome" replace />;
  return <Navigate to={session?.staffId ? '/app' : '/sign-in'} replace />;
}

export function RequireShop({ children }: { children: ReactNode }) {
  const { status } = useSnapshot();
  if (status === 'loading') return <Loading />;
  if (status === 'empty') return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { status } = useSnapshot();
  const current = useCurrentStaff();
  if (status === 'loading') return <Loading />;
  if (status === 'empty') return <Navigate to="/welcome" replace />;
  if (!current) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

/** Shows a plain message instead of the page when the signed-in role lacks every listed capability. */
export function RequireCapability({ anyOf, children }: { anyOf: Capability[]; children: ReactNode }) {
  const { t } = useI18n();
  const current = useCurrentStaff();
  if (!current || !canUse(current.role, anyOf)) {
    return (
      <p role="alert" className="rounded-xl border border-line bg-panel p-4">
        {t('access.denied')}
      </p>
    );
  }
  return <>{children}</>;
}

export function HomeRedirect() {
  const current = useCurrentStaff();
  return <Navigate to={current ? homePath(current.role) : '/sign-in'} replace />;
}
