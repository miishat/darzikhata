import { expect, test } from '@playwright/test';
import { isPhone, openShop } from './helpers';

// The shell's content area must not become its own scroll container, or nothing inside it sticks.
test.beforeEach(({ page }) => {
  test.skip(isPhone(page), 'laptop layout only');
});

test('the selection bar is on screen as soon as a garment is selected on a long work list', async ({ page }) => {
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

  await page.mouse.wheel(0, 600);
  await expect.poll(async () => (await bar.boundingBox())!.y + box.height).toBeLessThanOrEqual(height);
});

test('the orders panel stays in view while the table scrolls', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  await page.goto('/app/orders');
  await page.getByRole('table', { name: 'অর্ডার তালিকা' }).getByRole('row').nth(1).click();
  const panel = page.getByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  await expect(panel).toBeVisible();
  await page.mouse.move(300, 400);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(120);
});
