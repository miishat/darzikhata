import { expect, test } from '@playwright/test';
import { isPhone, openShop } from './helpers';

// The shell's content area must not become its own scroll container, or nothing inside it sticks.
test.beforeEach(({ page }) => {
  test.skip(isPhone(page), 'laptop layout only');
});

test('the selection bar stays in the work card while a long list scrolls inside it', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  await page.goto('/app/work?view=list');
  const checkboxes = page.getByRole('tabpanel').getByRole('checkbox');
  await expect(checkboxes.first()).toBeVisible();
  expect(await checkboxes.count()).toBeGreaterThan(12);
  await checkboxes.first().check();

  const bar = page.getByRole('region', { name: 'বাছাই করা পোশাক' });
  await expect(bar).toBeVisible();
  const box = (await bar.boundingBox())!;
  const height = page.viewportSize()!.height;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(height);

  const list = page.getByRole('tabpanel');
  await list.hover();
  await page.mouse.wheel(0, 600);
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect((await bar.boundingBox())!.y).toBe(box.y);
});

test('the orders table scrolls inside its card while the page and the panel stay put', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  await page.goto('/app/orders');
  await page.getByRole('table', { name: 'অর্ডার তালিকা' }).getByRole('row').nth(1).click();
  const panel = page.getByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  await expect(panel).toBeVisible();
  const list = page.getByRole('tabpanel');
  await list.hover();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(120);
});

test('the work list groups line their columns up with each other', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  await page.goto('/app/work?view=list&by=stage');
  const tables = page.getByRole('tabpanel').getByRole('table');
  await expect(tables.nth(1)).toBeVisible();
  const edges = (n: number) =>
    tables.nth(n).locator('thead th').evaluateAll((cells) => cells.map((c) => Math.round(c.getBoundingClientRect().left)));
  const first = await edges(0);
  expect(first.length).toBeGreaterThan(3);
  const count = await tables.count();
  for (let n = 1; n < count; n++) expect(await edges(n)).toEqual(first);
});
