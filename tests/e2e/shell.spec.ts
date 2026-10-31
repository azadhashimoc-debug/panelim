import { expect, test } from "@playwright/test";
test("employee workspace has an accessible mobile shell and no overflow", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/isci");
  await expect(
    page.getByRole("heading", { name: "İş gününüz bir baxışda" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Əsas naviqasiya" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Məzmuna keç" })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole("link", { name: "Məzmuna keç" }).blur();
  await page.screenshot({
    path: `.runtime/employee-${testInfo.project.name}-${Date.now()}.png`,
    fullPage: true,
  });
});
test("unconfigured attendance never pretends to save", async ({ page }) => {
  await page.goto("/isci");
  await expect(
    page.getByText("Tanışlıq rejimi", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "QR ilə giriş et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Hesabınıza daxil olun");
  await expect(
    page.getByRole("link", { name: "Giriş səhifəsinə keç" }),
  ).toBeVisible();
});
test("protected endpoints reject unavailable configuration without leaking details", async ({
  request,
}) => {
  const response = await request.get("/api/workspace");
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({
    error: { code: "NOT_CONFIGURED" },
  });
  const crossSite = await request.post("/api/attendance", {
    headers: { origin: "https://attacker.example" },
    data: {},
  });
  expect(crossSite.status()).toBe(403);
});
