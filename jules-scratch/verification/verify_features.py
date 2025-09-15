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
        expect(page.get_by_role("heading", name="Brukerprofil")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/profile_page.png")
        print("Profile page screenshot taken.")

        # Meal Library & Favorite Screenshot
        print("Navigating to meal library...")
        page.goto("http://localhost:3000/meals/browse")
        page.wait_for_load_state("load")
        time.sleep(1)
        expect(page.get_by_role("heading", name="Middagsbibliotek")).to_be_visible()

        print("Favoriting a meal...")
        first_meal_card = page.locator(".flex.flex-wrap.gap-4 > div").first
        favorite_button = first_meal_card.get_by_role("button", name="Legg til i favoritter")
        if favorite_button:
            favorite_button.click()
            expect(first_meal_card.get_by_role("button", name="Fjern fra favoritter")).to_be_visible()

        page.screenshot(path="jules-scratch/verification/meal_library.png")
        print("Meal library screenshot taken.")

        unfavorite_button = first_meal_card.get_by_role("button", name="Fjern fra favoritter")
        if unfavorite_button:
            unfavorite_button.click()

        # Calendar Tabs Screenshot
        print("Navigating to calendar...")
        page.goto("http://localhost:3000/")
        page.wait_for_load_state("load")
        time.sleep(1)

        print("Clicking on a calendar day...")
        page.locator("div.grid-cols-7 > div:not([class*='bg-gray-50'])").nth(5).click()

        expect(page.get_by_role("heading", name=re.compile("Velg middag for.*"))).to_be_visible()
        expect(page.get_by_role("button", name="Alle Middager")).to_be_visible()
        expect(page.get_by_role("button", name="Favoritter")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/calendar_tabs.png")
        print("Calendar tabs screenshot taken.")

        page.locator("body").press("Escape")

        # Meal Edit Modal Screenshot
        print("Testing meal edit modal...")
        page.goto("http://localhost:3000/")
        page.wait_for_load_state("load")
        time.sleep(1)

        page.locator("div.grid-cols-7 > div:not([class*='bg-gray-50'])").nth(5).click()
        page.locator(".flex.flex-wrap.gap-4 > div").first.click()

        page.get_by_role("button", name="Rediger kun for i dag").click()
        expect(page.get_by_role("heading", name=re.compile("Rediger:.*"))).to_be_visible()
        page.screenshot(path="jules-scratch/verification/edit_modal.png")
        print("Edit modal screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        print("Closing browser.")
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
