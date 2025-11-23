import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Middagsplanlegger/);
});

test('can navigate to login', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Sign In');
  await expect(page).toHaveURL(/.*login/);
});
