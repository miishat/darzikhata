import { balanceDue, itemSummaryGroup, labelIn, stageByKey, toScript, type ItemRef, type Order } from '@darzikhata/domain';
import { CheckCheck, Printer, Scissors, ShoppingBag, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCurrentStaff } from '../../data/StoreContext';
import { useCan, useToday } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { useShell } from '../../shell/ShellPreference';
import { Avatar } from '../../ui/Avatar';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { DASHBOARD_VARIANTS, VariantB, VariantC, VariantD, VariantE } from './DashboardDesktopPrototype';
import { dashboardModel, dayPart, todoRows, firstTrialTime, METHODS } from './dashboard';

function Tile({ to, label, count, icon: Icon, late, sub }: { to: string; label: string; count: string; icon: LucideIcon; late?: boolean; sub?: string | null }) {
  return (
    <Link
      to={to}
      className={`flex min-h-11 flex-col gap-1.5 rounded-2xl p-3.5 focus-visible:outline-2 focus-visible:outline-focus ${
        late ? 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink' : 'bg-navy-raised text-on-navy'
      }`}
    >
      <span className={`flex items-center gap-2 text-sm ${late ? 'font-semibold' : 'text-on-navy-muted'}`}>
        <Icon aria-hidden="true" size={18} />
        {label}
      </span>
      <span className="font-display text-3xl font-bold leading-none">{count}</span>
      {sub !== undefined && <span className={`min-h-5 text-sm ${late ? 'text-warn-ink' : 'text-on-navy-muted'}`}>{sub}</span>}
    </Link>
  );
}

function MoneyCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Link
      to="/app/payments"
      className="flex min-h-11 flex-col gap-0.5 rounded-2xl border border-line bg-panel px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-focus"
    >
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-display text-xl font-bold ${warn ? 'text-warn' : ''}`}>{value}</span>
    </Link>
  );
}

/** What is due today, what is late, what waits to be collected, and (with money access) the day's money. */
export function DashboardPage() {
  const { t, language, money, number, date } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const can = useCan();
  const showMoney = can('money.view');
  const model = useMemo(() => dashboardModel(Object.values(state.orders), today), [state, today]);
  const customerName = (order: Order) => state.customers[order.customerId]?.name ?? '';

  const { kind } = useShell();
  const variant = useVariant(Object.keys(DASHBOARD_VARIANTS));
  if (kind !== 'mobile' && variant !== 'A')
    return (
      <>
        {variant === 'B' && <VariantB />}
        {variant === 'C' && <VariantC />}
        {variant === 'D' && <VariantD />}
        {variant === 'E' && <VariantE />}
        <PrototypeSwitcher variants={DASHBOARD_VARIANTS} />
      </>
    );
  if (kind === 'mobile') {
    const rows = todoRows(model);
    return (
      <section className="flex flex-col gap-4">
        <h1 className="sr-only">{t('nav.dashboard')}</h1>
        <section aria-label={t('dashboard.title')} className="flex flex-col gap-3.5 rounded-3xl ring-1 ring-inset ring-navy-line bg-navy p-4 text-on-navy">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{t('dashboard.title')}</h2>
            <span className="text-sm text-on-navy-muted">{date(today, { year: false })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Tile to="/app/orders?status=trial&sort=delivery" label={t('dashboard.tile.trial')} count={number(model.trialsToday.length)} icon={Scissors} />
            <Tile to="/app/orders?status=open&sort=delivery" label={t('dashboard.tile.delivery')} count={number(model.deliveriesToday.length)} icon={ShoppingBag} />
            <Tile to="/app/orders?status=ready" label={t('dashboard.tile.ready')} count={number(model.readyGarments)} icon={CheckCheck} />
            <Tile to="/app/orders?status=overdue" label={t('dashboard.tile.late')} count={number(model.overdueGarments)} icon={TriangleAlert} late />
          </div>
        </section>
        {showMoney && (
          <section aria-label={t('dashboard.money')} className="grid grid-cols-2 gap-2.5">
            <MoneyCard label={t('dashboard.collectedToday')} value={money(model.collectedToday)} />
            <MoneyCard label={t('payments.dueTotal')} value={money(model.dueTotal)} warn />
          </section>
        )}
        <section aria-label={t('dashboard.todo')} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h2 className="font-display text-lg font-semibold">{t('dashboard.todo')}</h2>
            <Link to="/app/orders" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong">
              {t('dashboard.seeAll')}
            </Link>
          </div>
          {rows.length === 0 ? (
            <p className="text-muted">{t('dashboard.none')}</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
              {rows.map(({ kind: rowKind, ref: { order, item } }) => {
                const stage = stageByKey(item.stages, item.stageKey);
                return (
                  <li key={item.id}>
                    <Link
                      to={`/app/orders/${order.id}`}
                      className="flex min-h-11 items-center gap-3 px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Avatar id={order.customerId} name={customerName(order)} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold">{customerName(order)}</span>
                        <span className="truncate text-sm text-muted">
                          {itemTitle(order, item, language)} · {order.number}
                        </span>
                      </span>
                      {rowKind === 'late' && item.deliveryDate ? (
                        <DueLabel date={item.deliveryDate} />
                      ) : (
                        <StagePill
                          label={labelIn(stage.label, language)}
                          tone={stageTone(stage, itemSummaryGroup(item), item.stages.indexOf(stage))}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    );
  }

  return (
    <>
      <DesktopHome model={model} today={today} showMoney={showMoney} customerName={customerName} />
      <PrototypeSwitcher variants={DASHBOARD_VARIANTS} />
    </>
  );
}

const ROW_LIMIT = 5;

interface ListProps {
  title: string;
  count: number;
  seeAll: string;
  late?: boolean;
  tour?: string;
  empty: string;
  children: ReactNode[];
}

/** One of the four lists: title, count badge, "see all", and at most five rows. */
function TodoList({ title, count, seeAll, late, tour, empty, children }: ListProps) {
  const { t, number } = useI18n();
  return (
    <section aria-label={title} data-tour={tour} className="flex min-w-0 flex-col rounded-2xl border border-line bg-panel">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <span
          className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 text-sm font-semibold ${
            late && count > 0 ? 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink' : 'bg-surface text-muted'
          }`}
        >
          {number(count)}
        </span>
        <Link to={seeAll} className="ms-auto text-sm font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus">
          {t('dashboard.seeAll')}
          <span className="sr-only"> {title}</span>
        </Link>
      </div>
      {children.length === 0 ? (
        <p className="border-t border-line px-4 py-3 text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-t border-line">{children}</ul>
      )}
    </section>
  );
}

