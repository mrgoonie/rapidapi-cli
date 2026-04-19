import { describe, it, expect, afterEach } from "bun:test";
import { gqlPost } from "../src/lib/graphql-client.ts";
import { installFetchMock, jsonResponse } from "./helpers/fetch-mock.ts";
import { CliError } from "../src/lib/errors.ts";

let restore: (() => void) | null = null;

afterEach(() => {
  restore?.();
  restore = null;
});

const ENDPOINT = "https://hub.example.com/graphql";
const OPTS = { apiKey: "sk_test_fake" };
const QUERY = "query { test }";

describe("gqlPost", () => {
  it("returns data on success", async () => {
    const mock = installFetchMock([{
      match: /graphql/,
      respond: jsonResponse({ data: { result: 42 } }),
    }]);
    restore = mock.restore;
    const data = await gqlPost<{ result: number }>(ENDPOINT, QUERY, {}, OPTS);
    expect(data.result).toBe(42);
  });

  it("throws GRAPHQL_ERROR on errors[] in response", async () => {
    const mock = installFetchMock([{
      match: /graphql/,
      respond: jsonResponse({ errors: [{ message: "Unauthorized" }] }),
    }]);
    restore = mock.restore;
    await expect(gqlPost(ENDPOINT, QUERY, {}, OPTS)).rejects.toMatchObject({
      code: "GRAPHQL_ERROR",
      message: "Unauthorized",
    });
  });

  it("throws GRAPHQL_NO_DATA when data field missing", async () => {
    const mock = installFetchMock([{
      match: /graphql/,
      respond: jsonResponse({ other: true }),
    }]);
    restore = mock.restore;
    await expect(gqlPost(ENDPOINT, QUERY, {}, OPTS)).rejects.toMatchObject({
      code: "GRAPHQL_NO_DATA",
    });
  });

  it("throws HTTP_ERROR on non-200 non-429 status", async () => {
    const mock = installFetchMock([{
      match: /graphql/,
      respond: new Response("forbidden", { status: 403 }),
    }]);
    restore = mock.restore;
    await expect(gqlPost(ENDPOINT, QUERY, {}, OPTS)).rejects.toMatchObject({
      code: "HTTP_ERROR",
    });
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    let callCount = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      callCount++;
      if (callCount === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return jsonResponse({ data: { ok: true } });
    }) as unknown as typeof fetch;
    restore = () => { globalThis.fetch = original; };

    const data = await gqlPost<{ ok: boolean }>(ENDPOINT, QUERY, {}, OPTS);
    expect(data.ok).toBe(true);
    expect(callCount).toBe(2);
  });

  it("throws HTTP_429 after max retries all return 429", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("rate limited", { status: 429, headers: { "retry-after": "0" } })
    ) as unknown as typeof fetch;
    restore = () => { globalThis.fetch = original; };

    await expect(gqlPost(ENDPOINT, QUERY, {}, OPTS)).rejects.toMatchObject({
      code: "HTTP_429",
    });
  });

  it("includes x-rapidapi-identity-key when identityKey provided", async () => {
    // Use a container object so TypeScript doesn't narrow to `never` on the closure assignment
    const captured: { headers: Headers | null } = { headers: null };
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured.headers = new Headers(init?.headers as HeadersInit);
      return jsonResponse({ data: { ok: true } });
    }) as unknown as typeof fetch;
    restore = () => { globalThis.fetch = original; };

    await gqlPost(ENDPOINT, QUERY, {}, { apiKey: "sk_test_fake", identityKey: "ik_test" });
    expect(captured.headers?.get("x-rapidapi-identity-key")).toBe("ik_test");
  });

  it("throws NETWORK_ERROR when fetch rejects", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("connection refused"); }) as unknown as typeof fetch;
    restore = () => { globalThis.fetch = original; };

    await expect(gqlPost(ENDPOINT, QUERY, {}, OPTS)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});
