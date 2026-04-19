export type FetchRoute = {
  match: RegExp | ((url: string, init?: RequestInit) => boolean);
  respond: Response | ((url: string, init?: RequestInit) => Response);
};

/** Install a global fetch mock with named routes; returns a restore function */
export function installFetchMock(routes: FetchRoute[]): {
  restore: () => void;
  calls: Array<[string, RequestInit | undefined]>;
} {
  const calls: Array<[string, RequestInit | undefined]> = [];
  const original = globalThis.fetch;

  // Bun's fetch type includes a `preconnect` property not needed in mocks.
  // Cast through unknown to avoid TS2741 without losing type safety elsewhere.
  const mockFn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    const reqInit = input instanceof Request ? undefined : init;
    calls.push([url, reqInit]);

    for (const route of routes) {
      const matched =
        route.match instanceof RegExp
          ? route.match.test(url)
          : route.match(url, reqInit);

      if (matched) {
        return typeof route.respond === "function"
          ? route.respond(url, reqInit)
          : route.respond.clone();
      }
    }

    throw new Error(`fetch-mock: no route matched for ${url}`);
  };

  globalThis.fetch = mockFn as unknown as typeof fetch;

  return {
    restore: () => {
      globalThis.fetch = original;
    },
    calls,
  };
}

/** Build a JSON Response helper */
export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Build a plain text Response helper */
export function textResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain" } });
}
