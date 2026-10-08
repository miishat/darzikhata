// PROTOTYPE (throwaway): other desktop layouts for the hand-over confirmation, behind ?variant=.
import { itemSummaryGroup, moneySummary, type Language, type Order, type OrderItem } from '@darzikhata/domain';
import { Check, PackageCheck, Phone, Shirt, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { useCan } from '../common/hooks';
import { itemTitle } from '../common/orderText';

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

export interface HandOverProtoProps {
  variant: string;
  order: Order;
  item: OrderItem;
  onClose(): void;
  working: boolean;
  problem: string | null;
  confirm(): void;
}

function Problem({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="text-danger">
      {text}
    </p>
  ) : null;
}

function useFacts(order: Order, item: OrderItem) {
  const { language } = useI18n();
  const can = useCan();
  const { state } = useSnapshot();
  const customer = state.customers[order.customerId];
  const sum = moneySummary(order);
  const title = itemTitle(order, item, language);
  const others = order.items.filter((i) => i.id !== item.id && !i.cancelled);
  const othersLeft = others.filter((i) => itemSummaryGroup(i) !== 'delivered');
  return { customer, sum, title, othersLeft, showMoney: can('money.view') };
}

/** B: a green hand-over mark, the garment and customer, and the balance as a callout. */
function Marked({ order, item, onClose, working, problem, confirm }: HandOverProtoProps) {
  const { t, money, language } = useI18n();
  const f = useFacts(order, item);
  return (
    <Dialog
      open
      title={t('item.handOverTitle')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={working} onClick={confirm}>
            <PackageCheck size={18} aria-hidden="true" />
            {t('item.handOver')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-ink">
        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
            <Shirt size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">{f.title}</p>
            <p className="truncate text-sm text-muted">
              {[f.customer?.name, order.number].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {f.showMoney && f.sum.balance > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-warn-soft px-4 py-3 text-warn-ink ring-1 ring-warn-line ring-inset">
            <Wallet size={20} aria-hidden="true" />
            <span className="flex-1 text-sm font-semibold">{pick(language, 'এই অর্ডারে এখনো বাকি', 'Still owed on this order')}</span>
            <span className="font-display text-xl font-bold">{money(f.sum.balance)}</span>
          </div>
        )}
        <Problem text={problem} />
      </div>
    </Dialog>
  );
}

/** C: a receipt-like summary: what goes out, what is still being made, and the order's money in three lines. */
function Summary({ order, item, onClose, working, problem, confirm }: HandOverProtoProps) {
  const { t, money, language, label, number } = useI18n();
  const f = useFacts(order, item);
  return (
    <Dialog
      open
      title={t('item.handOverTitle')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={working} onClick={confirm}>
            {pick(language, 'দিয়ে দিন', 'Hand Over')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-ink">
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">{pick(language, 'এখন যাচ্ছে', 'Going Now')}</p>
          <p className="flex items-center gap-2 font-semibold">
            <Check size={18} aria-hidden="true" className="text-ok" />
            {f.title}
          </p>
          {f.othersLeft.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {pick(
                language,
                `এই অর্ডারের আরো ${number(f.othersLeft.length)}টি পোশাক এখনো বাকি: `,
                `${f.othersLeft.length} more on this order still in progress: `,
              )}
              {f.othersLeft.map((i) => `${itemTitle(order, i, language)} (${label(i.stages.find((s) => s.key === i.stageKey)?.label ?? { bn: i.stageKey, en: i.stageKey })})`).join(', ')}
            </p>
          )}
        </div>
        {f.showMoney && (
          <dl className="m-0 rounded-xl border border-line text-sm">
            <div className="flex justify-between px-4 py-2">
              <dt className="text-muted">{pick(language, 'মোট', 'Total')}</dt>
              <dd className="m-0">{money(f.sum.total)}</dd>
            </div>
            <div className="flex justify-between border-t border-line px-4 py-2">
              <dt className="text-muted">{pick(language, 'জমা', 'Paid')}</dt>
              <dd className="m-0 text-ok">{money(f.sum.paid)}</dd>
            </div>
            <div className="flex justify-between border-t border-line px-4 py-2 font-semibold">
              <dt>{pick(language, 'বাকি', 'Owed')}</dt>
              <dd className={`m-0 ${f.sum.balance > 0 ? 'text-warn' : ''}`}>{money(f.sum.balance)}</dd>
            </div>
          </dl>
        )}
        <Problem text={problem} />
      </div>
    </Dialog>
  );
}

/** D: when money is owed, it leads with the balance and offers to take the money first. */
function MoneyFirst({ order, item, onClose, working, problem, confirm }: HandOverProtoProps) {
  const { t, money, language } = useI18n();
  const f = useFacts(order, item);
  const owed = f.showMoney && f.sum.balance > 0;
  return (
    <Dialog
      open
      title={t('item.handOverTitle')}
      onClose={onClose}
      actions={
        owed ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="secondary" disabled={working} onClick={confirm}>
              {pick(language, 'বাকি রেখে দিন', 'Hand Over, Leave Owed')}
            </Button>
            <Link to={`/app/payments?order=${order.id}`} onClick={onClose} className={buttonClasses('primary')}>
              <Wallet size={18} aria-hidden="true" />
              {pick(language, 'আগে টাকা নিন', 'Take Money First')}
            </Link>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button disabled={working} onClick={confirm}>
              {t('item.handOver')}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3 text-ink">
        <p>{t('item.handOverBody', { item: f.title })}</p>
        {owed && (
          <div className="rounded-xl bg-surface p-4 text-center">
            <p className="text-sm text-muted">{pick(language, 'এই অর্ডারে এখনো বাকি', 'Still owed on this order')}</p>
            <p className="font-display text-3xl font-bold text-warn">{money(f.sum.balance)}</p>
            <p className="text-xs text-muted">
              {pick(language, `মোট ${money(f.sum.total)} · জমা ${money(f.sum.paid)}`, `Total ${money(f.sum.total)} · Paid ${money(f.sum.paid)}`)}
            </p>
          </div>
        )}
        <Problem text={problem} />
      </div>
    </Dialog>
  );
}

/** E: a short question as the title, who is collecting, and the balance as one line. */
function Question({ order, item, onClose, working, problem, confirm }: HandOverProtoProps) {
  const { t, money, language } = useI18n();
  const f = useFacts(order, item);
  return (
    <Dialog
      open
      title={pick(language, `${f.title} দিয়ে দেবেন?`, `Hand over ${f.title}?`)}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {pick(language, 'না, থাক', 'Not Yet')}
          </Button>
          <Button disabled={working} onClick={confirm}>
            {pick(language, 'হ্যাঁ, দিয়ে দিন', 'Yes, Hand Over')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-ink">
        {f.customer && (
          <div className="flex items-center gap-3">
            <Avatar id={f.customer.id} name={f.customer.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{f.customer.name}</p>
              {f.customer.phone && (
                <p className="flex items-center gap-1 text-sm text-muted">
                  <Phone size={13} aria-hidden="true" />
                  {f.customer.phone}
                </p>
              )}
            </div>
            <span className="text-sm text-muted">{order.number}</span>
          </div>
        )}
        {f.showMoney && f.sum.balance > 0 ? (
          <p className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
            <span className="text-muted">{pick(language, 'বাকি আছে', 'Still owed')}</span>
            <span className="font-semibold text-warn">{money(f.sum.balance)}</span>
          </p>
        ) : (
          f.showMoney && (
            <p className="flex items-center gap-2 text-sm font-semibold text-ok">
              <Check size={16} aria-hidden="true" />
              {pick(language, 'সব টাকা পরিশোধ হয়েছে', 'Fully paid')}
            </p>
          )
        )}
        <Problem text={problem} />
      </div>
    </Dialog>
  );
}

export function HandOverPrototype(props: HandOverProtoProps) {
  if (props.variant === 'B') return <Marked {...props} />;
  if (props.variant === 'C') return <Summary {...props} />;
  if (props.variant === 'D') return <MoneyFirst {...props} />;
  return <Question {...props} />;
}
