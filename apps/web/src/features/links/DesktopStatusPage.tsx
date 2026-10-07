import type { PublicOrderView, SummaryGroup } from '@darzikhata/domain';
import { Check, Phone } from 'lucide-react';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { LanguageToggle } from '../../shell/ShellParts';
import { initialsOf } from '../../ui/Avatar';
import { buttonClasses } from '../../ui/Button';

type Item = PublicOrderView['items'][number];

const STEPS: MessageKey[] = ['status.step.making', 'status.step.ready', 'status.step.delivered'];

/** How far along the three steps a garment is; a cancelled garment has no step. */
const stepOf = (group: SummaryGroup) => (group === 'delivered' ? 2 : group === 'ready' ? 1 : group === 'unfinished' ? 0 : -1);

function StepDot({ step, at }: { step: number; at: number }) {
  const done = step < at || (step === at && at > 0);
  return (
    <span
      aria-hidden="true"
      className={`relative flex size-6 shrink-0 items-center justify-center rounded-full ${step <= at ? 'bg-tone-ready-dot text-white' : 'bg-line text-muted'} ${
        step === at ? 'ring-4 ring-tone-ready-bg' : ''
      }`}
    >
      {done ? <Check size={14} /> : <span className="size-2 rounded-full bg-current" />}
    </span>
  );
}

/**
 * The desktop status page: a navy banner with the shop, Call and language, then the order's headline and one bar per
 * garment, then each garment as a card whose steps (making, ready, delivered) run top to bottom with their dates.
 */
export function DesktopStatusPage({ view, headline }: { view: PublicOrderView; headline: string }) {
  const { t, label, date, dateTime } = useI18n();
  const counted = view.items.filter((item) => item.group !== 'cancelled');
  const stateText = (item: Item) =>
    item.group === 'unfinished' ? t('status.state.unfinished', { stage: label(item.stageLabel) }) : t(`status.group.${item.group}`);
  const stepDate = (item: Item, step: number) =>
    step === 0 && item.trialDate ? t('item.trial', { date: date(item.trialDate) }) : step === 2 && item.deliveryDate ? date(item.deliveryDate) : null;

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="bg-navy text-on-navy">
        <div className="mx-auto max-w-5xl px-8 pt-6 pb-10">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-on-navy font-display text-xl font-bold text-navy">
              {initialsOf(view.shop.name.split(/\s+/)[0] ?? '')}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold">{view.shop.name}</h1>
              {view.shop.address && <p className="text-sm text-on-navy-muted">{view.shop.address}</p>}
            </div>
            {view.shop.phone && (
              <a href={`tel:${view.shop.phone}`} className={`${buttonClasses('primary')} rounded-xl! bg-on-navy! text-navy!`}>
                <Phone aria-hidden="true" size={18} />
                {t('status.call')}
              </a>
            )}
            <LanguageToggle onDark />
          </div>
          <p className="mt-10 text-sm text-on-navy-muted">{t('status.yourOrder', { number: view.orderNumber })}</p>
          <h2 className="mb-4 font-display text-4xl leading-tight font-bold">{headline}</h2>
          {counted.length > 0 && (
            <div role="img" aria-label={headline} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${counted.length}, minmax(0, 1fr))` }}>
              {counted.map((item, index) => (
                <span key={index} className={`h-2 rounded-full ${item.group === 'ready' || item.group === 'delivered' ? 'bg-tone-ready-dot' : 'bg-navy-raised'}`} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-5xl px-8 pb-10">
        <ul aria-label={t('status.garments')} className="grid grid-cols-3 gap-3">
          {view.items.map((item, index) => {
            const at = stepOf(item.group);
            return (
              <li key={index} className="rounded-2xl bg-panel p-5 shadow-sm ring-1 ring-line">
                <p className="text-lg font-semibold">{label(item.garmentName)}</p>
                <p className="text-sm text-muted">{item.wearer ?? stateText(item)}</p>
                {at < 0 ? (
                  <p className="mt-4 font-semibold text-muted">{t('status.group.cancelled')}</p>
                ) : (
                  <ol aria-label={stateText(item)} className="mt-4">
                    {STEPS.map((key, step) => {
                      const when = stepDate(item, step);
                      return (
                        <li key={key} aria-current={step === at ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
                          {step < 2 && (
                            <span aria-hidden="true" className={`absolute top-6 left-3 h-full w-0.5 -translate-x-1/2 ${step < at ? 'bg-tone-ready-dot' : 'bg-line'}`} />
                          )}
                          <StepDot step={step} at={at} />
                          <div className="text-sm">
                            <p className={step === at ? 'font-semibold' : 'text-muted'}>{step === 0 && at === 0 ? stateText(item) : t(key)}</p>
                            {when && <p className="text-xs text-muted">{when}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-center text-sm text-muted">
          {t('status.updated', { date: dateTime(view.lastUpdatedAt) })}. {t('status.privacy')}
        </p>
      </main>
    </div>
  );
}
