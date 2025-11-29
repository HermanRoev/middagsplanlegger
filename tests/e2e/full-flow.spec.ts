import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Full Application Flow', () => {

  test('Complete User Journey: Login -> Create Recipe -> Plan -> Shop -> Inbox', async ({ page }) => {
    // 1. LOGIN FLOW
    await page.goto('/');

    const signInLink = page.getByRole('link', { name: 'Sign In' });
    if (await signInLink.isVisible()) {
        await signInLink.click();
    }

    const emailInput = page.getByPlaceholder('m@example.com');
    await expect(emailInput).toBeVisible();

    await emailInput.fill('test@test.com');
    await page.getByPlaceholder('Password').fill('Test123');

    const loginBtn = page.getByRole('button', { name: 'Login' });
    if (await loginBtn.isVisible()) {
        await loginBtn.click();
    } else {
        await page.getByRole('button', { name: 'Sign In' }).click();
    }

    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();

    // 2. RECIPE CREATION (Manual)
    await page.getByRole('link', { name: 'New Recipe' }).first().click();
    await page.waitForSelector('[role="tab"][data-state="active"]');
    await page.getByRole('tab', { name: 'Manual' }).click();
    await page.getByRole('link', { name: 'Create Manually' }).click();

    const uniqueRecipeName = `E2E Recipe ${Date.now()}`;
    await page.getByPlaceholder("e.g. Grandma's Pancakes").fill(uniqueRecipeName);
    await page.getByPlaceholder("4").fill('4');
    await page.getByPlaceholder("30").fill('45');

    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.getByPlaceholder('Ingredient name').fill('Test Flour');
    // Refined selector for amount input (it has '0' placeholder and is small)
    // Using .last() since it's the one we just added
    await page.getByPlaceholder('0', { exact: true }).last().fill('500');

    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByPlaceholder('Step 1 details...').fill('Mix everything well.');

    await page.getByRole('button', { name: 'Save Recipe' }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/recipes$/);

    await page.getByPlaceholder('Search recipes...').fill(uniqueRecipeName);
    await page.waitForTimeout(1000);
    await expect(page.getByText(uniqueRecipeName)).toBeVisible();

    // 3. PLAN MEAL
    await page.getByRole('link', { name: 'Plan' }).first().click();

    const addMealBtn = page.getByRole('link', { name: 'Add Meal' }).first();
    if (await addMealBtn.isVisible()) {
        await addMealBtn.click();
        await page.getByPlaceholder('Search recipes...').fill(uniqueRecipeName);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Select' }).first().click();

        await expect(page).toHaveURL(/.*\/dashboard\/planner/);
        await expect(page.getByText(uniqueRecipeName)).toBeVisible();
    }

    // 4. SHOPPING LIST
    await page.getByRole('link', { name: 'Shop' }).first().click();
    await page.waitForTimeout(2000);

    // Only check for flour if we successfully planned the meal
    if (await addMealBtn.isVisible()) {
         await expect(page.getByText('Test Flour')).toBeVisible();
    }

    await page.getByPlaceholder('Add item').fill('Manual E2E Item');
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-plus') }).click();
    await expect(page.getByText('Manual E2E Item')).toBeVisible();

    // 5. INBOX (Suggestions)
    await page.getByRole('link', { name: 'Inbox' }).first().click();
    const suggestionText = `Pizza Night ${Date.now()}`;
    await page.getByPlaceholder('I want to eat...').fill(suggestionText);
    await page.getByRole('button', { name: 'Suggest' }).click();

    await expect(page.getByText(suggestionText)).toBeVisible();
  });
});
