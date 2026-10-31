import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
for (const path of ["/", "/demo", "/isci", "/giris", "/rehber/davamiyyet"]) {
  test(`accessible labels, structure and contrast on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
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
}
