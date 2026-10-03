import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach } from 'vitest';
import { App } from '../app/App';
import { DarziDb } from '../data/db';
import { ShopStore } from '../data/store';
import type { SeedShopKey } from '../seed/shops';

let count = 0;
const dbs: DarziDb[] = [];

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

export interface RenderAppOptions {
  layout: 'mobile' | 'desktop';
  path?: string;
  shop?: SeedShopKey;
  /** Sign in as this staff member instead of the owner. */
  as?: { staffId: string; pin: string };
  language?: 'bn' | 'en';
}

/**
 * Renders the whole app the way main.tsx does, inside a data router so navigation
 * blocking works, with its own fresh IndexedDB database.
 */
export async function renderApp({ layout, path = '/', shop, as, language }: RenderAppOptions) {
  window.localStorage.setItem('dk.layout', layout);
  if (language) window.localStorage.setItem('dk.language', language);
  const db = new DarziDb(`app-test-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  if (shop) await store.startDemo(shop);
  else await store.load();
  if (as) {
    await store.signOut();
    await store.signIn(as.staffId, as.pin);
  }
  const router = createMemoryRouter([{ path: '*', element: <App store={store} /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return { store, router };
}
