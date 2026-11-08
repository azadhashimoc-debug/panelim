import { expect, test, type Page } from "@playwright/test";

const company = { id: "a0000000-0000-4000-8000-000000000001", name: "Nizami Kafe" };
const branch = {
  id: "b0000000-0000-4000-8000-000000000001",
  company_id: company.id,
  name: "Mərkəz",
  latitude: 40.4,
  longitude: 49.8,
  radius_m: 100,
};
const owner = {
  id: "c0000000-0000-4000-8000-000000000001",
  company_id: company.id,
  user_id: "10000000-0000-4000-8000-000000000001",
  display_name: "Nigar Sahib",
  role: "owner",
  archived_at: null,
};
const employee = {
  id: "c0000000-0000-4000-8000-000000000002",
  company_id: company.id,
  user_id: "10000000-0000-4000-8000-000000000002",
  display_name: "Leyla İşçi",
  role: "employee",
  archived_at: null,
};
const LINK = "https://panelim.az/davet#t=fixture-token-value-0123456789";

function hubData(team: unknown[]) {
  return {
    company,
    member: owner,
    branches: [branch],
    team,
    employmentTerms: [],
    branchAssignments: [],
    shifts: [],
    leaveRequests: [],
    corrections: [],
    advances: [],
    payrollPeriods: [],
    todayAttendance: [],
  };
}

async function mockHub(page: Page) {
  const posts: { action?: string }[] = [];
  let team: unknown[] = [owner];
  await page.route("**/api/rehber", async (route) => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: hubData(team) });
    const body = request.postDataJSON() as { action?: string };
    posts.push(body);
    if (body.action === "add_employee") {
      team = [owner, employee];
      return route.fulfill({ json: { success: true, membershipId: employee.id } });
    }
    if (body.action === "create_access_link") return route.fulfill({ json: { url: LINK } });
    return route.fulfill({ status: 400, json: { error: { code: "INVALID_INPUT", message: "Səhv sorğu" } } });
  });
  return posts;
}

test("adding an employee keeps the real company on screen and offers the login link", async ({ page }) => {
  const posts = await mockHub(page);
  await page.goto("/rehber");
  await expect(page.getByText("Nigar Sahib").first()).toBeVisible();

  const menu = page.getByRole("button", { name: "İşçilər" }).first();
  await menu.click();
  await page.getByRole("button", { name: "İşçi əlavə et" }).click();
  await page.locator("dialog[open] input[name=displayName]").fill("Leyla İşçi");
  await page.locator("dialog[open] input[name=email]").fill("leyla@biznes.az");
  await page.getByRole("button", { name: "İşçini təsdiqlə" }).click();

  const dialog = page.getByRole("dialog", { name: "Leyla İşçi: giriş linki" });
  await expect(dialog.getByRole("textbox")).toHaveValue(LINK);
  await expect(dialog.getByRole("link", { name: "WhatsApp ilə göndər" })).toHaveAttribute(
    "href",
    new RegExp(encodeURIComponent("/davet#t=fixture-token-value")),
  );
  expect(posts.map((p) => p.action)).toEqual(["add_employee", "create_access_link"]);

  await dialog.getByRole("button", { name: "Bağla" }).click();
  await expect(page.getByText("RƏHBƏR DEMO")).toHaveCount(0);
  await expect(page.getByText("Nizami Kafe").first()).toBeVisible();
  await expect(page.getByText("Kamran Qasımov")).toHaveCount(0);
});

test("the invite page explains a link without a token and sends nothing", async ({ page }) => {
  await page.goto("/davet");
  await expect(page.getByRole("alert").filter({ hasText: "Link tam deyil" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Şifrəni təsdiqlə" })).toHaveCount(0);
});

test("the invite page requires both passwords to match before spending the token", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/auth", (route) => {
    calls += 1;
    return route.fulfill({ json: { success: true, redirect: "/isci" } });
  });
  await page.goto("/davet#t=fixture-token-value-0123456789");
  await page.locator("input[name=password]").fill("sifre-birinci-123");
  await page.locator("input[name=confirm]").fill("sifre-ikinci-123");
  await page.getByRole("button", { name: "Şifrəni təsdiqlə" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Şifrələr eyni deyil" })).toBeVisible();
  expect(calls).toBe(0);
});
