import type { Command } from "commander";

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
    .action((_host: string, _path: string) => {
      process.stderr.write("call: not implemented\n");
      process.exit(1);
    });
}
