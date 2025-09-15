import re
import time
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        print("Waiting for dev server to start...")
        time.sleep(15)

        print("Navigating to login page...")
        page.goto("http://localhost:3000/login")
        page.wait_for_load_state("load")

        print("Filling login form...")
        page.get_by_label("E-post").fill("test@test.com")
        page.get_by_label("Passord").fill("Test123")
        page.get_by_role("button", name="Logg inn").click()

        print("Waiting for navigation to home page...")
        page.wait_for_url("http://localhost:3000/", timeout=10000)
        page.wait_for_load_state("load")

        # Meal Card Screenshot
        print("Navigating to meal library...")
        page.goto("http://localhost:3000/meals/browse")
        page.wait_for_load_state("load")
        time.sleep(1)
        expect(page.locator("[data-testid='meal-card']").first).to_be_visible()
        page.screenshot(path="jules-scratch/verification/meal_card_fix.png")
        print("Meal card screenshot taken.")

        # Modal Backdrop Screenshot
        print("Testing modal backdrop...")
        page.locator("[data-testid='meal-card']").first.click()
        modal_content = page.locator("[data-testid='modal-content']")
        expect(modal_content).to_be_visible()
        page.screenshot(path="jules-scratch/verification/modal_backdrop_fix.png")
        print("Modal backdrop screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_v3.png")

    finally:
        print("Closing browser.")
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
