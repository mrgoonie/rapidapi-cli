import type { Command } from "commander";
import { resolveConfig } from "../lib/config/index.ts";
import { buildRequest, executeRequest } from "../lib/http-client.ts";
import { CliError } from "../lib/errors.ts";
import { formatOutput, formatError } from "../lib/output.ts";
import type { GlobalOptions, RawConfig } from "../types.ts";
import { readFileSync } from "fs";

/** Regex to warn if an argv value looks like a leaked API key */
const KEY_PATTERN = /^[a-f0-9]{40,}$/i;

/**
 * Collect unknown flags from raw argv tail (everything after "call <host> <path>").
 * Maps --foo bar  →  query.foo = bar
 * Repeated --foo  →  query.foo = [bar1, bar2]
 * Bare values without a preceding flag are ignored (Commander handles positionals).
 */
function collectUnknownFlags(
  rawArgs: string[]
): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  let i = 0;
  while (i < rawArgs.length) {
    const token = rawArgs[i];
    if (token !== undefined && token.startsWith("--")) {
      const key = token.slice(2);
      const next = rawArgs[i + 1];
      // Value is the next token if it doesn't start with '--'
      if (next !== undefined && !next.startsWith("--")) {
        const existing = query[key];
        if (existing === undefined) {
          query[key] = next;
        } else if (Array.isArray(existing)) {
          existing.push(next);
        } else {
          query[key] = [existing, next];
        }
        i += 2;
      } else {
        // Boolean flag with no value — treat as empty string
        query[key] = query[key] ?? "";
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return query;
}

/** Read body from literal string, @file, or - (stdin) */
async function readBody(data: string): Promise<string> {
  if (data === "-") {
    // stdin — detect TTY to avoid hanging
    if (process.stdin.isTTY) {
      throw new CliError(
        "STDIN_TTY",
        "Cannot read --data - from a TTY. Pipe data via stdin.",
        "Example: echo '{\"key\":\"val\"}' | rapidapi call ..."
      );
    }
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  if (data.startsWith("@")) {
    const filePath = data.slice(1);
    try {
      return readFileSync(filePath, "utf8");
    } catch (err) {
      throw new CliError(
        "FILE_READ_ERROR",
        `Cannot read file: ${filePath}`,
        String(err instanceof Error ? err.message : err)
      );
    }
  }
  return data;
}

/** Parse Key=Value header strings into a record */
function parseKeyValue(pairs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) {
      process.stderr.write(`Warning: ignoring malformed header "${pair}" (expected Key=Value)\n`);
      continue;
    }
    out[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return out;
}

interface CallOptions {
  method: string;
  header?: string[];
  query?: string[];
  data?: string;
  key?: string;
  timeout: string;
  raw?: boolean;
}

export function registerCall(program: Command): void {
  program
    .command("call <host> <path>")
    .description("Proxy an HTTP request through RapidAPI")
    .allowUnknownOption(true)
    .option("--method <method>", "HTTP method", "GET")
    .option("--header <header...>", "Extra headers as Key=Value")
    .option("--query <query...>", "Query params as Key=Value")
    .option("--data <data>", "Request body: JSON string, @file, or - for stdin")
    .option("--key <key>", "RapidAPI key (overrides env/config)")
    .option("--timeout <ms>", "Request timeout in ms", "30000")
    .option("--raw", "Print raw response body without formatting")
    .action(async (host: string, path: string, opts: CallOptions, cmd: Command) => {
      const globalOpts = cmd.parent?.opts<GlobalOptions>() ?? {
        json: false, noColor: false, quiet: false, verbose: false,
      };

      try {
        // Resolve config with CLI key flag taking precedence
        const cliFlags: Partial<RawConfig> = {};
        if (opts.key) cliFlags.apiKey = opts.key;
        const config = resolveConfig(cliFlags);

        if (!config.apiKey) {
          throw new CliError(
            "MISSING_KEY",
            "RAPIDAPI_KEY required",
            "Set via --key, RAPIDAPI_KEY env, or `rapidapi config set apiKey <value>`",
            2
          );
        }

        // Warn if any argv value looks like a leaked API key
        const allArgv = process.argv.slice(2);
        for (const arg of allArgv) {
          if (KEY_PATTERN.test(arg) && arg !== opts.key) {
            process.stderr.write(
              `Warning: an argument looks like an API key. Use --key or RAPIDAPI_KEY env instead.\n`
            );
            break;
          }
        }

        // Collect unknown flags → extra query params
        // Commander puts residue into cmd.args after known options are consumed
        const rawResidueArgs = cmd.args.slice(2); // skip host, path positionals
        const unknownQuery = collectUnknownFlags(rawResidueArgs);

        // Merge explicit --query Key=Value pairs with unknown flags (unknown flags win)
        const explicitQuery = parseKeyValue(opts.query ?? []);
        const query: Record<string, string | string[]> = { ...explicitQuery, ...unknownQuery };

        // Parse headers
        const userHeaders = parseKeyValue(opts.header ?? []);

        // Read body if provided
        const body = opts.data ? await readBody(opts.data) : undefined;

        const timeoutMs = parseInt(opts.timeout, 10);
        if (isNaN(timeoutMs) || timeoutMs <= 0) {
          throw new CliError("INVALID_TIMEOUT", `Invalid --timeout value: ${opts.timeout}`, "Must be a positive integer (ms)");
        }

        const req = buildRequest({
          host,
          path,
          method: opts.method,
          headers: userHeaders,
          query,
          body,
          apiKey: config.apiKey,
        });

        if (globalOpts.verbose) {
          process.stderr.write(`> ${req.method} ${req.url}\n`);
        }

        const result = await executeRequest(req, timeoutMs);

        if (globalOpts.verbose) {
          process.stderr.write(`< ${result.status} (${result.durationMs}ms)\n`);
        }

        const contentType = result.headers["content-type"] ?? "";
        const isJson = contentType.includes("json");

        if (opts.raw || !isJson) {
          process.stdout.write(result.body + (result.body.endsWith("\n") ? "" : "\n"));
        } else {
          try {
            const parsed: unknown = JSON.parse(result.body);
            formatOutput(parsed, globalOpts);
          } catch {
            // Body claimed JSON but failed to parse — print raw
            process.stdout.write(result.body + "\n");
          }
        }

        // Exit code: 0 for <400, 1 for 4xx, 2 for 5xx
        if (result.status >= 500) process.exit(2);
        if (result.status >= 400) process.exit(1);
      } catch (err) {
        formatError(err, globalOpts);
        if (err instanceof CliError) process.exit(err.exitCode);
        else process.exit(1);
      }
    });
}
