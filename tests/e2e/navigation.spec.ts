import { test, expect } from "@playwright/test";
test("history and requests remain reachable on mobile", async ({ page }) => {
  await page.goto("/isci");
  await page.getByRole("link", { name: "Davamiyyətim", exact: true }).click();
  // Development routes compile on first navigation; wait for that route before its UI.
  await expect(page).toHaveURL(/\/isci\/tarixce$/, { timeout: 30000 });
  await expect(
    page.getByRole("heading", { name: "Davamiyyət tarixçəniz" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Müraciətlərim", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/isci\/muracietler$/, { timeout: 30000 });
  await expect(
    page.getByRole("heading", { name: "Müraciətləriniz" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yeni müraciət" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("login has labeled controls and clearly blocks unconfigured auth", async ({
  page,
}) => {
  await page.goto("/giris");
  await page.getByLabel("E-poçt ünvanı").fill("worker@example.com");
  await page.getByLabel("Şifrə", { exact: true }).fill("example-only-password");
  await page.getByRole("button", { name: "Şifrəni göstər" }).click();
  await expect(page.getByLabel("Şifrə", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await expect(
    page.getByRole("button", { name: "Daxil ol", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("manager workspace does not show invented employees or approvals", async ({
  page,
}) => {
  await page.goto("/rehber/davamiyyet");
  await expect(
    page.getByRole("heading", { name: "Filialın davamiyyəti" }),
  ).toBeVisible();
  await expect(
    page.getByText("Rəhbər hesabınıza daxil olun", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filial QR kodu" }),
  ).toBeDisabled();
});
