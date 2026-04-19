import type { Command } from "commander";

export function registerLogin(program: Command): void {
  program
    .command("login")
    .description("Save your RapidAPI key to local config")
    .action(() => {
      process.stderr.write("login: not implemented\n");
      process.exit(1);
    });
}
