import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { compressPhoto } from '../../lib/photos';
import { usePhoto } from './usePhoto';

interface Props {
  photoIds: string[];
  onChange(ids: string[]): void;
  /** Shrinks a chosen file to a data URL. Replaceable so tests need no browser image support. */
  compress?: (file: File) => Promise<string>;
}

/** The picking half of PhotoPicker: saves chosen files and reports the new list. Photos that saved are kept even when one fails. */
export function usePhotoAdder(photoIds: string[], onChange: (ids: string[]) => void, compress: (file: File) => Promise<string> = compressPhoto) {
  const store = useStore();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const latestIds = useRef(photoIds);
  latestIds.current = photoIds;

  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setFailed(false);
    const added: string[] = [];
    try {
      for (const file of files) added.push(await store.savePhoto(await compress(file)));
    } catch {
      setFailed(true);
    } finally {
      if (added.length > 0) onChange([...latestIds.current, ...added]);
      setBusy(false);
    }
  };
  const input = (
    <input
      id={inputId}
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      disabled={busy}
      className="peer sr-only"
      onChange={(e) => void add(e)}
    />
  );
  return { inputId, input, busy, failed };
}

/** The chosen photos, each with a remove button. `compact` makes them smaller with a small round button, for sitting under a note. */
export function PhotoThumbs({ photoIds, onChange, busy = false, compact = false }: { photoIds: string[]; onChange(ids: string[]): void; busy?: boolean; compact?: boolean }) {
  const { t, number } = useI18n();
  if (photoIds.length === 0) return null;
  return (
    <ul className={`flex flex-wrap ${compact ? 'm-0 list-none gap-3 p-0' : 'gap-2'}`}>
      {photoIds.map((id, index) => (
        <li key={id} className="relative">
          <Thumb id={id} alt={t('photos.photo', { n: number(index + 1) })} compact={compact} />
          <button
            type="button"
            disabled={busy}
            className={
              compact
                ? 'absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-ink text-on-brand shadow focus-visible:outline-2 focus-visible:outline-focus'
                : 'absolute right-0 top-0 min-h-11 min-w-11 rounded bg-surface text-text'
            }
            aria-label={t('photos.remove', { n: number(index + 1) })}
            onClick={() => onChange(photoIds.filter((p) => p !== id))}
          >
            <span aria-hidden="true">×</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Take photos with the phone camera (a file picker on desktop), shrink them and keep them on the device. */
export function PhotoPicker({ photoIds, onChange, compress = compressPhoto }: Props) {
  const { t } = useI18n();
  const { inputId, input, busy, failed } = usePhotoAdder(photoIds, onChange, compress);

  return (
    <div className="flex flex-col gap-2">
      <PhotoThumbs photoIds={photoIds} onChange={onChange} busy={busy} />
      {input}
      <label
        htmlFor={inputId}
        className="min-h-11 cursor-pointer rounded text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-focus"
      >
        {t('photos.add')}
      </label>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t('photo.failed')}
        </p>
      )}
    </div>
  );
}

function Thumb({ id, alt, compact }: { id: string; alt: string; compact: boolean }) {
  const url = usePhoto(id);
  const size = compact ? 'size-16 rounded-lg' : 'h-24 w-24 rounded';
  if (!url) return <div className={`${size} bg-surface`} aria-hidden="true" />;
  return <img src={url} alt={alt} className={`${size} object-cover`} />;
}
