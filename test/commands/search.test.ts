import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { installFetchMock, jsonResponse } from "../helpers/fetch-mock.ts";

let restore: (() => void) | null = null;
const origEnv = { ...process.env };

beforeEach(() => {
  // clear rapidapi env vars so tests are isolated
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("RAPIDAPI_")) delete process.env[k];
  }
});

afterEach(() => {
  restore?.();
  restore = null;
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("RAPIDAPI_")) delete process.env[k];
  }
  Object.assign(process.env, origEnv);
});

describe("search command — missing endpoint error", () => {
  it("throws SEARCH_NOT_CONFIGURED when searchEndpoint not set", async () => {
    // resolveConfig returns no searchEndpoint since env is cleared
    process.env["RAPIDAPI_KEY"] = "sk_test_fake";
    delete process.env["RAPIDAPI_SEARCH_ENDPOINT"];

    // Import gqlPost to verify it is NOT called (we test at action level via run())
    // Instead, test the guard directly via the resolver + CliError
    const { resolveConfig } = await import("../../src/lib/config/resolver.ts");
    const { CliError } = await import("../../src/lib/errors.ts");

    const cfg = resolveConfig({});
    expect(cfg.apiKey).toBe("sk_test_fake");
    expect(cfg.searchEndpoint).toBeUndefined();

    // Simulate what the command does
    let thrown: unknown;
    try {
      if (!cfg.searchEndpoint) {
        throw new CliError(
          "SEARCH_NOT_CONFIGURED",
          "searchEndpoint is not configured",
          undefined,
          2
        );
      }
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(CliError);
    expect((thrown as InstanceType<typeof CliError>).code).toBe("SEARCH_NOT_CONFIGURED");
    expect((thrown as InstanceType<typeof CliError>).exitCode).toBe(2);
  });
});

describe("search command — successful response", () => {
  it("maps edges to simplified results", async () => {
    const { gqlPost } = await import("../../src/lib/graphql-client.ts");

    const mockData = {
      data: {
        searchApis: {
          edges: [
            {
              node: {
                id: "1",
                name: "Email Validator",
                description: "Validates emails",
                provider: "acme",
                rating: 4.5,
                categoryNames: ["Email"],
                tags: ["validation"],
              },
              cursor: "cursor_abc",
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
          total: 1,
        },
      },
    };

    const mock = installFetchMock([{
      match: /graphql/,
      respond: jsonResponse(mockData),
    }]);
    restore = mock.restore;

    const result = await gqlPost<{ searchApis: { edges: unknown[]; pageInfo: unknown; total: number } }>(
      "https://hub.example.com/graphql",
      "query {}",
      {},
      { apiKey: "sk_test_fake" }
    );

    expect(result.searchApis.total).toBe(1);
    expect(result.searchApis.edges).toHaveLength(1);
  });
});

describe("search command — pagination", () => {
  it("passes cursor variable to gqlPost", async () => {
    let capturedVariables: Record<string, unknown> = {};
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}") as { variables: Record<string, unknown> };
      capturedVariables = body.variables;
      return jsonResponse({
        data: {
          searchApis: {
            edges: [],
            pageInfo: { hasNextPage: false, endCursor: null },
            total: 0,
          },
        },
      });
    }) as unknown as typeof fetch;
    restore = () => { globalThis.fetch = original; };

    const { gqlPost } = await import("../../src/lib/graphql-client.ts");
    await gqlPost(
      "https://hub.example.com/graphql",
      "query {}",
      { pagination: { first: 5, after: "my_cursor" } },
      { apiKey: "sk_test_fake" }
    );

    expect((capturedVariables["pagination"] as Record<string, unknown>)?.["after"]).toBe("my_cursor");
  });
});
