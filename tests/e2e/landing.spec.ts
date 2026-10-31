import { expect, test } from "@playwright/test";

test("welcome screen leads to a separate demo and login", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Kim gəlib, kim çıxıb? Bir baxışda." }),
  ).toBeVisible();
  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "Daxil ol", exact: true }),
  ).toHaveAttribute("href", "/giris");
  await header.getByRole("link", { name: "Demoya bax", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/, { timeout: 15000 });
  await expect(
    page.getByText("Tanışlıq rejimi", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("link", { name: "Davamiyyətim", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/tarixce$/, { timeout: 15000 });
  await page
    .getByRole("link", { name: "Müraciətlərim", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/demo\/muracietler$/, { timeout: 15000 });
  expect(errors).toEqual([]);
});

test("welcome features, mobile navigation and login link work", async ({
  page,
}, info) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menyunu aç" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(
      page.getByRole("button", { name: "Menyunu bağla" }),
    ).toHaveAttribute("aria-expanded", "true");
    await page
      .getByRole("navigation", { name: "Mobil naviqasiya" })
      .getByRole("link", { name: "İmkanlar" })
      .click();
    await expect(
      page.getByRole("button", { name: "Menyunu aç" }),
    ).toHaveAttribute("aria-expanded", "false");
  }
  await page.getByText("Səbəbli düzəlişlər", { exact: true }).click();
  await expect(
    page.getByText(
      "Unudulmuş qeyd üçün müraciət göndərin. Rəhbər səbəbi yoxlayıb qərar versin.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `.runtime/welcome-${info.project.name}-${Date.now()}.png`,
    fullPage: true,
  });
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Daxil ol", exact: true })
    .click();
  await expect(page.getByLabel("E-poçt ünvanı")).toBeVisible({ timeout: 15000 });
});
