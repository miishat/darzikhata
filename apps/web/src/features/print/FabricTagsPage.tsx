import { labelIn } from '@darzikhata/domain';
import { useParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { formatDate, translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { PrintLayout, usePrintLanguage } from './PrintLayout';
import { useShell } from '../../shell/ShellPreference';
import { FabricTagSwitcher, FabricTagsPaper, useFabricTagVariant } from './FabricTagsPrototype';

/** One cut-out tag per garment to pin to the fabric. */
export function FabricTagsPage() {
  const { orderId = '' } = useParams();
  const app = useI18n();
  const { state, config } = useSnapshot();
  const { kind } = useShell();
  const variant = useFabricTagVariant();
  const [language, setLanguage] = usePrintLanguage();
  const order = state.orders[orderId];
  if (!order) {
    return (
      <p role="alert" className="p-6">
        {app.t('print.notFound')}
      </p>
    );
  }
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);

  return (
    <PrintLayout back={{ to: `/app/orders/${order.id}`, label: app.t('print.back') }} title={t('print.tags')} language={language} onLanguage={setLanguage} orderId={order.id}>
      {kind === 'desktop' && <FabricTagSwitcher />}
      {kind === 'desktop' && variant !== 'A' && config ? (
        <FabricTagsPaper variant={variant} language={language} config={config} order={order} customer={state.customers[order.customerId]} />
      ) : (
      <>
      <h1 className="mb-4 text-2xl font-semibold">{t('print.tags')}</h1>
      <ul aria-label={t('print.tags')} className="grid grid-cols-2 gap-3">
        {order.items
          .filter((item) => !item.cancelled)
          .map((item) => (
            <li key={item.id} className="print-block rounded border border-dashed border-ink p-3">
              <p className="font-semibold">{t('receipt.orderNumber', { number: order.number })}</p>
              <p>{labelIn(item.garmentName, language)}</p>
              {item.wearer && <p>{item.wearer}</p>}
              {item.deliveryDate && (
                <p>
                  {t('receipt.delivery')}: {formatDate(item.deliveryDate, language)}
                </p>
              )}
            </li>
          ))}
      </ul>
      </>
      )}
    </PrintLayout>
  );
}
