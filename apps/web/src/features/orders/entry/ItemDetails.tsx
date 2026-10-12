import { Paperclip } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nProvider';
import { TextAreaField } from '../../../ui/TextAreaField';
import { TextField } from '../../../ui/TextField';
import type { DraftItem } from '../draft';
import { PhotoPicker, PhotoThumbs, usePhotoAdder } from '../PhotoPicker';
import type { OrderEntry } from '../useOrderEntry';

/** One line's wearer, design and fabric notes, and photos. */
export function ItemDetails({ entry, item, desktop = false }: { entry: OrderEntry; item: DraftItem; desktop?: boolean }) {
  const { t } = useI18n();
  if (desktop) return <DesktopDetails entry={entry} item={item} />;
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

/** The wearer sits in the item's header on desktop. The photo button lives inside the design note, with the photos under it. */
function DesktopDetails({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
  const { t } = useI18n();
  const onPhotos = (photoIds: string[]) => entry.updateItem(item.key, { photoIds });
  const { inputId, input, busy, failed } = usePhotoAdder(item.photoIds, onPhotos);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <TextAreaField
          label={t('entry.designNotes')}
          value={item.designNotes}
          onChange={(e) => entry.updateItem(item.key, { designNotes: e.target.value })}
        />
        {input}
        <label
          htmlFor={inputId}
          title={t('photos.add')}
          className="absolute bottom-2 right-2 grid size-10 cursor-pointer place-items-center rounded-lg bg-surface text-brand-strong hover:bg-brand-soft peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-disabled:opacity-50"
        >
          <Paperclip aria-hidden="true" size={18} />
          <span className="sr-only">{t('photos.add')}</span>
        </label>
      </div>
      <PhotoThumbs photoIds={item.photoIds} onChange={onPhotos} busy={busy} compact />
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t('photo.failed')}
        </p>
      )}
      <TextField
        label={t('entry.fabricNote')}
        value={item.fabricNote}
        onChange={(e) => entry.updateItem(item.key, { fabricNote: e.target.value })}
        autoComplete="off"
      />
    </div>
  );
}
