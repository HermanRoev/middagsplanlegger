import { test, expect } from '@playwright/test';

test.describe('Recipe Search', () => {
  test('should filter recipes by search term', async ({ page }) => {
    await page.goto('/dashboard/recipes');

    await page.waitForSelector('h1:has-text("Recipes")');

    await page.fill('input[placeholder="Search recipes..."]', 'chicken');

    await page.waitForTimeout(500);

    const recipeCards = await page.$$('div.group');
    if (recipeCards.length === 0) {
      console.log(await page.content());
    }
    for (const card of recipeCards) {
      const title = await card.$eval('h3', el => el.textContent);
      expect(title?.toLowerCase()).toContain('chicken');
    }
  });
});
