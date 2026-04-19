import { describe, it, expect } from "bun:test";
import { Command } from "commander";
import { buildManifest } from "../src/lib/manifest.ts";

function makeProgram(): Command {
  const p = new Command();
  p.name("rapidapi").description("test cli").version("1.0.0");
  p.command("call <host> <path>")
    .description("Proxy HTTP request")
    .option("--method <m>", "HTTP method", "GET")
    .option("--json", "JSON output", false);
  const cfg = p.command("config").description("Manage config");
  cfg.command("get <key>").description("Get a value");
  cfg.command("set <key> <value>").description("Set a value");
  p.command("search <query>")
    .description("Search APIs")
    .option("--limit <n>", "Result count", "10");
  return p;
}

describe("buildManifest", () => {
  it("includes top-level metadata", () => {
    const p = makeProgram();
    const m = buildManifest(p);
    expect(m.name).toBe("rapidapi");
    expect(m.version).toBe("1.0.0");
    expect(typeof m.description).toBe("string");
  });

  it("flattens all leaf commands", () => {
    const p = makeProgram();
    const m = buildManifest(p);
    const names = m.commands.map((c) => c.name);
    expect(names).toContain("call");
    expect(names).toContain("search");
    // config subcommands should be flattened
    expect(names).toContain("config get");
    expect(names).toContain("config set");
  });

  it("includes options for each command", () => {
    const p = makeProgram();
    const m = buildManifest(p);
    const call = m.commands.find((c) => c.name === "call");
    expect(call).toBeDefined();
    const methodOpt = call?.options.find((o) => o.flags.includes("--method"));
    expect(methodOpt).toBeDefined();
    expect(methodOpt?.default).toBe("GET");
  });

  it("includes arguments for each command", () => {
    const p = makeProgram();
    const m = buildManifest(p);
    const call = m.commands.find((c) => c.name === "call");
    expect(call?.arguments.length).toBeGreaterThanOrEqual(2);
    expect(call?.arguments[0]?.name).toBe("host");
    expect(call?.arguments[0]?.required).toBe(true);
  });

  it("no drift: every registered command appears in manifest", async () => {
    // Use the real program from cli.ts to verify manifest matches registered commands
    const { Command: Cmd } = await import("commander");
    const { registerCall } = await import("../src/commands/call.ts");
    const { registerSearch } = await import("../src/commands/search.ts");
    const { registerConfig } = await import("../src/commands/config-cmd.ts");
    const { registerLogin } = await import("../src/commands/login.ts");

    const prog = new Cmd();
    prog.name("rapidapi").version("0.0.0");
    registerCall(prog);
    registerSearch(prog);
    registerConfig(prog);
    registerLogin(prog);

    const manifest = buildManifest(prog);
    const names = manifest.commands.map((c) => c.name);

    expect(names).toContain("call");
    expect(names).toContain("search");
    expect(names).toContain("login");
    // config subcommands
    expect(names.some((n) => n.startsWith("config"))).toBe(true);
  });
});
