import { describe, it, expect } from "bun:test";
import { join } from "path";
import { makeTmpDir } from "../helpers/tmp-dir.ts";

const BIN = join(import.meta.dir, "../../bin/rapidapi.ts");

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function spawnCli(args: string[], env: Record<string, string> = {}): Promise<SpawnResult> {
  const proc = Bun.spawn(["bun", BIN, ...args], {
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

describe("CLI integration — --manifest", () => {
  it("emits valid JSON manifest with known commands", async () => {
    const result = await spawnCli(["--manifest"]);
    expect(result.exitCode).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      name: string;
      commands: Array<{ name: string }>;
    };
    expect(manifest.name).toBe("rapidapi");
    const names = manifest.commands.map((c) => c.name);
    expect(names).toContain("call");
    expect(names).toContain("search");
    expect(names).toContain("login");
    expect(names.some((n) => n.startsWith("config"))).toBe(true);
  });
});

describe("CLI integration — missing key error", () => {
  it("exits non-zero and emits JSON error when RAPIDAPI_KEY missing", async () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      const result = await spawnCli(
        ["--json", "call", "api.example.com", "/v1"],
        { XDG_CONFIG_HOME: dir, RAPIDAPI_KEY: "" }
      );
      expect(result.exitCode).not.toBe(0);
      // stdout should contain error JSON
      const out = JSON.parse(result.stdout) as { error: { code: string } };
      expect(out.error.code).toBe("MISSING_KEY");
    } finally {
      cleanup();
    }
  });
});

describe("CLI integration — config path", () => {
  it("prints a file path", async () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      const result = await spawnCli(["config", "path"], { XDG_CONFIG_HOME: dir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim().length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });
});

describe("CLI integration — version flag", () => {
  it("prints version string", async () => {
    const result = await spawnCli(["-v"]);
    // version flag causes exit 0 in Commander
    expect(result.stdout.trim().length).toBeGreaterThan(0);
  });
});
