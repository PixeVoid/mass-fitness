import { describe, expect, it } from "vitest";
import {
  isAuthEntryRoute,
  isAuthedRoute,
  loginUrlFor,
  safeRedirectTarget,
} from "@/lib/routes";

describe("isAuthedRoute", () => {
  it("covers every gated area", () => {
    for (const path of ["/dashboard", "/onboarding", "/live/abc", "/admin",
                        "/admin/groups", "/coach", "/coach/groups", "/subscribe",
                        "/subscribe/group"]) {
      expect(isAuthedRoute(path), path).toBe(true);
    }
  });

  it("leaves the public site alone", () => {
    for (const path of ["/", "/faq", "/blog", "/blog/a-post", "/about",
                        "/assessment", "/privacy-policy", "/online-fitness-classes"]) {
      expect(isAuthedRoute(path), path).toBe(false);
    }
  });

  it("does not match a route that merely starts with the same letters", () => {
    // "/coaching-tips" is a public page name waiting to happen.
    expect(isAuthedRoute("/coaching-tips")).toBe(false);
    expect(isAuthedRoute("/administrator")).toBe(false);
    expect(isAuthedRoute("/subscribers")).toBe(false);
  });
});

describe("isAuthEntryRoute", () => {
  it("is only the login screen", () => {
    expect(isAuthEntryRoute("/login")).toBe(true);
    expect(isAuthEntryRoute("/dashboard")).toBe(false);
  });
});

describe("safeRedirectTarget", () => {
  it("keeps a same-origin path", () => {
    expect(safeRedirectTarget("/dashboard")).toBe("/dashboard");
  });

  it("refuses an absolute URL — that is an open redirect", () => {
    expect(safeRedirectTarget("https://evil.example/steal")).toBe("/dashboard");
  });

  it("refuses a protocol-relative URL", () => {
    expect(safeRedirectTarget("//evil.example")).toBe("/dashboard");
  });

  it("refuses null and empty", () => {
    expect(safeRedirectTarget(null)).toBe("/dashboard");
    expect(safeRedirectTarget("")).toBe("/dashboard");
  });
});

describe("loginUrlFor", () => {
  it("carries the destination through", () => {
    expect(loginUrlFor("/dashboard", "?a=1")).toBe(
      "/login?next=%2Fdashboard%3Fa%3D1",
    );
  });

  it("drops a destination that is not same-origin", () => {
    expect(loginUrlFor("//evil.example", "")).toBe("/login");
  });
});
