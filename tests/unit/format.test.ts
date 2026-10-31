import { expect, it } from "vitest";
import { date, dateWithYear, formatMoney, time } from "@/shared/i18n/az";
it("formats Azerbaijan dates consistently across the Baku date boundary", () => {
  expect(date("2026-10-31T21:00:00Z")).toBe("1 noyabr");
  expect(date("2026-10-31T10:00:00Z")).toBe("31 oktyabr");
  expect(dateWithYear("2025-04-14T00:00:00+04:00")).toBe("14 aprel 2025");
  expect(time("2026-10-31T21:05:00Z")).toBe("01:05");
  expect(formatMoney(85000)).toBe("850,00 ₼");
  expect(formatMoney(1550)).toBe("15,50 ₼");
});
