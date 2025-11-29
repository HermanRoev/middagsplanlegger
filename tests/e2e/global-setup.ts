import { chromium } from '@playwright/test';
import * as fs from 'fs';

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.text()));
  await page.goto('http://localhost:3000/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', 'Test123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/dashboard');
  await page.context().storageState({ path: 'tests/e2e/storageState.json' });
  await browser.close();
}

export default globalSetup;