function RowLink({ to, id, name, detail, children }: { to: string; id: string; name: string; detail: string; children?: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex min-h-[52px] items-center gap-3 px-4 py-1 hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus">
        <Avatar id={id} name={name} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-sm text-muted">{detail}</span>
        </span>
        {children}
      </Link>
    </li>
  );
}

interface DesktopHomeProps {
  model: ReturnType<typeof dashboardModel>;
  today: string;
  showMoney: boolean;
  customerName: (order: Order) => string;
}

/** The laptop and desktop Home: today's panel and money card on top, the four lists below. */
function DesktopHome({ model, today, showMoney, customerName }: DesktopHomeProps) {
  const { t, language, money, number, date } = useI18n();
  const current = useCurrentStaff();
  const name = current?.staff.name;
  const greeting = `${t(`dashboard.greeting.${dayPart(new Date())}`)}${name ? `, ${name}` : ''}`;

  const trialSub = model.firstTrialTime ? t('dashboard.sub.trialAt', { time: toScript(model.firstTrialTime, language) }) : null;
  const deliverySub =
    showMoney && model.deliveriesOwing > 0 ? t('dashboard.sub.deliveryOwing', { n: number(model.deliveriesOwing) }) : null;
  const readySub = showMoney && model.readyOwed > 0 ? t('dashboard.sub.readyOwed', { amount: money(model.readyOwed) }) : null;
  const lateSub = model.oldestLateDays === null ? null : t(model.oldestLateDays === 1 ? 'dashboard.sub.lateAgeOne' : 'dashboard.sub.lateAge', { n: number(model.oldestLateDays) });

  // The biggest pick-ups first, so a customer waiting on several garments is never hidden below the five rows.
  const readyFirst = model.ready
    .map((order) => ({ order, readyCount: order.items.filter((i) => itemSummaryGroup(i) === 'ready').length }))
    .sort((a, b) => b.readyCount - a.readyCount);

  const stagePill = (ref: ItemRef) => {
    const stage = stageByKey(ref.item.stages, ref.item.stageKey);
    return (
      <StagePill label={labelIn(stage.label, language)} tone={stageTone(stage, itemSummaryGroup(ref.item), ref.item.stages.indexOf(stage))} />
    );
  };
  const owed = (order: Order) =>
    showMoney && balanceDue(order) > 0 ? (
      <span className="shrink-0 text-sm font-semibold">{t('customer.balance', { amount: money(balanceDue(order)) })}</span>
    ) : null;
  const garmentRow = (ref: ItemRef, right: ReactNode) => (
    <RowLink
      key={`${ref.order.id}:${ref.item.id}`}
      to={`/app/orders/${ref.order.id}`}
      id={ref.order.customerId}
      name={customerName(ref.order)}
      detail={`${itemTitle(ref.order, ref.item, language)} · ${ref.order.number}`}
    >
      {right}
    </RowLink>
  );

  return (
    <section className="mx-auto flex w-full max-w-[1240px] flex-col gap-3">
      <h1 className="sr-only">{t('nav.dashboard')}</h1>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm text-muted">{date(today)}</span>
          <p className="font-display text-2xl font-bold">{greeting}</p>
        </div>
        <Link
          to="/print/work?today=1"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3.5 text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Printer aria-hidden="true" size={16} />
          {t('dashboard.printWork')}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <section aria-label={t('dashboard.title')} className="flex min-w-72 flex-[2_1_520px] flex-col gap-3 rounded-3xl ring-1 ring-inset ring-navy-line bg-navy p-3.5 text-on-navy">
          <h2 className="font-display text-lg font-semibold">{t('dashboard.title')}</h2>
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            <Tile to="/app/orders?status=trial&sort=delivery" label={t('dashboard.tile.trial')} count={number(model.trialsToday.length)} icon={Scissors} sub={trialSub} />
            <Tile to="/app/orders?status=open&sort=delivery" label={t('dashboard.tile.delivery')} count={number(model.deliveriesToday.length)} icon={ShoppingBag} sub={deliverySub} />
            <Tile to="/app/orders?status=ready" label={t('dashboard.tile.ready')} count={number(model.readyGarments)} icon={CheckCheck} sub={readySub} />
            <Tile to="/app/orders?status=overdue" label={t('dashboard.tile.late')} count={number(model.overdueGarments)} icon={TriangleAlert} late sub={lateSub} />
          </div>
        </section>
        {showMoney && (
          <section aria-label={t('dashboard.money')} className="flex min-w-72 flex-[1_1_320px] flex-col gap-2 rounded-3xl border border-line bg-panel p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/app/payments" className="flex flex-col gap-0.5 focus-visible:outline-2 focus-visible:outline-focus">
                <span className="text-sm text-muted">{t('dashboard.collectedToday')}</span>
                <span className="font-display text-2xl font-bold">{money(model.collectedToday)}</span>
                <span className="text-sm text-muted">{t('dashboard.paymentsCount', { n: number(model.collectedCount) })}</span>
              </Link>
              <Link to="/app/payments" className="flex flex-col gap-0.5 border-s border-line ps-3 focus-visible:outline-2 focus-visible:outline-focus">
                <span className="text-sm text-muted">{t('payments.dueTotal')}</span>
                <span className="font-display text-2xl font-bold text-warn">{money(model.dueTotal)}</span>
                <span className="text-sm text-muted">{t('dashboard.dueOrders', { n: number(model.dueOrders) })}</span>
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 border-t border-line pt-2.5 text-sm">
              {METHODS.map((method) => (
                <div key={method} className="flex justify-between gap-2">
                  <dt className="text-muted">{t(`method.${method}`)}</dt>
                  <dd className="font-semibold">{money(model.collectedByMethod[method])}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TodoList title={t('dashboard.trialsToday')} count={model.trialsToday.length} seeAll="/app/orders?status=trial&sort=delivery" empty={t('dashboard.none')}>
          {model.trialsToday.slice(0, ROW_LIMIT).map((ref) => {
            const time = firstTrialTime([ref]);
            return garmentRow(ref, time ? <span className="shrink-0 text-sm font-semibold">{toScript(time, language)}</span> : stagePill(ref));
          })}
        </TodoList>
        <TodoList title={t('dashboard.deliveriesToday')} count={model.deliveriesToday.length} seeAll="/app/orders?status=open&sort=delivery" empty={t('dashboard.none')}>
          {model.deliveriesToday.slice(0, ROW_LIMIT).map((ref) => garmentRow(ref, owed(ref.order) ?? stagePill(ref)))}
        </TodoList>
        <TodoList title={t('dashboard.overdue')} count={model.overdue.length} seeAll="/app/orders?status=overdue" late empty={t('dashboard.none')}>
          {model.overdue.slice(0, ROW_LIMIT).map((ref) => garmentRow(ref, ref.item.deliveryDate ? <DueLabel date={ref.item.deliveryDate} /> : stagePill(ref)))}
        </TodoList>
        <TodoList title={t('dashboard.ready')} count={model.ready.length} seeAll="/app/orders?status=ready" tour="ready-list" empty={t('dashboard.none')}>
          {readyFirst.slice(0, ROW_LIMIT).map(({ order, readyCount }) => (
            <RowLink
              key={order.id}
              to={`/app/orders/${order.id}`}
              id={order.customerId}
              name={customerName(order)}
              detail={`${t('progress.ready', { n: number(readyCount) })} · ${order.number}`}
            >
              {owed(order)}
            </RowLink>
          ))}
        </TodoList>
      </div>
    </section>
  );
}
