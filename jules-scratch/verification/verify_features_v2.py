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

        # Profile Page Screenshot
        print("Navigating to profile page...")
        page.goto("http://localhost:3000/profile")
        page.wait_for_load_state("load")
        time.sleep(1)
        expect(page.get_by_role("link", name="Kalender")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/profile_page_nav_fix.png")
        print("Profile page screenshot taken.")

        # Meal Library Sorting Screenshot
        print("Navigating to meal library...")
        page.goto("http://localhost:3000/meals/browse")
        page.wait_for_load_state("load")
        time.sleep(1)

        print("Sorting by favorites...")
        page.get_by_role("combobox").select_option("favorites")
        time.sleep(1) # Wait for sort to apply
        page.screenshot(path="jules-scratch/verification/meal_library_sorted.png")
        print("Meal library sorted screenshot taken.")

        # Modal Close Test
        print("Testing modal closing...")
        page.locator("[data-testid='meal-card']").first.click()
        modal_content = page.locator("[data-testid='modal-content']")
        expect(modal_content).to_be_visible()

        print("Testing close with Escape key...")
        page.locator("body").press("Escape")
        time.sleep(1)
        expect(modal_content).not_to_be_visible()
        print("Modal closed with Escape key.")

        print("Testing close with backdrop click...")
        page.locator("[data-testid='meal-card']").first.click()
        expect(modal_content).to_be_visible()
        page.locator("[data-testid='modal-backdrop']").click(force=True, position={'x': 10, 'y': 10})
        time.sleep(1)
        expect(modal_content).not_to_be_visible()
        print("Modal closed with backdrop click.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_v2.png")

    finally:
        print("Closing browser.")
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
