import type { Command } from "commander";

export function registerConfig(program: Command): void {
  const cfg = program
    .command("config")
    .description("Manage rapidapi CLI configuration");

  cfg
    .command("list")
    .description("List current config values")
    .action(() => {
      process.stderr.write("config list: not implemented\n");
      process.exit(1);
    });

  cfg
    .command("set <key> <value>")
    .description("Set a config value")
    .action((_key: string, _value: string) => {
      process.stderr.write("config set: not implemented\n");
      process.exit(1);
    });

  cfg
    .command("unset <key>")
    .description("Remove a config value")
    .action((_key: string) => {
      process.stderr.write("config unset: not implemented\n");
      process.exit(1);
    });
}
