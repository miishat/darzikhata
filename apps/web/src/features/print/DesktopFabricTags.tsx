import { labelIn, shopContact, type Customer, type Language, type Order, type ShopConfig } from '@darzikhata/domain';
import { Scissors } from 'lucide-react';
import { formatDate, formatNumber, translate } from '../../i18n/format';
import { itemTitle } from '../common/orderText';

export interface DesktopFabricTagsProps {
  language: Language;
  config: ShopConfig;
  order: Order;
  customer: Customer | undefined;
}

/**
 * The desktop fabric tags: the shop and the title like the receipt, the order number, customer and tag count between
 * double rules, then one row per garment cut along the dashed lines. The tag on the left goes on the fabric with the
 * garment, wearer, customer and dates; past the scissors line, a claim stub with the same order number and the date
 * to collect goes to the customer.
 */
export function DesktopFabricTags({ language, config, order, customer }: DesktopFabricTagsProps) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const date = (d: string) => formatDate(d, language, { year: false });
  const shopName = shopContact(config, language).name;
  const items = order.items.filter((item) => !item.cancelled);

  return (
    <>
      <header className="mb-4">
        <div className="text-center">
          <p className="font-display text-3xl font-bold">{shopName}</p>
          <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>
            {t('print.tags')}
          </h1>
        </div>
        <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-6 border-y-4 border-double border-ink py-2 text-sm">
          <p className="font-display text-2xl font-bold tabular-nums">
            <span className="sr-only">{t('receipt.orderNumber', { number: '' })}</span>
            {order.number}
          </p>
          <p>
            <b>{customer?.name}</b>
          </p>
          <p className="text-end">{t('print.tagCount', { n: formatNumber(items.length, language) })}</p>
        </div>
      </header>
      <ul aria-label={t('print.tags')} className="m-0 grid grid-cols-1 gap-3 p-0">
        {items.map((item) => (
          <li key={item.id} className="print-block grid list-none grid-cols-[1fr_auto_13rem] border-2 border-dashed border-muted">
            <div className="p-3">
              <p className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold tabular-nums">{order.number}</span>
                <span className="font-display text-lg font-bold">{itemTitle(order, item, language)}</span>
              </p>
              <p className="text-sm">{[item.wearer, customer?.name, customer?.phone].filter(Boolean).join(' · ')}</p>
              <p className="mt-1 text-sm">
                {item.trialDate && (
                  <span className="me-4">
                    <span className="text-muted">{t('print.trial')}: </span>
                    <b>{date(item.trialDate)}</b>
                  </span>
                )}
                {item.deliveryDate && (
                  <span>
                    <span className="text-muted">{t('receipt.delivery')}: </span>
                    <b>{date(item.deliveryDate)}</b>
                  </span>
                )}
              </p>
            </div>
            <div aria-hidden="true" className="flex items-center justify-center border-x-2 border-dashed border-muted px-1 text-muted">
              <Scissors className="size-4 rotate-90" />
            </div>
            <div aria-label={t('print.claimStub')} role="group" className="p-3 text-center">
              <p className="text-[10px] font-semibold text-muted">{shopName}</p>
              <p className="font-display text-2xl font-bold tabular-nums">{order.number}</p>
              <p className="text-xs">{labelIn(item.garmentName, language)}</p>
              {item.deliveryDate && (
                <p className="mt-1 text-xs">
                  {t('print.collectOn')} <b>{date(item.deliveryDate)}</b>
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
