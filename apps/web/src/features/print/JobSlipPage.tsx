import { useParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { formatDate, translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { itemTitle } from '../common/orderText';
import { useMeasurementAccess } from '../common/hooks';
import { MeasurementTable } from '../customers/MeasurementTable';
import { PrintLayout, usePrintLanguage } from './PrintLayout';
import { useShell } from '../../shell/ShellPreference';
import { JobSlipPaper, JobSlipSwitcher, useJobSlipVariant } from './JobSlipPrototype';

/** What the tailor needs at the bench: notes and measurements per garment, with no prices. */
export function JobSlipPage() {
  const { orderId = '' } = useParams();
  const app = useI18n();
  const { state, config } = useSnapshot();
  const hasAccess = useMeasurementAccess();
  const [language, setLanguage] = usePrintLanguage();
  const { kind } = useShell();
  const variant = useJobSlipVariant();
  const order = state.orders[orderId];
  if (!order || !config) {
    return (
      <p role="alert" className="p-6">
        {app.t('print.notFound')}
      </p>
    );
  }
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const customer = state.customers[order.customerId];
  const mayMeasure = customer ? hasAccess(customer) : false;

  return (
    <PrintLayout back={{ to: `/app/orders/${order.id}`, label: app.t('print.back') }} title={t('print.jobSlip')} language={language} onLanguage={setLanguage} orderId={order.id}>
      {kind === 'desktop' && <JobSlipSwitcher />}
      {kind === 'desktop' && variant !== 'A' ? (
        <JobSlipPaper variant={variant} language={language} config={config} order={order} customer={customer} mayMeasure={mayMeasure} />
      ) : (
      <>
      <h1 className="text-2xl font-semibold">{t('print.jobSlip')}</h1>
      <p className="mb-4">
        {t('receipt.orderNumber', { number: order.number })}
        {customer ? `, ${customer.name}` : ''}
      </p>
      {order.items
        .filter((item) => !item.cancelled)
        .map((item) => {
          const title = itemTitle(order, item, language);
          const template = config.templates.find((tpl) => tpl.id === item.templateId);
          return (
            <section key={item.id} aria-label={title} className="print-block mb-6 border-t border-line pt-3">
              <h2 className="text-lg font-semibold">{title}</h2>
              {item.wearer && (
                <p>
                  {t('receipt.wearer')}: {item.wearer}
                </p>
              )}
              {item.trialDate && (
                <p>
                  {t('print.trial')}: {formatDate(item.trialDate, language)}
                </p>
              )}
              {item.deliveryDate && (
                <p>
                  {t('receipt.delivery')}: {formatDate(item.deliveryDate, language)}
                </p>
              )}
              {item.designNotes && (
                <p>
                  {t('print.designNotes')}: {item.designNotes}
                </p>
              )}
              {item.fabricNote && (
                <p>
                  {t('print.fabricNote')}: {item.fabricNote}
                </p>
              )}
              {item.adjustments.length > 0 && (
                <div>
                  <p className="font-semibold">{t('print.adjustments')}</p>
                  {item.adjustments.map((adjustment) => (
                    <p key={adjustment.id}>{adjustment.note}</p>
                  ))}
                </div>
              )}
              {!mayMeasure && <p className="text-muted">{t('print.measurementsHidden')}</p>}
              {mayMeasure && item.measurements && template && (
                <MeasurementTable template={template} values={item.measurements.values} language={language} />
              )}
            </section>
          );
        })}
      </>
      )}
    </PrintLayout>
  );
}
