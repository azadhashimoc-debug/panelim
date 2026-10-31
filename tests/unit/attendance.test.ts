import { describe, expect, it } from "vitest";
import {
  assertLocation,
  distanceMeters,
} from "@/modules/attendance/domain/location";
import {
  assertTransition,
  bakuDay,
} from "@/modules/attendance/domain/attendance";
import { signQr, verifyQr } from "@/modules/attendance/domain/qr";
import { authorizeBranch } from "@/modules/organization/domain/access";

describe("location checks", () => {
  const branch = { latitude: 40.4093, longitude: 49.8671, radius_m: 100 };
  it("accepts coordinates at the branch", () =>
    expect(() =>
      assertLocation(branch, {
        latitude: 40.4093,
        longitude: 49.8671,
        accuracy: 10,
      }),
    ).not.toThrow());
  it("rejects a point outside the allowed radius", () =>
    expect(() =>
      assertLocation(branch, {
        latitude: 40.4193,
        longitude: 49.8671,
        accuracy: 10,
      }),
    ).toThrow("OUTSIDE_BRANCH"));
  it.each([NaN, Infinity, 91, -91])("rejects invalid latitude %s", (latitude) =>
    expect(() =>
      assertLocation(branch, { latitude, longitude: 49, accuracy: 10 }),
    ).toThrow("INVALID_LOCATION"),
  );
  it.each([0, -1, 101, NaN])("rejects unreliable accuracy %s", (accuracy) =>
    expect(() =>
      assertLocation(branch, {
        latitude: 40.4093,
        longitude: 49.8671,
        accuracy,
      }),
    ).toThrow("LOCATION_ACCURACY"),
  );
  it("does not accept an uncertain position straddling the boundary", () =>
    expect(() =>
      assertLocation(branch, {
        latitude: 40.4098,
        longitude: 49.8671,
        accuracy: 60,
      }),
    ).toThrow("OUTSIDE_BRANCH"));
  it("uses meters for geographic distances", () =>
    expect(
      distanceMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(111195, -1));
});

describe("attendance transitions", () => {
  it("rejects a second check-in", () =>
    expect(() => assertTransition("in", true)).toThrow("ALREADY_CHECKED_IN"));
  it("rejects checkout without check-in", () =>
    expect(() => assertTransition("out", false)).toThrow("NOT_CHECKED_IN"));
  it("accepts valid transitions", () => {
    expect(() => assertTransition("in", false)).not.toThrow();
    expect(() => assertTransition("out", true)).not.toThrow();
  });
  it("uses the Baku calendar rather than UTC", () =>
    expect(bakuDay("2026-10-31T21:00:00Z")).toBe("2026-11-01"));
});

describe("signed branch QR", () => {
  const secret = "test-only-signing-key-with-at-least-32-chars";
  const branchId = "11111111-1111-4111-8111-111111111111";
  it("validates an unexpired token and yields its branch", () =>
    expect(verifyQr(signQr(branchId, secret, 1000), secret, 1050)).toBe(
      branchId,
    ));
  it("rejects expired, tampered and wrong-secret tokens", () => {
    const token = signQr(branchId, secret, 1000);
    expect(() => verifyQr(token, secret, 1121)).toThrow("INVALID_QR");
    expect(() => verifyQr(token + "x", secret, 1050)).toThrow("INVALID_QR");
    expect(() =>
      verifyQr(token, "other-secret-with-at-least-32-characters", 1050),
    ).toThrow("INVALID_QR");
  });
  it("rejects a token dated in the future", () =>
    expect(() =>
      verifyQr(signQr(branchId, secret, 2000), secret, 1000),
    ).toThrow("INVALID_QR"));
});

describe("branch permissions", () => {
  const member = { company_id: "a", role: "employee", archived_at: null };
  it("rejects cross-company branches", () =>
    expect(() =>
      authorizeBranch(member, { company_id: "b" }, true, "attendance"),
    ).toThrow("FORBIDDEN"));
  it("rejects employees attempting approval", () =>
    expect(() =>
      authorizeBranch(member, { company_id: "a" }, true, "manage"),
    ).toThrow("FORBIDDEN"));
  it("rejects an unassigned manager", () =>
    expect(() =>
      authorizeBranch(
        { ...member, role: "manager" },
        { company_id: "a" },
        false,
        "manage",
      ),
    ).toThrow("FORBIDDEN"));
  it("rejects archived employees", () =>
    expect(() =>
      authorizeBranch(
        { ...member, archived_at: "2026-01-01" },
        { company_id: "a" },
        true,
        "attendance",
      ),
    ).toThrow("FORBIDDEN"));
  it("allows an assigned employee and company owner", () => {
    expect(() =>
      authorizeBranch(member, { company_id: "a" }, true, "attendance"),
    ).not.toThrow();
    expect(() =>
      authorizeBranch(
        { ...member, role: "owner" },
        { company_id: "a" },
        false,
        "manage",
      ),
    ).not.toThrow();
  });
});
