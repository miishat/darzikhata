import { findOrderByToken, linkState, publicOrderView, shopContact } from '@darzikhata/domain';
import { useParams } from 'react-router';
import { Loading } from '../../app/guards';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { LanguageToggle } from '../../shell/ShellParts';

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

/** What a customer sees from a status link: the shop, the order number and each garment's progress. Nothing else. */
export function StatusPage() {
  const { token = '' } = useParams();
  const { t, label, date, language } = useI18n();
  const { status, config, state } = useSnapshot();
  if (status === 'loading') return <Loading />;
  const order = config ? findOrderByToken(Object.values(state.orders), token) : null;
  if (!config || !order) return <Notice message={t('status.notFound')} />;
  const link = linkState(order, token, new Date().toISOString(), config.settings.linkExpiryDays);
  if (link !== 'active') return <Notice message={t(link === 'unknown' ? 'status.notFound' : 'status.expired')} />;

  const view = publicOrderView(order, shopContact(config, language));
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 p-4 text-lg">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{view.shop.name}</h1>
        {view.shop.phone && (
          <p>
            <a href={`tel:${view.shop.phone}`} className="underline">
              {t('status.phone', { phone: view.shop.phone })}
            </a>
          </p>
        )}
        {view.shop.address && <p className="text-muted">{view.shop.address}</p>}
      </header>
      <section className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{t('receipt.orderNumber', { number: view.orderNumber })}</h2>
        <p className="text-base text-muted">{t('status.updated', { date: date(view.lastUpdatedAt) })}</p>
      </section>
      <ul aria-label={t('status.garments')} className="flex flex-col gap-3">
        {view.items.map((item, index) => (
          <li key={index} className="flex flex-col gap-1 rounded-lg border border-line p-3">
            <p className="font-semibold">{label(item.garmentName)}</p>
            {item.wearer && <p>{item.wearer}</p>}
            <p>
              <span className="font-semibold">{t(`status.group.${item.group}`)}</span>
              <span className="text-muted"> ({label(item.stageLabel)})</span>
            </p>
            {item.trialDate && <p className="text-base">{t('item.trial', { date: date(item.trialDate) })}</p>}
            {item.deliveryDate && <p className="text-base">{t('item.delivery', { date: date(item.deliveryDate) })}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
