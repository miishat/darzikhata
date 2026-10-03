import { templateById } from '@darzikhata/domain';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { draftErrorKey, type DraftErrors, type DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';

/** The text for the problem at an error path, or undefined when there is none. */
export function useErrorText(errors: DraftErrors): (path: string) => string | undefined {
  const { t } = useI18n();
  return (path) => {
    const code = errors[path];
    return code ? t(draftErrorKey(path, code)) : undefined;
  };
}

/** The name a line goes by: its garment and its place in the draft, such as "শার্ট ২". */
export function useItemTitle(entry: OrderEntry): (item: DraftItem) => string {
  const { label, number } = useI18n();
  const { config } = useSnapshot();
  return (item) => {
    const template = config ? templateById(config, item.templateId) : null;
    const name = template ? label(template.name) : item.templateId;
    return `${name} ${number(entry.draft.items.indexOf(item) + 1)}`;
  };
}
