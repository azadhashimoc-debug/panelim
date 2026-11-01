import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const owner = "10000000-0000-4000-8000-000000000001";
const worker = "10000000-0000-4000-8000-000000000002";
const branch = "20000000-0000-4000-8000-000000000001";
const initialStatus = {
  plan_tier: "free", effective_plan: "free", status: "active", days_left: 0,
  extra_branches: 0, active_employees: 4, max_employees: 3,
  active_branches: 2, max_branches: 1, is_limit_exceeded: true,
};
async function openPlan(page: Page) {
  await page.goto("/rehber");
  await page.getByRole("button", { name: "Abunə", exact: true }).click();
}
async function fixture(page: Page, failOnce = false) {
  let completed = false;
  const keys: string[] = [];
  await page.route("**/api/rehber", route => route.fulfill({ json: {
    company: { id: "c1", name: "Panelim Biznes" },
    member: { id: owner, display_name: "Sahib", role: "owner" },
    branches: [{ id: branch, name: "Mərkəz", latitude: 40.4, longitude: 49.8, radius_m: 100, is_active: true, plan_disabled_at: null }],
    team: [{ id: owner, display_name: "Sahib", role: "owner", branch_id: branch, plan_disabled_at: null }],
    branchAssignments: [], shifts: [], leaveRequests: [], corrections: [], advances: [], employmentTerms: [], payrollPeriods: [], todayAttendance: []
  } }));
  await page.route("**/api/billing", route => route.fulfill({ json: { ok: true, status: completed ? { ...initialStatus, active_employees: 2, active_branches: 1, is_limit_exceeded: false } : initialStatus } }));
  await page.route("**/api/billing/selection", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: {
      status: initialStatus, ownerMembershipId: owner,
      members: [{ id: owner, display_name: "Sahib", role: "owner" }, { id: worker, display_name: "Aylin", role: "employee" },
        { id: "10000000-0000-4000-8000-000000000003", display_name: "Nigar", role: "manager" },
        { id: "10000000-0000-4000-8000-000000000004", display_name: "Rəşad", role: "employee" }],
      branches: [{ id: branch, name: "Mərkəz" }, { id: "20000000-0000-4000-8000-000000000002", name: "İkinci filial" }],
    } });
    const input = route.request().postDataJSON();
    expect(input.memberIds).toEqual([owner, worker]);
    expect(input.branchId).toBe(branch);
    keys.push(input.idempotencyKey);
    if (failOnce && keys.length === 1) return route.fulfill({ status: 503, json: { error: { message: "Əməliyyat təsdiqlənmədi. Yenidən cəhd edin." } } });
    completed = true;
    return route.fulfill({ json: { ok: true, success: true, idempotent: false } });
  });
  return keys;
}
test("owner completes Free selection and sees persisted counts on mobile and desktop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await fixture(page);
  await openPlan(page);
  await expect(page.getByRole("heading", { name: "Free üçün aktiv heyət və filial" })).toBeVisible();
  await expect(page.getByLabel("Sahib (sahib)")).toBeChecked();
  await expect(page.getByLabel("Sahib (sahib)")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Seçimi təsdiqlə" })).toBeDisabled();
  await page.getByLabel("Aylin").check();
  await page.getByLabel("Mərkəz", { exact: true }).check();
  await page.getByRole("button", { name: "Seçimi təsdiqlə" }).click();
  await expect(page.getByRole("status")).toContainText("Seçim saxlanıldı");
  await expect(page.getByText("2 / 3 işçi", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 1 filial", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free üçün aktiv heyət və filial" })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
test("selection caps the total at three including the owner", async ({ page }) => {
  await fixture(page); await openPlan(page);
  await page.getByLabel("Aylin").check(); await page.getByLabel("Nigar", { exact: true }).check();
  await expect(page.getByLabel("Rəşad")).toBeDisabled();
  await page.getByLabel("Aylin").uncheck();
  await expect(page.getByLabel("Rəşad")).toBeEnabled();
});
test("a failed selection keeps choices and reuses the same retry key", async ({ page }) => {
  const keys = await fixture(page, true); await openPlan(page);
  await page.getByLabel("Aylin").check(); await page.getByLabel("Mərkəz", { exact: true }).check();
  await page.getByRole("button", { name: "Seçimi təsdiqlə" }).click();
  await expect(page.getByRole("alert")).toContainText("Əməliyyat təsdiqlənmədi");
  await expect(page.getByLabel("Aylin")).toBeChecked();
  await expect(page.getByRole("status")).not.toBeVisible();
  await page.getByRole("button", { name: "Seçimi təsdiqlə" }).click();
  await expect(page.getByRole("status")).toContainText("Seçim saxlanıldı");
  expect(keys).toHaveLength(2); expect(keys[0]).toBeTruthy(); expect(keys[0]).toBe(keys[1]);
});
test("choosing a proposed package does not alter the displayed current limits", async ({ page }) => {
  await page.route("**/api/billing", route => route.fulfill({ json: { ok: true, status: { ...initialStatus, is_limit_exceeded: false, active_employees: 2, active_branches: 1 } } }));
  await openPlan(page);
  await page.getByLabel("Paket", { exact: true }).selectOption("growth");
  await expect(page.getByRole("heading", { name: "Cari paket: FREE" })).toBeVisible();
  await expect(page.getByText("2 / 3 işçi", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paketi seç" })).toBeEnabled();
});
test("unavailable subscription data shows a retry and no invented trial", async ({ page }) => {
  await page.route("**/api/billing", route => route.fulfill({ status: 401, json: { error: { message: "Hesabınıza daxil olun." } } }));
  await openPlan(page);
  await expect(page.getByRole("alert")).toContainText("Hesabınıza daxil olun");
  await expect(page.getByRole("button", { name: "Yenidən yoxla" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Cari paket:/ })).not.toBeVisible();
});
