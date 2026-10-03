import {
  adjustmentsTotal,
  itemSummaryGroup,
  labelIn,
  moneySummary,
  orderProgress,
  shopContact,
  stageByKey,
  subtotal,
  type Customer,
  type Discount,
  type Language,
  type Order,
  type OrderProgress,
  type Payment,
  type Poisha,
  type ShopConfig,
  type ShopContact,
} from '@darzikhata/domain';
import { formatDate, formatMoney, translate } from '../../i18n/format';

export interface ReceiptLine {
  itemId: string;
  garment: string;
  wearer: string | null;
  price: Poisha;
  cancelled: boolean;
  stage: string;
  trialDate: string | null;
  deliveryDate: string | null;
}

export interface ReceiptPayment {
  id: string;
  at: string;
  kind: Payment['kind'];
  method: Payment['method'];
  reference: string;
  reason: string;
  /** What this record did to the money held: negative for refunds and for corrections that lowered a payment. */
  effect: Poisha;
}

/** Everything a receipt shows, already in one language. Money stays in poisha for the page to format. */
export interface ReceiptModel {
  shop: ShopContact;
  orderNumber: string;
  createdAt: string;
  customer: { name: string; phone: string | null };
  lines: ReceiptLine[];
  subtotal: Poisha;
  discount: Discount | null;
  adjustments: Array<{ amount: Poisha; reason: string }>;
  adjustmentsTotal: Poisha;
  total: Poisha;
  payments: ReceiptPayment[];
  paid: Poisha;
  balance: Poisha;
  creditDue: Poisha;
  progress: OrderProgress;
  /** Earliest promised date among garments not yet handed over. */
  nextDelivery: string | null;
}

function effectOf(payment: Payment, all: Payment[]): Poisha {
  if (payment.kind === 'refund') return -payment.amount;
  if (payment.kind === 'correction') {
    const target = all.find((p) => p.id === payment.corrects);
    return target?.kind === 'refund' ? -payment.amount : payment.amount;
  }
  return payment.amount;
}

export function receiptModel(order: Order, customer: Customer | null, config: ShopConfig, language: Language): ReceiptModel {
  const money = moneySummary(order);
  let nextDelivery: string | null = null;
  for (const item of order.items) {
    const group = itemSummaryGroup(item);
    if ((group === 'unfinished' || group === 'ready') && item.deliveryDate) {
      if (nextDelivery === null || item.deliveryDate < nextDelivery) nextDelivery = item.deliveryDate;
    }
  }
  return {
    shop: shopContact(config, language),
    orderNumber: order.number,
    createdAt: order.createdAt,
    customer: { name: customer?.name ?? '', phone: customer?.phone ?? null },
    lines: order.items.map((item) => ({
      itemId: item.id,
      garment: labelIn(item.garmentName, language),
      wearer: item.wearer,
      price: item.price,
      cancelled: item.cancelled !== null,
      stage: labelIn(stageByKey(item.stages, item.stageKey).label, language),
      trialDate: item.trialDate,
      deliveryDate: item.deliveryDate,
    })),
    subtotal: subtotal(order),
    discount: order.discount,
    adjustments: order.priceAdjustments.map((a) => ({ amount: a.amount, reason: a.reason })),
    adjustmentsTotal: adjustmentsTotal(order),
    total: money.total,
    payments: order.payments.map((p) => ({
      id: p.id,
      at: p.at,
      kind: p.kind,
      method: p.method,
      reference: p.reference,
      reason: p.reason,
      effect: effectOf(p, order.payments),
    })),
    paid: money.paid,
    balance: money.balance,
    creditDue: money.creditDue,
    progress: orderProgress(order),
    nextDelivery,
  };
}

/** Plain text for sharing a receipt through a messaging app. */
export function receiptShareText(model: ReceiptModel, language: Language): string {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) => translate(language, key, vars);
  const lines = [
    model.shop.name,
    t('receipt.orderNumber', { number: model.orderNumber }),
    `${t('money.total')}: ${formatMoney(model.total, language)}`,
    `${t('money.paid')}: ${formatMoney(model.paid, language)}`,
    model.creditDue > 0
      ? `${t('money.creditDue')}: ${formatMoney(model.creditDue, language)}`
      : `${t('money.balance')}: ${formatMoney(model.balance, language)}`,
  ];
  if (model.nextDelivery) lines.push(`${t('receipt.delivery')}: ${formatDate(model.nextDelivery, language)}`);
  if (model.shop.phone) lines.push(model.shop.phone);
  return lines.join('\n');
}
