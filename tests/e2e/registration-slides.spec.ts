import { test, expect } from "@playwright/test";

test.describe("Registration Slide-by-Slide Onboarding", () => {
  test("navigates through steps with Enter key and arrow buttons, preserves data", async ({
    page,
  }) => {
    await page.goto("/qeydiyyat");

    // Wait for the stepper to load
    await expect(page.locator(".onboarding-stepper")).toBeVisible();
    await expect(page.locator(".onboarding-step-badge")).toHaveText(/Addım 1 \/ 6/i);
    await expect(page.locator(".onboarding-question")).toHaveText("Adınız və soyadınız nədir?");

    // Step 0 -> Step 1 via inline arrow button
    const nameInput = page.locator(".onboarding-input");
    await nameInput.fill("Nigar Əliyeva");
    await page.locator(".onboarding-input-arrow-btn").click();

    // Verify Step 2
    await expect(page.locator(".onboarding-step-badge")).toHaveText(/Addım 2 \/ 6/i);
    await expect(page.locator(".onboarding-question")).toHaveText(
      "Biznesinizin və ya obyektinizin adı nədir?"
    );

    // Step 1 -> Step 2 via Enter key
    const companyInput = page.locator(".onboarding-input");
    await companyInput.fill("Nizami Kafe");
    await companyInput.press("Enter");

    // Verify Step 3
    await expect(page.locator(".onboarding-step-badge")).toHaveText(/Addım 3 \/ 6/i);
    await expect(page.locator(".onboarding-question")).toHaveText("İlk filialınızın adı nə olsun?");

    // Step 2 -> Step 3 via header next arrow button
    await page.locator(".onboarding-header-next-btn").click();

    // Verify Step 4 (Email)
    await expect(page.locator(".onboarding-step-badge")).toHaveText(/Addım 4 \/ 6/i);
    await expect(page.locator(".onboarding-question")).toHaveText("Rəsmi e-poçt ünvanınız?");

    // Step 3 -> Step 4 via inline arrow button
    const emailInput = page.locator(".onboarding-input");
    await emailInput.fill("nigar@biznes.az");
    await page.locator(".onboarding-input-arrow-btn").click();

    // Verify Step 5 (Password)
    await expect(page.locator(".onboarding-step-badge")).toHaveText(/Addım 5 \/ 6/i);
    await expect(page.locator(".onboarding-question")).toHaveText("Təhlükəsiz şifrə təyin edin");

    // Test header back arrow button
    await page.locator(".onboarding-header-back-btn").click();

    // Verify back to Step 4 and email is preserved
    await expect(page.locator(".onboarding-step-badge")).toHaveText(/Addım 4 \/ 6/i);
    await expect(page.locator(".onboarding-input")).toHaveValue("nigar@biznes.az");

    // Forward to Step 5 again via Enter
    await page.locator(".onboarding-input").press("Enter");
    await expect(page.locator(".onboarding-step-badge")).toHaveText(/Addım 5 \/ 6/i);

    // Screenshot of step 5
    await page.screenshot({ path: "test-results/registration-slide-arrows.png" });
  });
});
