import { useId, useState, type ChangeEvent } from 'react';
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

  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    setBusy(true);
    try {
      const added: string[] = [];
      for (const file of files) added.push(await store.savePhoto(await compress(file)));
      onChange([...photoIds, ...added]);
    } finally {
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
              className="absolute right-0 top-0 min-h-11 min-w-11 rounded bg-surface text-text"
              aria-label={t('photos.remove', { n: number(index + 1) })}
              onClick={() => onChange(photoIds.filter((p) => p !== id))}
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      <label htmlFor={inputId} className="min-h-11 cursor-pointer text-primary">
        {t('photos.add')}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        disabled={busy}
        className="sr-only"
        onChange={(e) => void add(e)}
      />
    </div>
  );
}

function Thumb({ id, alt }: { id: string; alt: string }) {
  const url = usePhoto(id);
  if (!url) return <div className="h-24 w-24 rounded bg-surface" aria-hidden="true" />;
  return <img src={url} alt={alt} className="h-24 w-24 rounded object-cover" />;
}
