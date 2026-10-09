import type { ItemRef } from '@darzikhata/domain';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { useToday } from '../common/hooks';
import { useScopedState } from '../branches/BranchScopeProvider';
import { dashboardModel, todoRows } from '../dashboard/dashboard';
import { useWorkList } from '../work/useWorkList';
import { useShell } from '../../shell/ShellPreference';
import { DesktopWorkPaper } from './DesktopWorkPaper';
import { PhoneWorkPaper } from './PhoneWorkPaper';
import { PhonePaperLayout, PrintLayout, usePrintLanguage } from './PrintLayout';

/** A paper work list with the same filters and grouping as the screen: an A4 sheet on a desktop, a paper card on a phone. */
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
  const back = { to: `/app/work${search ? `?${search}` : ''}`, label: app.t('print.backToWork') };
  const heading = onlyToday ? t('print.workToday') : t('nav.work');
  const paper = {
    language,
    config,
    query,
    groups,
    heading,
    today,
    onlyToday,
    customerName: (r: ItemRef) => shop.customers[r.order.customerId]?.name ?? '',
  };

  return kind === 'desktop' ? (
    <PrintLayout back={back} title={heading} language={language} onLanguage={setLanguage}>
      <DesktopWorkPaper {...paper} />
    </PrintLayout>
  ) : (
    <PhonePaperLayout back={back} title={heading} language={language} onLanguage={setLanguage}>
      <PhoneWorkPaper {...paper} />
    </PhonePaperLayout>
  );
}
