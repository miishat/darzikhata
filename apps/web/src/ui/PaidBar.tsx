import type { Poisha } from '@darzikhata/domain';
import { useCan } from '../features/common/hooks';
import { useI18n } from '../i18n/I18nProvider';

/** How much of an order total has been paid. Money, so it needs money.view. */
export function PaidBar({ paid, total }: { paid: Poisha; total: Poisha }) {
  const { t, money } = useI18n();
  const can = useCan();
  if (!can('money.view')) return null;
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
  return (
    <div
      role="img"
      aria-label={t('ui.paidBar', { paid: money(paid), total: money(total) })}
      className="h-1.5 w-full overflow-hidden rounded-full bg-paid-track"
    >
      <div className="h-full rounded-full bg-ok" style={{ width: `${percent}%` }} />
    </div>
  );
}
