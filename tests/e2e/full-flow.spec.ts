import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

const writeEnabled = process.env.E2E_WRITE_ENABLED === 'true';

test.describe('Full Application Flow', () => {
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

  test('Complete User Journey: Create Recipe -> Plan -> Shop -> Inbox', async ({ page }) => {
    test.setTimeout(60000); // Extend timeout for debugging
    await ensureLoggedIn(page);
    await page.goto('/dashboard/recipes/create');
    await page.getByRole('heading', { name: 'Create Recipe' }).waitFor();

    // Wait for the page to be ready
    await expect(page.getByRole('heading', { name: 'Create Recipe' })).toBeVisible();

    const uniqueRecipeName = `E.g. Grandma's Pancakes ${Date.now()}`;
    await page.getByPlaceholder("e.g. Grandma's Pancakes").fill(uniqueRecipeName);
    await page.locator('input[type="number"]').nth(0).fill('4');
    await page.locator('input[type="number"]').nth(1).fill('45');

    await page.getByTestId('add-ingredient-button').click();

    await page.getByPlaceholder('Ingredient name').last().fill('Test Flour');
    await page.getByPlaceholder('0', { exact: true }).last().fill('500');

    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByPlaceholder('Step 1 details...').fill('Mix everything well.');

    await page.getByRole('button', { name: 'Save Recipe' }).click();
    await page.goto('/dashboard/recipes');

    await page.getByPlaceholder('Search recipes...').fill(uniqueRecipeName);
    await expect(page.getByText(uniqueRecipeName)).toBeVisible({ timeout: 15000 });

    const today = new Date().toISOString().split('T')[0];
    await page.goto(`/dashboard/recipes?planDate=${today}`);
    await page.getByPlaceholder('Search recipes...').fill(uniqueRecipeName);
    await page.getByRole('button', { name: 'Select' }).first().click();

    await page.waitForURL(/.*\/dashboard\/planner/);
    await expect(page.getByText(uniqueRecipeName)).toBeVisible();

    await page.getByRole('link', { name: 'Shop' }).first().click();

        await expect(page.getByText('Test Flour')).toBeVisible();

    await page.getByPlaceholder('Add item').fill('Manual E2E Item');
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-plus') }).click();
    await expect(page.getByText('Manual E2E Item')).toBeVisible();

    await page.getByRole('link', { name: 'Inbox' }).first().click();
    const suggestionText = `Pizza Night ${Date.now()}`;
    await page.getByPlaceholder('I want to eat...').fill(suggestionText);
    await page.getByRole('button', { name: 'Suggest' }).click();

    await expect(page.getByText(suggestionText)).toBeVisible();
  });
});
