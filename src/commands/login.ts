import type { Command } from "commander";
import * as readline from "readline";
import { store, configFile } from "../lib/config/index.ts";
import { CliError } from "../lib/errors.ts";
import { formatOutput, formatError } from "../lib/output.ts";
import type { GlobalOptions } from "../types.ts";

/** Read a line from stdin with echo disabled (raw mode) — POSIX + Windows best-effort */
function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    process.stderr.write(prompt);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });

    // Attempt to suppress echo on POSIX terminals
    const stdin = process.stdin as NodeJS.ReadStream & { setRawMode?: (mode: boolean) => void };
    const hasRawMode = typeof stdin.setRawMode === "function";

    if (hasRawMode) {
      stdin.setRawMode(true);
    }

    // readline.question does not suppress echo; we write chars manually when raw
    if (hasRawMode) {
      let input = "";
      const onData = (chunk: Buffer | string) => {
        const str = chunk.toString("utf8");
        for (const ch of str) {
          if (ch === "\r" || ch === "\n") {
            process.stderr.write("\n");
            cleanup();
            resolve(input);
            return;
          }
          if (ch === "\u0003") {
            // Ctrl-C
            cleanup();
            reject(new CliError("INTERRUPTED", "Login cancelled", undefined, 130));
            return;
          }
          if (ch === "\u007f" || ch === "\b") {
            input = input.slice(0, -1);
          } else {
            input += ch;
          }
        }
      };
      const cleanup = () => {
        if (hasRawMode) stdin.setRawMode!(false);
        process.stdin.removeListener("data", onData);
        rl.close();
      };
      process.stdin.on("data", onData);
    } else {
      rl.question("", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

interface LoginOptions {
  key?: string;
}

export function registerLogin(program: Command): void {
  program
    .command("login")
    .description("Save your RapidAPI key to local config")
    .option("--key <key>", "API key to store (skips prompt)")
    .addHelpText("after", `
Examples:
  # Interactive prompt (hidden input)
  $ rapidapi login

  # Non-interactive (CI / scripts)
  $ rapidapi login --key "$RAPIDAPI_KEY"

  # Verify key was saved
  $ rapidapi config get apiKey
`)
    .action(async (opts: LoginOptions, cmd: Command) => {
      const globalOpts = cmd.parent?.opts<GlobalOptions>() ?? {
        json: false, noColor: false, quiet: false, verbose: false,
      };

      try {
        let apiKey: string;

        if (opts.key) {
          apiKey = opts.key;
        } else if (process.stdin.isTTY) {
          apiKey = await promptHidden("RapidAPI key: ");
          if (!apiKey) {
            throw new CliError("EMPTY_KEY", "No API key entered", "Pass --key <k> or enter a key at the prompt", 1);
          }
        } else {
          throw new CliError(
            "NO_TTY_NO_KEY",
            "No TTY detected and --key not provided",
            "Pass --key <k> or run in an interactive terminal",
            2
          );
        }

        store.write({ apiKey });
        const path = configFile();

        if (globalOpts.json) {
          formatOutput({ ok: true, path }, globalOpts);
        } else if (!globalOpts.quiet) {
          process.stdout.write(`API key saved to ${path}\n`);
        }
      } catch (err) {
        formatError(err, globalOpts);
        if (err instanceof CliError) process.exit(err.exitCode);
        else process.exit(1);
      }
    });
}
