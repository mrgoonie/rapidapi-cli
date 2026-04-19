import type { Command } from "commander";
import { resolveConfig, redactKey, store, configFile } from "../lib/config/index.ts";
import { CliError } from "../lib/errors.ts";
import { formatOutput, formatError } from "../lib/output.ts";
import type { GlobalOptions, RawConfig } from "../types.ts";

/** Keys users are allowed to get/set/unset */
const ALLOWED_KEYS: ReadonlyArray<keyof RawConfig> = [
  "apiKey",
  "searchEndpoint",
  "defaultHost",
  "identityKey",
] as const;

function assertAllowedKey(key: string): asserts key is keyof RawConfig {
  if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
    throw new CliError(
      "UNKNOWN_CONFIG_KEY",
      `Unknown config key: "${key}"`,
      `Valid keys: ${ALLOWED_KEYS.join(", ")}`,
      1
    );
  }
}

/** Redact a value if it looks like an API key field */
function maybeRedact(key: string, value: string, reveal: boolean): string {
  if (!reveal && (key === "apiKey" || key === "identityKey")) {
    return redactKey(value);
  }
  return value;
}

export function registerConfig(program: Command): void {
  const cfg = program
    .command("config")
    .description("Manage rapidapi CLI configuration")
    .addHelpText("after", `
Examples:
  $ rapidapi config list                          # show all values
  $ rapidapi config get apiKey                    # get one value (redacted)
  $ rapidapi config get apiKey --reveal           # show full value
  $ rapidapi config set apiKey <value>            # persist API key
  $ rapidapi config set searchEndpoint <url>      # set Enterprise search URL
  $ rapidapi config unset apiKey                  # remove a value
  $ rapidapi config path                          # show config file location
`);

  // config get <key>
  cfg
    .command("get <key>")
    .description("Get a single config value")
    .option("--reveal", "Show full value without redaction", false)
    .action((key: string, opts: { reveal: boolean }, cmd: Command) => {
      const globalOpts = cmd.parent?.parent?.opts<GlobalOptions>() ?? { json: false, noColor: false, quiet: false, verbose: false };
      try {
        assertAllowedKey(key);
        const config = resolveConfig();
        const raw = config[key as keyof RawConfig];
        if (raw === undefined) {
          throw new CliError("KEY_NOT_SET", `Config key "${key}" is not set`, `Run \`rapidapi config set ${key} <value>\` to set it`, 1);
        }
        const display = maybeRedact(key, raw, opts.reveal);
        if (globalOpts.json) {
          formatOutput({ key, value: display }, globalOpts);
        } else {
          process.stdout.write(`${display}\n`);
        }
      } catch (err) {
        formatError(err, globalOpts);
        if (err instanceof CliError) process.exit(err.exitCode);
        else process.exit(1);
      }
    });

  // config set <key> <value>
  cfg
    .command("set <key> <value>")
    .description("Set a config value (persisted to config file)")
    .action((key: string, value: string, _opts: unknown, cmd: Command) => {
      const globalOpts = cmd.parent?.parent?.opts<GlobalOptions>() ?? { json: false, noColor: false, quiet: false, verbose: false };
      try {
        assertAllowedKey(key);
        store.write({ [key]: value } as Partial<RawConfig>);
        if (globalOpts.json) {
          formatOutput({ ok: true, key, path: configFile() }, globalOpts);
        } else if (!globalOpts.quiet) {
          process.stdout.write(`Set ${key} → saved to ${configFile()}\n`);
        }
      } catch (err) {
        formatError(err, globalOpts);
        if (err instanceof CliError) process.exit(err.exitCode);
        else process.exit(1);
      }
    });

  // config unset <key>
  cfg
    .command("unset <key>")
    .description("Remove a config key from the config file")
    .action((key: string, _opts: unknown, cmd: Command) => {
      const globalOpts = cmd.parent?.parent?.opts<GlobalOptions>() ?? { json: false, noColor: false, quiet: false, verbose: false };
      try {
        assertAllowedKey(key);
        store.unset(key as keyof RawConfig);
        if (globalOpts.json) {
          formatOutput({ ok: true, key }, globalOpts);
        } else if (!globalOpts.quiet) {
          process.stdout.write(`Unset ${key}\n`);
        }
      } catch (err) {
        formatError(err, globalOpts);
        if (err instanceof CliError) process.exit(err.exitCode);
        else process.exit(1);
      }
    });

  // config list
  cfg
    .command("list")
    .description("List all resolved config values")
    .option("--reveal", "Show API key values without redaction", false)
    .option("--show-origin", "Show which source each value came from", false)
    .action((opts: { reveal: boolean; showOrigin: boolean }, cmd: Command) => {
      const globalOpts = cmd.parent?.parent?.opts<GlobalOptions>() ?? { json: false, noColor: false, quiet: false, verbose: false };
      try {
        const config = resolveConfig();
        const { origin, ...values } = config;

        const output: Record<string, unknown> = {};
        for (const key of ALLOWED_KEYS) {
          const val = values[key];
          if (val !== undefined) {
            output[key] = maybeRedact(key, val, opts.reveal);
            if (opts.showOrigin && origin[key]) {
              output[`${key}:origin`] = origin[key];
            }
          }
        }

        if (globalOpts.json) {
          formatOutput(output, globalOpts);
        } else {
          if (Object.keys(output).length === 0) {
            process.stdout.write("No config values set.\n");
          } else {
            for (const [k, v] of Object.entries(output)) {
              process.stdout.write(`${k}: ${v}\n`);
            }
          }
        }
      } catch (err) {
        formatError(err, globalOpts);
        if (err instanceof CliError) process.exit(err.exitCode);
        else process.exit(1);
      }
    });

  // config path
  cfg
    .command("path")
    .description("Print path to the config file")
    .action((_opts: unknown, cmd: Command) => {
      const globalOpts = cmd.parent?.parent?.opts<GlobalOptions>() ?? { json: false, noColor: false, quiet: false, verbose: false };
      const fp = configFile();
      if (globalOpts.json) {
        formatOutput({ path: fp }, globalOpts);
      } else {
        process.stdout.write(`${fp}\n`);
      }
    });
}
