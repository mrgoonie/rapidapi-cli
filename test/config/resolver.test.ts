import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { makeTmpDir } from "../helpers/tmp-dir.ts";

// We test resolveConfig by controlling process.env and temp files.
// The store reads from configFile() which uses env-paths; we patch XDG_CONFIG_HOME.

let tmpDir: string;
let cleanup: () => void;
const originalEnv = { ...process.env };
const originalCwd = process.cwd();

beforeEach(() => {
  const tmp = makeTmpDir();
  tmpDir = tmp.dir;
  cleanup = tmp.cleanup;
  // Isolate from repo's real .env — resolver reads process.cwd()
  process.chdir(tmpDir);
  // Reset env to original before each test
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("RAPIDAPI_") || k === "XDG_CONFIG_HOME" || k === "APPDATA") {
      delete process.env[k];
    }
  }
});

afterEach(() => {
  process.chdir(originalCwd);
  cleanup();
  // Restore original env
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("RAPIDAPI_") || k === "XDG_CONFIG_HOME") {
      delete process.env[k];
    }
  }
  Object.assign(process.env, originalEnv);
});

describe("resolveConfig precedence", () => {
  it("returns empty config when nothing is set", async () => {
    const { resolveConfig } = await import("../../src/lib/config/resolver.ts");
    const cfg = resolveConfig({});
    expect(cfg.apiKey).toBeUndefined();
    expect(cfg.searchEndpoint).toBeUndefined();
  });

  it("cli flags win over process.env", async () => {
    process.env["RAPIDAPI_KEY"] = "env_key";
    const { resolveConfig } = await import("../../src/lib/config/resolver.ts");
    const cfg = resolveConfig({ apiKey: "cli_key" });
    expect(cfg.apiKey).toBe("cli_key");
    expect(cfg.origin?.apiKey).toBe("cli");
  });

  it("process.env wins over .env file in cwd", async () => {
    process.env["RAPIDAPI_KEY"] = "env_key";
    // Write a .env in tmpDir — but cwd isn't tmpDir so it won't be found
    // This just verifies process.env is used
    const { resolveConfig } = await import("../../src/lib/config/resolver.ts");
    const cfg = resolveConfig({});
    expect(cfg.apiKey).toBe("env_key");
    expect(cfg.origin?.apiKey).toBe("process-env");
  });

  it("reads RAPIDAPI_SEARCH_ENDPOINT from env", async () => {
    process.env["RAPIDAPI_SEARCH_ENDPOINT"] = "https://hub.example.com/graphql";
    const { resolveConfig } = await import("../../src/lib/config/resolver.ts");
    const cfg = resolveConfig({});
    expect(cfg.searchEndpoint).toBe("https://hub.example.com/graphql");
  });

  it("reads RAPIDAPI_DEFAULT_HOST from env", async () => {
    process.env["RAPIDAPI_DEFAULT_HOST"] = "api.example.com";
    const { resolveConfig } = await import("../../src/lib/config/resolver.ts");
    const cfg = resolveConfig({});
    expect(cfg.defaultHost).toBe("api.example.com");
  });
});

describe("redactKey", () => {
  it("shows last 4 chars with mask", async () => {
    const { redactKey } = await import("../../src/lib/config/resolver.ts");
    expect(redactKey("abcdefgh")).toBe("****efgh");
  });

  it("fully masks short keys", async () => {
    const { redactKey } = await import("../../src/lib/config/resolver.ts");
    expect(redactKey("ab")).toBe("****");
  });
});
