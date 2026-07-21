import { describe, it, expect } from "vitest";
import { qk } from "./queryKeys";

describe("queryKeys", () => {
  it("returns stable scalar keys", () => {
    expect(qk.me()).toEqual(["me"]);
    expect(qk.dashboardStats()).toEqual(["dashboard-stats"]);
    expect(qk.workspaces()).toEqual(["workspaces"]);
  });

  it("normalizes an omitted analyses query to an empty string", () => {
    // React Query keys must be deterministic — undefined and "" must collapse
    // to the same cache entry or the list re-fetches needlessly.
    expect(qk.analyses()).toEqual(["analyses", ""]);
    expect(qk.analyses(undefined)).toEqual(["analyses", ""]);
  });

  it("keeps a provided analyses query in the key", () => {
    expect(qk.analyses("db")).toEqual(["analyses", "db"]);
  });

  it("scopes entity keys by id", () => {
    expect(qk.analysis("a1")).toEqual(["analysis", "a1"]);
    expect(qk.chat("a1")).toEqual(["chat", "a1"]);
    expect(qk.workspace("w1")).toEqual(["workspace", "w1"]);
  });

  it("nests agent reports under their analysis id", () => {
    expect(qk.agentReport("a1", "cost")).toEqual(["analysis", "a1", "agent", "cost"]);
  });

  it("produces distinct keys for different ids", () => {
    expect(qk.analysis("a1")).not.toEqual(qk.analysis("a2"));
  });
});
