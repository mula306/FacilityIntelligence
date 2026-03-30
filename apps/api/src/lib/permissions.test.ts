import { describe, expect, it } from "vitest";
import { hasPermission, permissionMatches } from "./permissions.js";

describe("permissionMatches", () => {
  it("matches exact permissions", () => {
    expect(permissionMatches("location:read", "location:read")).toBe(true);
  });

  it("matches resource wildcards", () => {
    expect(permissionMatches("location:*", "location:write")).toBe(true);
  });

  it("matches platform wildcard", () => {
    expect(permissionMatches("platform:*", "audit:read")).toBe(true);
  });

  it("rejects unrelated permissions", () => {
    expect(permissionMatches("audit:read", "location:write")).toBe(false);
  });
});

describe("hasPermission", () => {
  it("returns true when any permission matches", () => {
    expect(hasPermission(["audit:read", "location:*"], "location:write")).toBe(true);
  });
});
