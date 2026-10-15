import { expect, test } from '@playwright/test';
import { isPhone, openShop } from './helpers';

test.beforeEach(({ page }) => {
  test.skip(!isPhone(page), 'phone layout only');
});

test('the orders search, sort and status chips stay under the header while the list scrolls', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  await page.goto('/app/orders');
  const search = page.getByRole('searchbox', { name: 'অর্ডার খুঁজুন' });
  await expect(search).toBeVisible();
  const header = (await page.locator('header').boundingBox())!;

  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
  const box = (await search.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(box.y).toBeLessThan(header.y + header.height + 40);

  await page.getByRole('button', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }).click();
  await expect(search).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the customer search and add button stay under the header while the list scrolls', async ({ page }) => {
  await openShop(page, 'নকশী বুটিক');
  await page.goto('/app/customers');
  const search = page.getByRole('searchbox', { name: 'কাস্টমার খুঁজুন' });
  await expect(search).toBeVisible();
  const header = (await page.locator('header').boundingBox())!;

  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
  const box = (await search.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(box.y).toBeLessThan(header.y + header.height + 40);
  await expect(page.getByRole('link', { name: 'নতুন কাস্টমার' })).toBeInViewport();

  await page.getByRole('button', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }).click();
  await expect(search).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
