import pc from "picocolors";
import { CliError } from "./errors.ts";
import type { GlobalOptions, ErrorJson } from "../types.ts";

/** Determine whether to emit ANSI color codes */
export function shouldColor(opts: Pick<GlobalOptions, "json" | "noColor">): boolean {
  if (opts.json) return false;
  if (opts.noColor) return false;
  if (process.env["NO_COLOR"] !== undefined) return false;
  return Boolean(process.stdout.isTTY);
}

/** Recursively pretty-print a JSON value with color */
function prettyJson(value: unknown, color: boolean, indent = 0): string {
  const pad = "  ".repeat(indent);
  const childPad = "  ".repeat(indent + 1);

  if (value === null) {
    return color ? pc.magenta("null") : "null";
  }
  if (typeof value === "boolean") {
    return color ? pc.magenta(String(value)) : String(value);
  }
  if (typeof value === "number") {
    return color ? pc.yellow(String(value)) : String(value);
  }
  if (typeof value === "string") {
    const escaped = JSON.stringify(value);
    return color ? pc.green(escaped) : escaped;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value
      .map((v) => `${childPad}${prettyJson(v, color, indent + 1)}`)
      .join(",\n");
    return `[\n${items}\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const lines = entries.map(([k, v]) => {
      const key = color ? pc.cyan(`"${k}"`) : `"${k}"`;
      return `${childPad}${key}: ${prettyJson(v, color, indent + 1)}`;
    });
    return `{\n${lines.join(",\n")}\n${pad}}`;
  }
  return String(value);
}

/** Write formatted value to stdout */
export function formatOutput(value: unknown, opts: Pick<GlobalOptions, "json" | "noColor">): void {
  if (opts.json) {
    process.stdout.write(JSON.stringify(value) + "\n");
    return;
  }
  const color = shouldColor(opts);
  process.stdout.write(prettyJson(value, color) + "\n");
}

/** Format an error for display.
 *  In --json mode: writes JSON to stdout (agents parse stdout only).
 *  In human mode: writes colored message to stderr.
 */
export function formatError(err: unknown, opts: Pick<GlobalOptions, "json" | "noColor">): void {
  if (err instanceof CliError) {
    if (opts.json) {
      const out: ErrorJson = {
        error: { code: err.code, message: err.message, hint: err.hint },
      };
      process.stdout.write(JSON.stringify(out) + "\n");
    } else {
      const color = shouldColor(opts);
      const prefix = color ? pc.red("Error:") : "Error:";
      process.stderr.write(`${prefix} ${err.message}\n`);
      if (err.hint) {
        const hint = color ? pc.dim(err.hint) : err.hint;
        process.stderr.write(`  ${hint}\n`);
      }
    }
    return;
  }

  // Unknown/unexpected error
  const message = err instanceof Error ? err.message : String(err);
  if (opts.json) {
    const out: ErrorJson = { error: { code: "UNEXPECTED_ERROR", message } };
    process.stdout.write(JSON.stringify(out) + "\n");
  } else {
    const color = shouldColor(opts);
    const prefix = color ? pc.red("Error:") : "Error:";
    process.stderr.write(`${prefix} ${message}\n`);
  }
}
