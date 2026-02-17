import { test, expect } from '@playwright/test';

const writeEnabled = process.env.E2E_WRITE_ENABLED === 'true';

test.describe('Inbox Approve Flow', () => {
  test.skip(!writeEnabled, 'Set E2E_WRITE_ENABLED=true to run write tests');
  const ensureLoggedIn = async (page: any) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@test.com');
      await page.locator('input[type="password"]').fill('Test123');
      await page.getByRole('button', { name: 'Login' }).click();
      await page.waitForURL(/\/dashboard/);
    }
  };

  test('can approve and plan a suggestion', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    const suggestionText = `E2E Suggestion ${Date.now()}`;

    await ensureLoggedIn(page);
    await page.goto('/dashboard/inbox');
    await page.getByRole('button', { name: 'Sign Out' }).waitFor();
    await page.getByRole('heading', { name: 'Family Inbox' }).waitFor();

    await page.getByPlaceholder('I want to eat...').fill(suggestionText);
    const suggestButton = page.getByRole('button', { name: 'Suggest' });
    await expect(suggestButton).toBeVisible();
    await suggestButton.click({ force: true });
    await page.waitForTimeout(1000);
    await page.reload();
    await page.getByRole('heading', { name: 'Family Inbox' }).waitFor();

    await expect(page.getByText(suggestionText)).toBeVisible({ timeout: 15000 });

    const suggestionCard = page.locator('div').filter({ hasText: suggestionText }).first();
    await suggestionCard.getByTitle('Approve & Plan').click();

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
    await dateInput.fill(today);

    await page.getByRole('button', { name: 'Approve & Plan' }).click();

    await expect(page.getByText('Approved')).toBeVisible();
  });
});
