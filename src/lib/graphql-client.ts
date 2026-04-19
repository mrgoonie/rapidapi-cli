import { CliError } from "./errors.ts";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

export interface GqlClientOptions {
  apiKey: string;
  identityKey?: string;
}

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

/** Sleep for given milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse Retry-After header: supports seconds (integer) and HTTP-date */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
  const date = new Date(header);
  if (!isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
  return null;
}

/**
 * Post a GraphQL query to an Enterprise Hub endpoint.
 * Handles 429 rate-limiting with exponential backoff (max 3 retries).
 */
export async function gqlPost<T>(
  endpoint: string,
  query: string,
  variables: Record<string, unknown>,
  opts: GqlClientOptions
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "accept": "application/json",
    "x-rapidapi-key": opts.apiKey,
  };

  if (opts.identityKey) {
    headers["x-rapidapi-identity-key"] = opts.identityKey;
  }

  const body = JSON.stringify({ query, variables });
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    let res: Response;
    try {
      res = await fetch(endpoint, { method: "POST", headers, body });
    } catch (err) {
      throw new CliError(
        "NETWORK_ERROR",
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        "Check your internet connection and endpoint URL",
        2,
        err
      );
    }

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new CliError(
          "HTTP_429",
          "Rate limited (429) — max retries exceeded",
          "Wait a moment and try again, or reduce --limit",
          2
        );
      }
      const retryAfterHeader = res.headers.get("retry-after");
      const waitMs = parseRetryAfter(retryAfterHeader) ?? BASE_BACKOFF_MS * Math.pow(2, attempt);
      await sleep(waitMs);
      attempt++;
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new CliError(
        "HTTP_ERROR",
        `HTTP ${res.status} from GraphQL endpoint`,
        text.slice(0, 200),
        res.status >= 500 ? 2 : 1
      );
    }

    let json: GqlResponse<T>;
    try {
      json = (await res.json()) as GqlResponse<T>;
    } catch {
      throw new CliError("GRAPHQL_PARSE_ERROR", "Failed to parse GraphQL response as JSON", undefined, 2);
    }

    if (json.errors && json.errors.length > 0) {
      const msg = json.errors[0]?.message ?? "GraphQL error";
      throw new CliError("GRAPHQL_ERROR", msg, undefined, 1);
    }

    if (json.data === undefined) {
      throw new CliError("GRAPHQL_NO_DATA", "GraphQL response missing data field", undefined, 2);
    }

    return json.data;
  }

  // Unreachable but satisfies TS
  throw new CliError("UNKNOWN_ERROR", "Unexpected error in gqlPost", undefined, 2);
}
