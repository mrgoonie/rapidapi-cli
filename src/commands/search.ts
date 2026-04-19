import type { Command } from "commander";
import type { GlobalOptions } from "../types.ts";

export function registerSearch(program: Command): void {
  program
    .command("search <query>")
    .description("Search for APIs on RapidAPI marketplace")
    .action((_query: string, _opts: unknown, cmd: Command) => {
      const _global = cmd.parent?.opts<GlobalOptions>();
      process.stderr.write("search: not implemented\n");
      process.exit(1);
    });
}
