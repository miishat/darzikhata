import { useI18n } from '../../../i18n/I18nProvider';
import { TextAreaField } from '../../../ui/TextAreaField';
import { TextField } from '../../../ui/TextField';
import type { DraftItem } from '../draft';
import { PhotoPicker } from '../PhotoPicker';
import type { OrderEntry } from '../useOrderEntry';

/** One line's wearer, design and fabric notes, and photos. */
export function ItemDetails({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <TextField
        label={t('entry.wearer')}
        value={item.wearer}
        onChange={(e) => entry.updateItem(item.key, { wearer: e.target.value })}
        autoComplete="off"
      />
      <TextAreaField
        label={t('entry.designNotes')}
        value={item.designNotes}
        onChange={(e) => entry.updateItem(item.key, { designNotes: e.target.value })}
      />
      <TextField
        label={t('entry.fabricNote')}
        value={item.fabricNote}
        onChange={(e) => entry.updateItem(item.key, { fabricNote: e.target.value })}
        autoComplete="off"
      />
      <PhotoPicker photoIds={item.photoIds} onChange={(photoIds) => entry.updateItem(item.key, { photoIds })} />
    </div>
  );
}
