import { lazy, type ComponentType } from 'react';

/** A lazily loaded page from a module's named export, so each section downloads only when opened. */
export function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }));
}
