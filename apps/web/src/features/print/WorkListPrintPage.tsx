import { labelIn, shopContact, type ItemRef } from '@darzikhata/domain';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { formatDate, translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { itemTitle } from '../common/orderText';
import { useToday } from '../common/hooks';
import { useScopedState } from '../branches/BranchScopeProvider';
import { dashboardModel, todoRows } from '../dashboard/dashboard';
import { useWorkList } from '../work/useWorkList';
import { useShell } from '../../shell/ShellPreference';
import { DesktopWorkPaper } from './DesktopWorkPaper';
import { PrintLayout, usePrintLanguage } from './PrintLayout';

/** A paper work list with the same filters and grouping as the screen, one table per group. The desktop has its own A4 layout. */
export function WorkListPrintPage() {
  const app = useI18n();
  const { state: shop, config } = useSnapshot();
  const { kind } = useShell();
  const { query, groups: allGroups } = useWorkList();
  const state = useScopedState();
  const [params] = useSearchParams();
  const today = useToday();
  const [language, setLanguage] = usePrintLanguage();
  const onlyToday = params.get('today') === '1';
  /*
   * "Today" is the Home page's own meaning (todoRows over dashboardModel): garments with a trial
   * today, a delivery today, or already late, each once. It narrows the work list, so the
   * stage and worker filters and the viewer's own-garments scope still apply.
   */
  const groups = useMemo(() => {
    if (!onlyToday) return allGroups;
    const ids = new Set(todoRows(dashboardModel(Object.values(state.orders), today), Infinity).map((r) => r.ref.item.id));
    return allGroups.map((g) => ({ ...g, refs: g.refs.filter((r) => ids.has(r.item.id)) })).filter((g) => g.refs.length > 0);
  }, [allGroups, onlyToday, state.orders, today]);
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  if (!config) return null;

  const search = params.toString();
  const staffName = (id: string | null) => (id === null ? t('work.unassigned') : (config.staff.find((s) => s.id === id)?.name ?? id));
  const stageName = (r: ItemRef) => {
    const stage = r.item.stages.find((s) => s.key === r.item.stageKey);
    return stage ? labelIn(stage.label, language) : r.item.stageKey;
  };
  const filterStage = query.stage === 'all' ? null : groups.flatMap((g) => g.refs).find((r) => r.item.stageKey === query.stage);
  const heading = onlyToday ? t('print.workToday') : t('nav.work');
  const head = 'px-2 py-1 text-start text-sm font-semibold';

  return (
    <PrintLayout
      back={{ to: `/app/work${search ? `?${search}` : ''}`, label: app.t('print.backToWork') }}
      title={heading}
      language={language}
      onLanguage={setLanguage}
    >
      {kind === 'desktop' ? (
        <DesktopWorkPaper
          language={language}
          config={config}
          query={query}
          groups={groups}
          heading={heading}
          today={today}
          onlyToday={onlyToday}
          customerName={(r) => shop.customers[r.order.customerId]?.name ?? ''}
        />
      ) : (
        <>
          <header className="mb-4">
            <h1 className="text-2xl font-semibold">{heading}</h1>
            <p className="font-semibold">{shopContact(config, language).name}</p>
            <p>{t('print.printedOn', { date: formatDate(today, language) })}</p>
            {query.worker !== 'all' && <p>{t('item.worker', { name: query.worker === 'none' ? t('work.unassigned') : staffName(query.worker) })}</p>}
            {query.stage !== 'all' && <p>{t('item.stage', { stage: filterStage ? stageName(filterStage) : query.stage })}</p>}
          </header>
          {onlyToday && groups.length === 0 && <p>{t('print.noWorkToday')}</p>}
          {groups.map((group) => {
            const title =
              query.by === 'worker'
                ? group.staff?.name ?? t('work.unassigned')
                : group.stage
                  ? labelIn(group.stage.label, language)
                  : group.key;
            return (
              <section key={group.key} className="mb-6">
                <h2 className="mb-1 text-lg font-semibold">{title}</h2>
                <table aria-label={title} className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={head}>{t('orders.col.order')}</th>
                      <th scope="col" className={head}>{t('receipt.garment')}</th>
                      <th scope="col" className={head}>{t('receipt.wearer')}</th>
                      <th scope="col" className={head}>{query.by === 'worker' ? t('work.stage') : t('work.worker')}</th>
                      <th scope="col" className={head}>{t('print.trial')}</th>
                      <th scope="col" className={head}>{t('receipt.delivery')}</th>
                      <th scope="col" className={`${head} w-1/4`}>{t('work.col.notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.refs.map((r) => (
                      <tr key={r.item.id} className="print-block border-b border-line">
                        <td className="whitespace-nowrap px-2 py-2 font-semibold">{r.order.number}</td>
                        <td className="px-2 py-2">{itemTitle(r.order, r.item, language)}</td>
                        <td className="px-2 py-2">{r.item.wearer}</td>
                        <td className="px-2 py-2">{query.by === 'worker' ? stageName(r) : staffName(r.item.assignedTo)}</td>
                        <td className="px-2 py-2">{r.item.trialDate ? formatDate(r.item.trialDate, language) : ''}</td>
                        <td className="px-2 py-2">{r.item.deliveryDate ? formatDate(r.item.deliveryDate, language) : ''}</td>
                        <td className="px-2 py-2" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </>
      )}
    </PrintLayout>
  );
}
