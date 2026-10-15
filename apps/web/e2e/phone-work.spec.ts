import { expect, test } from '@playwright/test';
import { isPhone, openShop } from './helpers';

test.beforeEach(({ page }) => {
  test.skip(!isPhone(page), 'phone layout only');
});

test('the work step tabs and print stay under the header while the list scrolls', async ({ page }) => {
  await openShop(page, 'নকশী বুটিক');
  await page.goto('/app/work');
  const tabs = page.getByRole('tablist', { name: 'ধাপ' });
  await expect(tabs).toBeVisible();
  const header = (await page.locator('header').boundingBox())!;

  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
  const box = (await tabs.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(box.y).toBeLessThan(header.y + header.height + 40);
  await expect(page.getByRole('link', { name: 'তালিকা প্রিন্ট করুন' })).toBeInViewport();
});
