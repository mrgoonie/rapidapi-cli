import { describe, it, expect, afterEach } from "bun:test";
import { buildRequest, executeRequest } from "../src/lib/http-client.ts";
import { installFetchMock, jsonResponse, textResponse } from "./helpers/fetch-mock.ts";

let restore: (() => void) | null = null;

afterEach(() => {
  restore?.();
  restore = null;
});

describe("buildRequest", () => {
  it("builds correct URL with host and path", () => {
    const req = buildRequest({ host: "api.example.com", path: "/v1/test", method: "GET", headers: {}, query: {}, apiKey: "sk_test" });
    expect(req.url).toBe("https://api.example.com/v1/test");
  });

  it("prepends slash to path if missing", () => {
    const req = buildRequest({ host: "api.example.com", path: "v1/test", method: "GET", headers: {}, query: {}, apiKey: "sk_test" });
    expect(req.url).toBe("https://api.example.com/v1/test");
  });

  it("sets x-rapidapi-key and x-rapidapi-host headers", () => {
    const req = buildRequest({ host: "api.example.com", path: "/", method: "GET", headers: {}, query: {}, apiKey: "sk_test_fake" });
    expect(req.headers.get("x-rapidapi-key")).toBe("sk_test_fake");
    expect(req.headers.get("x-rapidapi-host")).toBe("api.example.com");
  });

  it("appends query params to URL", () => {
    const req = buildRequest({ host: "api.example.com", path: "/search", method: "GET", headers: {}, query: { q: "hello", limit: "5" }, apiKey: "sk_test" });
    const url = new URL(req.url);
    expect(url.searchParams.get("q")).toBe("hello");
    expect(url.searchParams.get("limit")).toBe("5");
  });

  it("handles repeated query keys as array", () => {
    const req = buildRequest({ host: "api.example.com", path: "/", method: "GET", headers: {}, query: { tag: ["a", "b"] }, apiKey: "sk_test" });
    const url = new URL(req.url);
    expect(url.searchParams.getAll("tag")).toEqual(["a", "b"]);
  });

  it("sets content-type for POST with body", () => {
    const req = buildRequest({ host: "api.example.com", path: "/", method: "POST", headers: {}, query: {}, body: '{"x":1}', apiKey: "sk_test" });
    expect(req.headers.get("content-type")).toBe("application/json");
  });

  it("does not attach body for GET", () => {
    const req = buildRequest({ host: "api.example.com", path: "/", method: "GET", headers: {}, query: {}, body: '{"x":1}', apiKey: "sk_test" });
    // Body should be null for GET
    expect(req.body).toBeNull();
  });

  it("user headers are included below rapidapi headers priority", () => {
    const req = buildRequest({ host: "api.example.com", path: "/", method: "GET", headers: { "x-custom": "foo" }, query: {}, apiKey: "sk_test" });
    expect(req.headers.get("x-custom")).toBe("foo");
  });
});

describe("executeRequest", () => {
  it("returns status, headers, body, durationMs on 200", async () => {
    const mock = installFetchMock([{ match: /.*/, respond: jsonResponse({ ok: true }) }]);
    restore = mock.restore;
    const req = new Request("https://api.example.com/");
    const result = await executeRequest(req, 5000);
    expect(result.status).toBe(200);
    expect(result.body).toContain("true");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns 404 status without throwing", async () => {
    const mock = installFetchMock([{ match: /.*/, respond: new Response("not found", { status: 404 }) }]);
    restore = mock.restore;
    const req = new Request("https://api.example.com/");
    const result = await executeRequest(req, 5000);
    expect(result.status).toBe(404);
  });

  it("throws on network error (fetch rejects)", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("Network failure"); }) as unknown as typeof fetch;
    restore = () => { globalThis.fetch = original; };
    const req = new Request("https://api.example.com/");
    await expect(executeRequest(req, 5000)).rejects.toThrow("Network failure");
  });
});
