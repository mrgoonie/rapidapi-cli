import { Command } from "commander";
import { registerCall } from "./commands/call.ts";
import { registerSearch } from "./commands/search.ts";
import { registerConfig } from "./commands/config-cmd.ts";
import { registerLogin } from "./commands/login.ts";
import { formatError } from "./lib/output.ts";
import { buildManifest } from "./lib/manifest.ts";
import { CliError } from "./lib/errors.ts";
import type { GlobalOptions } from "./types.ts";

// Version is substituted at build time by Bun from package.json
// Falls back to the literal string when running via `bun bin/rapidapi.ts` in dev
const CLI_VERSION = process.env.npm_package_version ?? "0.1.0";

export async function run(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("rapidapi")
    .description("CLI proxy for RapidAPI.com — agent & human friendly")
    .version(CLI_VERSION, "-v, --version")
    .option("--json", "Output as machine-readable JSON", false)
    .option("--no-color", "Disable color output")
    .option("--quiet", "Suppress informational output", false)
    .option("--verbose", "Enable verbose/debug output", false)
    .option("--manifest", "Emit JSON manifest of all commands for agent discovery");

  registerCall(program);
  registerSearch(program);
  registerConfig(program);
  registerLogin(program);

  // Short-circuit --manifest before Commander parses subcommand
  // Must happen after all commands are registered so manifest is complete
  if (argv.includes("--manifest")) {
    const manifest = buildManifest(program);
    process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
    process.exit(0);
  }

  try {
    await program.parseAsync(argv);
  } catch (err) {
    const globalOpts = program.opts<GlobalOptions>();
    formatError(err, globalOpts);
    if (err instanceof CliError) process.exit(err.exitCode);
    else process.exit(1);
  }
}
