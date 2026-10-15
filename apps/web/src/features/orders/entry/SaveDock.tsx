import { Check, Circle } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { HIDE_TABS_FLAG } from '../../../ui/PaymentDock';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

interface Props {
  hasCustomer: boolean;
  hasGarment: boolean;
  /** The order total is above zero. */
  priced: boolean;
  saving: boolean;
  /** Saves, or, when something is missing, opens it with the reason beside it. */
  onSave(): void;
  onPickCustomer(): void;
  /** Opens what the garment tick still needs: the garment list, or the price of a garment already added. */
  onFixGarment(): void;
}

/**
 * Phone save bar at the very bottom of the screen, in place of the tab bar (which it hides while it is on screen).
 * Two ticks say what the order still needs, a customer and a priced garment, and "save order" stays grey until both are
 * ticked. A grey save still responds: saving checks the order and opens the first thing missing with the reason. A
 * garment at ৳0 passes that check, so then it opens the garment's price instead.
 */
export function SaveDock({ hasCustomer, hasGarment, priced, saving, onSave, onPickCustomer, onFixGarment }: Props) {
  const { t } = useI18n();
  const hasPricedGarment = hasGarment && priced;
  const ready = hasCustomer && hasPricedGarment;

  useEffect(() => {
    document.documentElement.dataset[HIDE_TABS_FLAG] = '1';
    return () => {
      delete document.documentElement.dataset[HIDE_TABS_FLAG];
    };
  }, []);

  const press = () => (hasCustomer && hasGarment && !priced ? onFixGarment() : onSave());

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 rounded-t-3xl border-t border-line bg-panel pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_-14px_rgba(14,22,48,0.35)]">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 gap-1">
          <Tick done={hasCustomer} label={t('entry.step.customer')} onClick={onPickCustomer} />
          <Tick done={hasPricedGarment} label={t('entry.tick.garment')} onClick={onFixGarment} />
        </div>
        <button
          type="button"
          data-tour="save-order"
          disabled={saving}
          aria-disabled={!ready || undefined}
          onClick={press}
          className={`flex h-12 shrink-0 items-center justify-center rounded-2xl bg-brand px-5 text-base font-bold text-on-brand disabled:cursor-not-allowed ${
            ready ? 'disabled:opacity-50' : 'opacity-45 saturate-50'
          } ${FOCUS}`}
        >
          {saving ? t('entry.saving') : t('entry.save')}
        </button>
      </div>
    </div>
  );
}

function Tick({ done, label, onClick }: { done: boolean; label: string; onClick(): void }) {
  const { t } = useI18n();
  const Icon = done ? Check : Circle;
  return (
    <button
      type="button"
      aria-label={`${label} · ${t(done ? 'entry.tick.done' : 'entry.tick.todo')}`}
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2.5 text-sm font-semibold ${done ? 'bg-ok-soft text-ok' : 'bg-surface text-muted'} ${FOCUS}`}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={done ? 3 : 2} />
      {label}
    </button>
  );
}
