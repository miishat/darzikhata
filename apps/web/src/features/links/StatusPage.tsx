import { findOrderByToken, linkState, publicOrderView, shopContact, type SummaryGroup } from '@darzikhata/domain';
import { Ban, Check, PackageCheck, Phone, Scissors, type LucideIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { Loading } from '../../app/guards';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { LanguageToggle } from '../../shell/ShellParts';
import { initialsOf } from '../../ui/Avatar';
import { BOTTOM_BAR_SPACE, BottomBar } from '../../ui/BottomBar';
import { buttonClasses } from '../../ui/Button';

function Notice({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <p role="alert" className="text-lg">
        {message}
      </p>
    </main>
  );
}

// Full literal class names so Tailwind can see them.
const LOOK: Record<SummaryGroup, { icon: LucideIcon; chip: string }> = {
  unfinished: { icon: Scissors, chip: 'bg-tone-working-bg text-tone-working-fg' },
  ready: { icon: Check, chip: 'bg-tone-ready-bg text-tone-ready-fg' },
  delivered: { icon: PackageCheck, chip: 'bg-tone-done-bg text-tone-done-fg' },
  cancelled: { icon: Ban, chip: 'bg-tone-cancelled-bg text-tone-cancelled-fg' },
};

/** What a customer sees from a status link: the shop, the order number and each garment's progress. Nothing else. */
export function StatusPage() {
  const { token = '' } = useParams();
  const { t, label, date, dateTime, number, language } = useI18n();
  const { status, config, state } = useSnapshot();
  if (status === 'loading') return <Loading />;
  const order = config ? findOrderByToken(Object.values(state.orders), token) : null;
  if (!config || !order) return <Notice message={t('status.notFound')} />;
  const link = linkState(order, token, new Date().toISOString(), config.settings.linkExpiryDays);
  if (link !== 'active') return <Notice message={t(link === 'unknown' ? 'status.notFound' : 'status.expired')} />;

  const view = publicOrderView(order, shopContact(config, language));
  const counted = view.items.filter((item) => item.group !== 'cancelled');
  const ready = counted.filter((item) => item.group === 'ready' || item.group === 'delivered').length;
  const allDelivered = counted.length > 0 && counted.every((item) => item.group === 'delivered');
  const headline = allDelivered
    ? t('status.allDelivered')
    : t('status.headline', { total: number(counted.length), ready: number(ready) });
  const shopInitial = initialsOf(view.shop.name.split(/\s+/)[0] ?? '');

  return (
    <main className={`mx-auto flex min-h-dvh max-w-xl flex-col text-lg ${view.shop.phone ? BOTTOM_BAR_SPACE : ''}`}>
      <div className="flex justify-end p-3">
        <LanguageToggle />
      </div>
      <header className="rounded-b-[28px] bg-navy px-6 pt-6 pb-6 text-on-navy">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-on-navy font-display text-xl font-bold text-navy"
          >
            {shopInitial}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold">{view.shop.name}</h1>
            {view.shop.address && <p className="text-sm text-on-navy-muted">{view.shop.address}</p>}
          </div>
        </div>
        <p className="mt-6 text-sm text-on-navy-muted">{t('status.yourOrder', { number: view.orderNumber })}</p>
        <h2 className="font-display text-[28px] leading-tight font-bold">{headline}</h2>
        {counted.length > 0 && (
          <div
            role="img"
            aria-label={headline}
            className="mt-3.5 grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${counted.length}, minmax(0, 1fr))` }}
          >
            {counted.map((item, index) => (
              <span
                key={index}
                className={`h-2 rounded-full ${item.group === 'ready' || item.group === 'delivered' ? 'bg-tone-ready-dot' : 'bg-navy-raised'}`}
              />
            ))}
          </div>
        )}
      </header>

      <ul aria-label={t('status.garments')} className="m-0 flex list-none flex-col gap-2.5 p-5 pb-2">
        {view.items.map((item, index) => {
          const look = LOOK[item.group];
          const Icon = look.icon;
          return (
            <li key={index} className="flex items-start gap-3 rounded-2xl border border-line p-3.5">
              <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full ${look.chip}`}>
                <Icon size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-base font-semibold">{label(item.garmentName)}</p>
                {item.wearer && <p className="text-sm text-muted">{item.wearer}</p>}
                <p className="text-sm">
                  {item.group === 'unfinished'
                    ? t('status.state.unfinished', { stage: label(item.stageLabel) })
                    : t(`status.group.${item.group}`)}
                </p>
                {item.trialDate && <p className="text-sm text-muted">{t('item.trial', { date: date(item.trialDate) })}</p>}
                {item.deliveryDate && <p className="text-sm text-muted">{t('item.delivery', { date: date(item.deliveryDate) })}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="px-6 text-xs text-muted">
        {t('status.updated', { date: dateTime(view.lastUpdatedAt) })}. {t('status.privacy')}
      </p>

      {view.shop.phone && (
        <BottomBar tabBar={false}>
          <a href={`tel:${view.shop.phone}`} className={`${buttonClasses('primary', 'lg')} min-h-[54px]! flex-1 rounded-2xl! text-base`}>
            <Phone aria-hidden="true" size={20} />
            {t('status.call')}
          </a>
        </BottomBar>
      )}
    </main>
  );
}
