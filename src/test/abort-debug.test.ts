import { describe, it, expect } from "vitest";

describe("abort debug", () => {
  it("checks AbortSignal.timeout", () => {
    try {
      const signal = AbortSignal.timeout(15000);
      expect(signal).toBeDefined();
    } catch (e) {
      console.log("AbortSignal.timeout error:", e instanceof Error ? e.message : String(e));
    }
  });

  it("tests fetch with MSW", async () => {
    // Import server from our setup
    const { http, HttpResponse } = await import("msw");
    const { setupServer } = await import("msw/node");
    
    const server = setupServer(
      http.get("/api/analyses/test", () => {
        return HttpResponse.json({ name: "test" });
      })
    );
    
    server.listen({ onUnhandledRequest: "warn" });
    
    const res = await fetch("/api/analyses/test");
    const data = await res.json();
    console.log("fetch result:", JSON.stringify(data));
    expect(data.name).toBe("test");
    
    server.close();
  });
});
