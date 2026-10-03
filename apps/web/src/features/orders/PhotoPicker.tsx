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

/** Take photos with the phone camera (a file picker on desktop), shrink them and keep them on the device. */
export function PhotoPicker({ photoIds, onChange, compress = compressPhoto }: Props) {
  const { t, number } = useI18n();
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

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2">
        {photoIds.map((id, index) => (
          <li key={id} className="relative">
            <Thumb id={id} alt={t('photos.photo', { n: number(index + 1) })} />
            <button
              type="button"
              disabled={busy}
              className="absolute right-0 top-0 min-h-11 min-w-11 rounded bg-surface text-text"
              aria-label={t('photos.remove', { n: number(index + 1) })}
              onClick={() => onChange(photoIds.filter((p) => p !== id))}
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
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
      <label
        htmlFor={inputId}
        className="min-h-11 cursor-pointer rounded text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-brand"
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

function Thumb({ id, alt }: { id: string; alt: string }) {
  const url = usePhoto(id);
  if (!url) return <div className="h-24 w-24 rounded bg-surface" aria-hidden="true" />;
  return <img src={url} alt={alt} className="h-24 w-24 rounded object-cover" />;
}
