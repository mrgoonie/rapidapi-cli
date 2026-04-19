import type { HttpResult } from "../types.ts";

export interface BuildRequestParams {
  host: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string | string[]>;
  body?: string;
  apiKey: string;
}

export function buildRequest(p: BuildRequestParams): Request {
  const normalizedPath = p.path.startsWith("/") ? p.path : `/${p.path}`;
  const url = new URL(`https://${p.host}${normalizedPath}`);

  // Append query params; repeated keys become multiple entries
  for (const [key, val] of Object.entries(p.query)) {
    if (Array.isArray(val)) {
      for (const v of val) url.searchParams.append(key, v);
    } else {
      url.searchParams.append(key, val);
    }
  }

  // Header merge order: defaults < user headers < auto rapidapi headers (highest priority)
  const merged: Record<string, string> = {
    accept: "application/json",
    ...p.headers,
    "x-rapidapi-host": p.host,
    "x-rapidapi-key": p.apiKey,
  };

  // Default content-type when body present and not already set
  if (p.body !== undefined && !merged["content-type"]) {
    merged["content-type"] = "application/json";
  }

  const init: RequestInit = {
    method: p.method.toUpperCase(),
    headers: merged,
  };

  if (p.body !== undefined && !["GET", "HEAD"].includes(init.method as string)) {
    init.body = p.body;
  }

  return new Request(url.toString(), init);
}

export async function executeRequest(
  req: Request,
  timeoutMs: number
): Promise<HttpResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(req, { signal: controller.signal });
    const durationMs = Date.now() - start;
    const body = await res.text();

    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      headers[key] = val;
    });

    return { status: res.status, headers, body, durationMs };
  } finally {
    clearTimeout(timer);
  }
}
