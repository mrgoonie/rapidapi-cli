import envPaths from "env-paths";
import { join } from "path";

const paths = envPaths("rapidapi", { suffix: "" });

export function configDir(): string {
  return paths.config;
}

export function configFile(): string {
  return join(configDir(), "config.json");
}
