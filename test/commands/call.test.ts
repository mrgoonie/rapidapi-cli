import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { buildRequest } from "../../src/lib/http-client.ts";
import { installFetchMock, jsonResponse } from "../helpers/fetch-mock.ts";

let restore: (() => void) | null = null;

afterEach(() => {
  restore?.();
  restore = null;
});

describe("call command — header injection", () => {
  it("injects x-rapidapi-key from config", () => {
    const req = buildRequest({
      host: "twitter154.p.rapidapi.com",
      path: "/search",
      method: "GET",
      headers: {},
      query: { q: "bun" },
      apiKey: "sk_test_fake",
    });
    expect(req.headers.get("x-rapidapi-key")).toBe("sk_test_fake");
    expect(req.headers.get("x-rapidapi-host")).toBe("twitter154.p.rapidapi.com");
  });

  it("does not leak key in URL query string", () => {
    const req = buildRequest({
      host: "api.example.com",
      path: "/v1",
      method: "GET",
      headers: {},
      query: {},
      apiKey: "sk_test_fake",
    });
    expect(req.url).not.toContain("sk_test_fake");
  });
});

describe("call command — end-to-end with mocked fetch", () => {
  it("returns JSON body from mocked 200 response", async () => {
    const { executeRequest } = await import("../../src/lib/http-client.ts");
    const mock = installFetchMock([{
      match: /api\.example\.com/,
      respond: jsonResponse({ message: "hello world" }),
    }]);
    restore = mock.restore;

    const req = buildRequest({
      host: "api.example.com",
      path: "/v1",
      method: "GET",
      headers: {},
      query: {},
      apiKey: "sk_test_fake",
    });
    const result = await executeRequest(req, 5000);
    expect(result.status).toBe(200);
    const parsed = JSON.parse(result.body) as { message: string };
    expect(parsed.message).toBe("hello world");
  });

  it("returns 401 status without throwing", async () => {
    const { executeRequest } = await import("../../src/lib/http-client.ts");
    const mock = installFetchMock([{
      match: /.*/,
      respond: new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    }]);
    restore = mock.restore;

    const req = buildRequest({
      host: "api.example.com",
      path: "/v1",
      method: "GET",
      headers: {},
      query: {},
      apiKey: "sk_test_fake",
    });
    const result = await executeRequest(req, 5000);
    expect(result.status).toBe(401);
  });

  it("handles 5xx response", async () => {
    const { executeRequest } = await import("../../src/lib/http-client.ts");
    const mock = installFetchMock([{
      match: /.*/,
      respond: new Response("internal server error", { status: 500 }),
    }]);
    restore = mock.restore;

    const req = buildRequest({
      host: "api.example.com",
      path: "/v1",
      method: "GET",
      headers: {},
      query: {},
      apiKey: "sk_test_fake",
    });
    const result = await executeRequest(req, 5000);
    expect(result.status).toBe(500);
  });
});
