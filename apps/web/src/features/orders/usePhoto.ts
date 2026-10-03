import { useEffect, useState } from 'react';
import { useStore } from '../../data/StoreContext';

/** The data URL of a photo kept on this device; null until it has loaded or if it is missing. */
export function usePhoto(id: string): string | null {
  const store = useStore();
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void store.getPhoto(id).then((url) => {
      if (!cancelled) setLoaded({ id, url });
    });
    return () => {
      cancelled = true;
    };
  }, [store, id]);

  return loaded && loaded.id === id ? loaded.url : null;
}
