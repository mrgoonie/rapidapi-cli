import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as dotenvParse } from "dotenv";
import { store } from "./store.ts";
import type { RawConfig, ResolvedConfig, ConfigOrigin } from "../../types.ts";

/** Env var → RawConfig field mapping */
const ENV_MAP: Record<string, keyof RawConfig> = {
  RAPIDAPI_KEY: "apiKey",
  RAPIDAPI_SEARCH_ENDPOINT: "searchEndpoint",
  RAPIDAPI_DEFAULT_HOST: "defaultHost",
};

/** Pick only known RapidAPI fields from an env-like record */
function pickEnv(env: Record<string, string | undefined>): Partial<RawConfig> {
  const out: Partial<RawConfig> = {};
  for (const [envKey, field] of Object.entries(ENV_MAP)) {
    const val = env[envKey];
    if (val !== undefined && val !== "") out[field] = val;
  }
  return out;
}

/** Silently parse a dotenv file; returns {} if missing or unreadable */
function parseDotenvFile(filePath: string): Partial<RawConfig> {
  try {
    const abs = resolve(process.cwd(), filePath);
    const content = readFileSync(abs, "utf8");
    return pickEnv(dotenvParse(content));
  } catch {
    return {};
  }
}

/**
 * Merge sources in priority order (first entry wins per field).
 * Returns merged values plus an origin map tracking which source each field came from.
 */
function mergeInOrder(
  sources: Array<[label: string, values: Partial<RawConfig>]>
): ResolvedConfig {
  const result: Partial<RawConfig> = {};
  const origin: ConfigOrigin = {};

  for (const [label, values] of sources) {
    for (const _key of Object.keys(values) as (keyof RawConfig)[]) {
      if (result[_key] === undefined && values[_key] !== undefined) {
        // Safe: we checked undefined above
        (result as Record<keyof RawConfig, string>)[_key] = values[_key] as string;
        origin[_key] = label;
      }
    }
  }

  return { ...result, origin };
}

/**
 * Resolve config from all sources with strict precedence:
 * CLI flag > process.env (shell) > .env.local > .env > config.json
 *
 * Uses dotenv.parse() on file buffers — does NOT mutate process.env.
 */
export function resolveConfig(cliFlags: Partial<RawConfig> = {}): ResolvedConfig {
  const shellEnv = pickEnv(process.env as Record<string, string | undefined>);
  const dotenvLocal = parseDotenvFile(".env.local");
  const dotenvBase = parseDotenvFile(".env");
  const fileConfig = store.read();

  return mergeInOrder([
    ["cli", cliFlags],
    ["process-env", shellEnv],
    [".env.local", dotenvLocal],
    [".env", dotenvBase],
    ["config.json", fileConfig],
  ]);
}

/** Redact an API key: show only last 4 chars */
export function redactKey(key: string): string {
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}
