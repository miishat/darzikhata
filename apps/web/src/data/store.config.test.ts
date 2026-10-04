import { afterEach, describe, expect, it } from 'vitest';
import type { SeedShopKey } from '../seed/shops';
import { DarziDb } from './db';
import { ShopStore } from './store';

let count = 0;
const dbs: DarziDb[] = [];

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function demoStore(shop: SeedShopKey = 'nakshi') {
  const db = new DarziDb(`config-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  await store.startDemo(shop);
  return { db, store };
}

describe('ShopStore.updateConfig', () => {
  it('saves a valid change, tells the screens, and keeps it after a reload', async () => {
    const { db, store } = await demoStore();
    let heard = 0;
    store.subscribe(() => heard++);
    const outcome = await store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 7 } }));
    expect(outcome).toEqual({ ok: true });
    expect(store.getSnapshot().config!.settings.linkExpiryDays).toBe(7);
    expect(heard).toBe(1);

    const reloaded = new ShopStore({ db });
    await reloaded.load();
    expect(reloaded.getSnapshot().config!.settings.linkExpiryDays).toBe(7);
  });

  it('refuses an invalid setup and changes nothing', async () => {
    const { store } = await demoStore();
    const before = store.getSnapshot().config;
    const outcome = await store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 0 } }));
    expect(outcome).toEqual({ ok: false, problems: ['invalid-link-expiry'] });
    expect(store.getSnapshot().config).toBe(before);
  });

  it('will not let the signed-in person deactivate themselves or remove this device', async () => {
    const { store } = await demoStore();
    const me = store.getSnapshot().session!.staffId!;
    const self = await store.updateConfig((c) => ({ ...c, staff: c.staff.map((s) => (s.id === me ? { ...s, active: false } : s)) }));
    expect(self.ok === false && self.problems).toContain('self-inactive');
    const device = await store.updateConfig((c) => ({ ...c, devices: c.devices.map((d) => ({ ...d, id: 'other' })) }));
    expect(device).toEqual({ ok: false, problems: ['device-missing'] });
  });

  it('applies queued changes one after another, each to the latest setup', async () => {
    const { store } = await demoStore();
    await Promise.all([
      store.updateConfig((c) => ({ ...c, profile: { ...c.profile, phone: '01700000000' } })),
      store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 10 } })),
    ]);
    const config = store.getSnapshot().config!;
    expect(config.profile.phone).toBe('01700000000');
    expect(config.settings.linkExpiryDays).toBe(10);
  });

  it('leaves orders alone when a template’s stages change', async () => {
    const { store } = await demoStore('rahman');
    const before = store.getSnapshot().state;
    const outcome = await store.updateConfig((c) => ({
      ...c,
      templates: c.templates.map((t) => (t.id === 'shirt' ? { ...t, stages: t.stages.filter((s) => s.key !== 'trial') } : t)),
    }));
    expect(outcome.ok).toBe(true);
    expect(store.getSnapshot().state).toBe(before);
  });
});
