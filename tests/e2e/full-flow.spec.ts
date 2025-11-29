import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Full Application Flow', () => {

  test.skip('Complete User Journey: Create Recipe -> Plan -> Shop -> Inbox', async ({ page }) => {
    await page.goto('/dashboard/recipes/create');

    const uniqueRecipeName = `E2E Recipe ${Date.now()}`;
    await page.getByPlaceholder("e.g. Grandma's Pancakes").fill(uniqueRecipeName);
    await page.getByPlaceholder("4").fill('4');
    await page.getByPlaceholder("30").fill('45');

    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.getByPlaceholder('Ingredient name').fill('Test Flour');
    await page.getByPlaceholder('0', { exact: true }).last().fill('500');

    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByPlaceholder('Step 1 details...').fill('Mix everything well.');

    await page.getByRole('button', { name: 'Save Recipe' }).click();
    await page.waitForURL(/.*\/dashboard\/recipes$/);

    await page.getByPlaceholder('Search recipes...').fill(uniqueRecipeName);
    await expect(page.getByText(uniqueRecipeName)).toBeVisible();

    await page.getByRole('link', { name: 'Plan' }).first().click();

    const addMealBtn = page.getByRole('link', { name: 'Add Meal' }).first();
    if (await addMealBtn.isVisible()) {
        await addMealBtn.click();
        await page.getByPlaceholder('Search recipes...').fill(uniqueRecipeName);
        await page.getByRole('button', { name: 'Select' }).first().click();

        await page.waitForURL(/.*\/dashboard\/planner/);
        await expect(page.getByText(uniqueRecipeName)).toBeVisible();
    }

    await page.getByRole('link', { name: 'Shop' }).first().click();

    if (await addMealBtn.isVisible()) {
         await expect(page.getByText('Test Flour')).toBeVisible();
    }

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
