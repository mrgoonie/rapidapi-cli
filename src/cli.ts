import { Command } from "commander";
import { createRequire } from "module";
import { registerCall } from "./commands/call.ts";
import { registerSearch } from "./commands/search.ts";
import { registerConfig } from "./commands/config-cmd.ts";
import { registerLogin } from "./commands/login.ts";
import { formatError } from "./lib/output.ts";
import { CliError } from "./lib/errors.ts";
import type { GlobalOptions } from "./types.ts";

// Read version from package.json at runtime (bundler resolves at build time)
const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

export async function run(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("rapidapi")
    .description("CLI proxy for RapidAPI.com — agent & human friendly")
    .version(pkg.version, "-v, --version")
    .option("--json", "Output as machine-readable JSON", false)
    .option("--no-color", "Disable color output")
    .option("--quiet", "Suppress informational output", false)
    .option("--verbose", "Enable verbose/debug output", false);

  registerCall(program);
  registerSearch(program);
  registerConfig(program);
  registerLogin(program);

  try {
    await program.parseAsync(argv);
  } catch (err) {
    const globalOpts = program.opts<GlobalOptions>();
    formatError(err, globalOpts);
    if (err instanceof CliError) process.exit(err.exitCode);
    else process.exit(1);
  }
}
