import type { Command, Option, Argument } from "commander";
import { COMMAND_EXAMPLES } from "./manifest-examples.ts";

export interface ManifestOption {
  flags: string;
  description: string;
  default?: unknown;
  type: "string" | "boolean" | "array";
  required: boolean;
}

export interface ManifestArgument {
  name: string;
  required: boolean;
  description?: string;
}

export interface ManifestCommand {
  name: string;
  description: string;
  arguments: ManifestArgument[];
  options: ManifestOption[];
  examples: string[];
}

export interface Manifest {
  name: string;
  version: string;
  description: string;
  commands: ManifestCommand[];
}

/** Classify an option's value type from its flags string */
function optionType(opt: Option): "string" | "boolean" | "array" {
  if (opt.flags.includes("<") || opt.flags.includes("[")) {
    // variadic options end with "..."
    if (opt.variadic) return "array";
    return "string";
  }
  return "boolean";
}

/** Extract ManifestOption from a Commander Option */
function extractOption(opt: Option): ManifestOption {
  return {
    flags: opt.flags,
    description: opt.description,
    default: opt.defaultValue,
    type: optionType(opt),
    required: opt.mandatory ?? false,
  };
}

/** Extract ManifestArgument from a Commander Argument */
function extractArgument(arg: Argument): ManifestArgument {
  return {
    name: arg.name(),
    required: arg.required,
    description: arg.description ?? undefined,
  };
}

/** Recursively collect all leaf commands (with their full name path) */
function collectCommands(cmd: Command, prefix = ""): ManifestCommand[] {
  const fullName = prefix ? `${prefix} ${cmd.name()}` : cmd.name();
  const subcommands = cmd.commands as Command[];

  if (subcommands.length === 0) {
    // Leaf command
    const name = fullName.trim();
    return [
      {
        name,
        description: cmd.description(),
        arguments: (cmd.registeredArguments as Argument[]).map(extractArgument),
        options: (cmd.options as Option[]).map(extractOption),
        examples: COMMAND_EXAMPLES[cmd.name()] ?? [],
      },
    ];
  }

  // Intermediate command — collect children
  const results: ManifestCommand[] = [];
  for (const sub of subcommands) {
    results.push(...collectCommands(sub, fullName.trim()));
  }
  return results;
}

/** Build the manifest from the root Commander program */
export function buildManifest(program: Command): Manifest {
  const rootCommands = program.commands as Command[];
  const commands: ManifestCommand[] = [];

  for (const cmd of rootCommands) {
    commands.push(...collectCommands(cmd));
  }

  return {
    name: program.name(),
    version: program.version() ?? "0.0.0",
    description: program.description(),
    commands,
  };
}
