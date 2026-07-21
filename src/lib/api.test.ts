import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "./api";
import { getStoredToken } from "./supabase";

// The `request()` wrapper in api.ts owns auth headers, CSRF, timeout handling,
// cold-start retry, and error normalization. These tests stub the global fetch
// (overriding MSW) so we exercise that wrapper logic directly.

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./supabase", () => ({
  getStoredToken: vi.fn(() => null),
  setStoredToken: vi.fn(),
}));

const mockedGetToken = vi.mocked(getStoredToken);

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function lastFetchInit(): RequestInit {
  const mock = fetch as unknown as ReturnType<typeof vi.fn>;
  return mock.mock.calls.at(-1)![1] as RequestInit;
}

function lastHeaders(): Record<string, string> {
  return lastFetchInit().headers as Record<string, string>;
}

beforeEach(() => {
  mockedGetToken.mockReturnValue(null);
  // Clear any CSRF cookie between tests.
  document.cookie = "archmind_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("api.request — success paths", () => {
  it("returns parsed JSON on a 200 response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ id: "me-1", email: "a@b.com" }),
    );
    const profile = await api.me();
    expect(profile).toEqual({ id: "me-1", email: "a@b.com" });
    expect(fetch).toHaveBeenCalledWith("/api/auth/me", expect.any(Object));
  });

  it("returns undefined for a 204 No Content response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    await expect(api.removeMember("w1", "m1")).resolves.toBeUndefined();
  });

  it("encodes the analyses search query", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse([]));
    await api.listAnalyses("a b&c");
    expect(fetch).toHaveBeenCalledWith("/api/analyses?q=a%20b%26c", expect.any(Object));
  });
});

describe("api.request — headers", () => {
  it("omits the Authorization header when no token is stored", async () => {
    mockedGetToken.mockReturnValue(null);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}));
    await api.me();
    expect(lastHeaders().Authorization).toBeUndefined();
  });

  it("attaches a Bearer token when one is stored", async () => {
    mockedGetToken.mockReturnValue("tok-123");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}));
    await api.me();
    expect(lastHeaders().Authorization).toBe("Bearer tok-123");
  });

  it("sets a JSON Content-Type for non-FormData bodies", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}));
    await api.demoLogin("a@b.com", "pw");
    expect(lastHeaders()["Content-Type"]).toBe("application/json");
  });

  it("does not set Content-Type for FormData uploads (browser sets the boundary)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}));
    await api.uploadAnalysis(new FormData());
    expect(lastHeaders()["Content-Type"]).toBeUndefined();
  });

  it("sends credentials and disables caching on every request", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}));
    await api.me();
    const init = lastFetchInit();
    expect(init.credentials).toBe("include");
    expect(init.cache).toBe("no-store");
  });
});

describe("api.request — CSRF", () => {
  it("adds the X-CSRF-Token header on mutating requests when the cookie is present", async () => {
    document.cookie = "archmind_csrf=csrf-abc";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}));
    await api.demoLogin("a@b.com", "pw");
    expect(lastHeaders()["X-CSRF-Token"]).toBe("csrf-abc");
  });

  it("does not add the CSRF header on GET requests", async () => {
    document.cookie = "archmind_csrf=csrf-abc";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}));
    await api.me();
    expect(lastHeaders()["X-CSRF-Token"]).toBeUndefined();
  });
});

describe("api.request — error handling", () => {
  it("throws an ApiError carrying the server detail and status", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ detail: "Not allowed" }, { status: 403 }),
    );
    const err = await api.me().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Not allowed");
    expect(err.status).toBe(403);
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("boom", { status: 500, statusText: "Server Error" }),
    );
    const err = await api.me().catch((e) => e);
    expect(err.message).toBe("Server Error");
    expect(err.status).toBe(500);
  });

  it("maps a fetch timeout/abort to a 408 ApiError", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DOMException("timed out", "TimeoutError"),
    );
    await expect(api.demoLogin("a@b.com", "pw")).rejects.toMatchObject({
      status: 408,
    });
  });

  it("maps an unreachable network to a status 0 ApiError", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.demoLogin("a@b.com", "pw")).rejects.toMatchObject({
      status: 0,
    });
  });
});

describe("api.request — cold-start retry", () => {
  it("retries an idempotent GET once after a connection failure, then resolves", async () => {
    vi.useFakeTimers();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
      .mockResolvedValueOnce(jsonResponse({ id: "me-1" }));

    const promise = api.me();
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toEqual({ id: "me-1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-idempotent POST (avoids duplicate writes)", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    await expect(api.demoLogin("a@b.com", "pw")).rejects.toMatchObject({ status: 408 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("api.warmup", () => {
  it("pings the health endpoint without throwing on failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("down"));
    expect(() => api.warmup()).not.toThrow();
    expect(fetch).toHaveBeenCalledWith("/api/health", expect.objectContaining({ method: "GET" }));
  });
});
