import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { statSync } from "fs";
import { makeTmpDir } from "../helpers/tmp-dir.ts";
import { ConfigStore } from "../../src/lib/config/store.ts";

let dir: string;
let cleanup: () => void;

beforeEach(() => {
  const tmp = makeTmpDir();
  dir = tmp.dir;
  cleanup = tmp.cleanup;
});

afterEach(() => {
  cleanup();
});

describe("ConfigStore", () => {
  it("read returns {} for missing file", () => {
    const s = new ConfigStore(join(dir, "missing", "config.json"));
    expect(s.read()).toEqual({});
  });

  it("read returns {} for invalid JSON", async () => {
    const fp = join(dir, "config.json");
    await Bun.write(fp, "not json{{{");
    const s = new ConfigStore(fp);
    expect(s.read()).toEqual({});
  });

  it("write+read roundtrip", () => {
    const fp = join(dir, "config.json");
    const s = new ConfigStore(fp);
    s.write({ apiKey: "sk_test_fake" });
    const result = s.read();
    expect(result.apiKey).toBe("sk_test_fake");
  });

  it("write merges with existing values", () => {
    const fp = join(dir, "config.json");
    const s = new ConfigStore(fp);
    s.write({ apiKey: "sk_test_fake" });
    s.write({ searchEndpoint: "https://hub.example.com/graphql" });
    const result = s.read();
    expect(result.apiKey).toBe("sk_test_fake");
    expect(result.searchEndpoint).toBe("https://hub.example.com/graphql");
  });

  it("unset removes only specified key", () => {
    const fp = join(dir, "config.json");
    const s = new ConfigStore(fp);
    s.write({ apiKey: "sk_test_fake", defaultHost: "api.example.com" });
    s.unset("apiKey");
    const result = s.read();
    expect(result.apiKey).toBeUndefined();
    expect(result.defaultHost).toBe("api.example.com");
  });

  it("sets 0600 permissions on POSIX", () => {
    if (process.platform === "win32") return; // skip on Windows
    const fp = join(dir, "config.json");
    const s = new ConfigStore(fp);
    s.write({ apiKey: "sk_test_fake" });
    const st = statSync(fp);
    // mode & 0o777 should be 0o600
    expect(st.mode & 0o777).toBe(0o600);
  });
});
