import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signQr } from "../../src/modules/attendance/domain/qr";
const branchId = "20000000-0000-4000-8000-000000000001";
const membershipId = "30000000-0000-4000-8000-000000000001";
test.afterEach(async ({ page }, info) => {
  if (info.status !== "passed") return;
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      elements: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});
function workspace(role = "employee") {
  return {
    member: {
      id: membershipId,
      company_id: "a",
      user_id: "u",
      display_name: "Test İşçi",
      role,
      archived_at: null,
    },
    companyName: "Test Biznesi",
    branches: [
      {
        id: branchId,
        company_id: "a",
        name: "Test filialı",
        latitude: 40.4093,
        longitude: 49.8671,
        radius_m: 100,
      },
    ],
    shifts: [],
    attendance: [],
    corrections: [],
    employmentTerms: null,
    leaveRequests: [],
  };
}
async function mockWorkspace(page: Page, role = "employee") {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({ json: workspace(role) }),
  );
}
async function enterQr(page: Page) {
  await page.getByRole("button", { name: "QR ilə giriş et" }).click();
  await page.getByText("QR keçidini əl ilə daxil et", { exact: true }).click();
  await page
    .getByLabel("QR keçidi və ya kod")
    .fill(signQr(branchId, "fixture-signing-secret-at-least-32-characters"));
  await page.getByRole("button", { name: "Kodu istifadə et" }).click();
}
test("QR survives account login and is sent unchanged on attendance submission", async ({
  page,
  context,
}) => {
  const token = signQr(
    branchId,
    "fixture-signing-secret-at-least-32-characters",
  );
  let authenticated = false;
  await page.route("**/api/workspace", (route) =>
    route.fulfill(
      authenticated
        ? { json: workspace() }
        : {
            status: 401,
            json: {
              error: {
                code: "UNAUTHENTICATED",
                message: "Hesabınıza daxil olun.",
              },
            },
          },
    ),
  );
  await page.route("**/api/auth", async (route) => {
    authenticated = true;
    await route.fulfill({ json: { success: true } });
  });
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 40.4093,
    longitude: 49.8671,
    accuracy: 10,
  });
  let submittedToken = "";
  await page.route("**/api/attendance", async (route) => {
    submittedToken = route.request().postDataJSON().token;
    await route.fulfill({ json: { id: "attendance-fixture" } });
  });
  await page.goto(`/isci?qr=${encodeURIComponent(token)}`);
  await page
    .getByRole("link", { name: "Giriş səhifəsinə keç", exact: true })
    .click();
  await page.getByLabel("E-poçt ünvanı").fill("worker@example.com");
  await page.getByLabel("Şifrə", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Daxil ol", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Məkanı yoxla və təsdiqlə" }).click();
  await expect.poll(() => submittedToken).toBe(token);
});

test("demo stays isolated even when Supabase is configured", async ({
  page,
}) => {
  let workspaceReads = 0;
  await page.route("**/api/workspace", (route) => {
    workspaceReads++;
    return route.fulfill({ json: workspace() });
  });
  await page.goto("/demo");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "QR ilə giriş et" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tanışlıq rejimində davamiyyət qeydi yaradılmır",
  );
  expect(workspaceReads).toBe(0);
});

test("employee can submit a leave request from the dashboard", async ({ page }) => {
  await mockWorkspace(page);
  let submitted: unknown;
  await page.route("**/api/leave-requests", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { id: "leave-fixture" } });
  });
  await page.goto("/isci");
  await page.getByRole("button", { name: "İcazə və məzuniyyət" }).click();
  await page.getByLabel("Başlanğıc tarixi").fill("2026-11-10");
  await page.getByLabel("Bitiş tarixi").fill("2026-11-11");
  await page.getByLabel("Səbəb", { exact: true }).fill("Şəxsi səbəbə görə");
  await page.getByRole("button", { name: "Müraciəti göndər" }).click();
  await expect.poll(() => submitted).toMatchObject({ type: "leave", startsOn: "2026-11-10", endsOn: "2026-11-11" });
});

