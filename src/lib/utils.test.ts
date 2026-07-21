import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins plain class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy conditional classes", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("merges conflicting tailwind utilities, last wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("keeps non-conflicting tailwind utilities", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("flattens arrays and object maps", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  it("returns an empty string for no meaningful input", () => {
    expect(cn(false, null, undefined, "")).toBe("");
  });
});
