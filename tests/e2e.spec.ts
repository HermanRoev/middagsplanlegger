import { test, expect } from '@playwright/test';
import { format } from 'date-fns';

test.describe('Full E2E Flow', () => {
  test('User can login, create recipe, plan meal, and check shopping list', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout to 60s

    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'Test123');
    await page.click('button:has-text("Login")');

    // Verify login success
    await expect(page).toHaveURL(/\/dashboard/);

    // Take screenshot of dashboard
    await page.screenshot({ path: 'tests/screenshots/dashboard.png' });

    // 2. Create Recipe (Manual)
    await page.goto('/dashboard/recipes/create');

    // Wait for "Recipe Name" input
    const nameInput = page.getByPlaceholder("e.g. Grandma's Pancakes");
    await nameInput.waitFor();
    await nameInput.fill('Test Pasta');

    // Servings
    await page.locator('input[type="number"]').nth(0).fill('4');

    // Add ingredient
    await page.click('button:has-text("Add Ingredient")');

    // Fill ingredient details
    await page.getByPlaceholder('Name').last().fill('Pasta');
    await page.getByPlaceholder('Qty').last().fill('500');
    await page.locator('select').last().selectOption('g');

    // Add instructions
    await page.locator('textarea').first().fill('Boil water. Cook pasta.');

    // Save
    await page.click('button:has-text("Save Recipe")');

    // Verify redirect to recipe list /dashboard/recipes
    await expect(page).toHaveURL(/\/dashboard\/recipes/);
    await page.screenshot({ path: 'tests/screenshots/recipes-list.png' });

    // 3. Plan Meal
    // Calculate today's date YYYY-MM-DD
    const today = format(new Date(), 'yyyy-MM-dd');

    // Go to recipes page with planDate param
    await page.goto(`/dashboard/recipes?planDate=${today}`);

    // Find the card for "Test Pasta"
    const card = page.locator('.group').filter({ hasText: 'Test Pasta' }).first();
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Select' }).click();

    // Verify redirect to planner
    await expect(page).toHaveURL(/\/dashboard\/planner/);
    await page.screenshot({ path: 'tests/screenshots/planner-updated.png' });

    // Verify "Test Pasta" is on the planner (ignoring toast)
    // We can check that we have at least one instance
    await expect(page.getByText('Test Pasta').first()).toBeVisible();

    // 4. Shopping List
    await page.goto('/dashboard/shop');
    // Verify content instead of title if title is generic
    // Use getByRole for heading to be specific
    await expect(page.getByRole('heading', { name: /Handleliste|Shop|Shopping/ })).toBeVisible();

    // Verify Pasta is in the list
    await expect(page.getByText('Pasta')).toBeVisible();

    // Check for "Planned" label to confirm source
    await expect(page.getByText('(Planned)').first()).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/shopping-list.png' });

    // 5. Cupboard
    await page.goto('/dashboard/cupboard');
    // Verify content
    await expect(page.getByRole('heading', { name: /Cupboard|Skap/ })).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/cupboard.png' });
  });
});