test("successful server response confirms check-in and refreshes state", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 40.4093,
    longitude: 49.8671,
    accuracy: 10,
  });
  await mockWorkspace(page);
  await page.route("**/api/attendance", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      direction: "in",
      latitude: 40.4093,
      longitude: 49.8671,
    });
    await route.fulfill({ json: { id: "attendance-fixture" } });
  });
  await page.goto("/isci");
  await expect(
    page.getByRole("button", { name: "Hesabdan çıx" }),
  ).toBeVisible();
  await enterQr(page);
  await page.getByRole("button", { name: "Məkanı yoxla və təsdiqlə" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Girişiniz qeydə alındı",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("denied geolocation never submits attendance and offers correction", async ({
  page,
}) => {
  let writes = 0;
  await mockWorkspace(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _ok: unknown,
          fail: (e: { code: number }) => void,
        ) => fail({ code: 1 }),
      },
    });
  });
  await page.route("**/api/attendance", (route) => {
    writes++;
    return route.fulfill({ json: { id: "must-not-happen" } });
  });
  await page.goto("/isci");
  await expect(
    page.getByRole("button", { name: "Hesabdan çıx" }),
  ).toBeVisible();
  await enterQr(page);
  await page.getByRole("button", { name: "Məkanı yoxla və təsdiqlə" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Məkan müəyyən edilmədi",
  );
  await page
    .getByRole("button", { name: "Problem var? Düzəliş müraciəti göndər" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Düzəliş müraciəti");
  expect(writes).toBe(0);
});
test("failed network never confirms a clock-in", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 40.4093,
    longitude: 49.8671,
    accuracy: 10,
  });
  await mockWorkspace(page);
  await page.route("**/api/attendance", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("/isci");
  await expect(
    page.getByRole("button", { name: "Hesabdan çıx" }),
  ).toBeVisible();
  await enterQr(page);
  await page.getByRole("button", { name: "Məkanı yoxla və təsdiqlə" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Əməliyyat təsdiqlənməyib",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("status")).not.toBeVisible();
});
test("submits a reasoned correction in Baku timezone", async ({ page }) => {
  await mockWorkspace(page);
  await page.route("**/api/corrections", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      branchId,
      attendanceId: null,
      requestedIn: "2026-10-20T05:00:00.000Z",
      requestedOut: "2026-10-20T14:00:00.000Z",
      reason: "Giriş qeydi unudulub",
    });
    await route.fulfill({ json: { id: "correction-fixture" } });
  });
  await page.goto("/isci/muracietler");
  await expect(
    page.getByRole("button", { name: "Hesabdan çıx" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yeni müraciət" }).click();
  await page.getByLabel("Düzgün giriş vaxtı").fill("2026-10-20T09:00");
  await page.getByLabel("Düzgün çıxış vaxtı").fill("2026-10-20T18:00");
  await page.getByLabel("Səbəb", { exact: true }).fill("Giriş qeydi unudulub");
  await page.getByRole("button", { name: "Müraciəti göndər" }).click();
  await expect(page.getByRole("status")).toContainText("rəhbərə göndərildi");
});
test("manager approval requires reason and consumes the server response", async ({
  page,
}) => {
  await mockWorkspace(page, "owner");
  let decided = false;
  await page.route("**/api/corrections**", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({
        id: "50000000-0000-4000-8000-000000000001",
        decision: "approved",
        reason: "Növbə ilə yoxlanıldı",
      });
      decided = true;
      return route.fulfill({
        json: { id: "50000000-0000-4000-8000-000000000001" },
      });
    }
    return route.fulfill({
      json: {
        corrections: decided
          ? []
          : [
              {
                id: "50000000-0000-4000-8000-000000000001",
                membership_id: membershipId,
                requested_in: "2026-10-20T05:00Z",
                requested_out: "2026-10-20T14:00Z",
                reason: "Girişi unutmuşam",
              },
            ],
        attendance: [],
        members: [{ id: membershipId, display_name: "Test İşçi" }],
      },
    });
  });
  await page.goto("/rehber/davamiyyet");
  await page.getByRole("button", { name: "Təsdiqlə", exact: true }).click();
  await page.getByLabel("Qərarın səbəbi").fill("Növbə ilə yoxlanıldı");
  await page.getByRole("button", { name: "Qərarı saxla" }).click();
  await expect(page.getByRole("status")).toContainText("auditə yazıldı");
  expect(decided).toBe(true);
});
