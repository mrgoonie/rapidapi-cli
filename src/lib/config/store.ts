import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { dirname } from "path";
import { configFile } from "./paths.ts";
import type { RawConfig } from "../../types.ts";

export class ConfigStore {
  private readonly filePath: string;

  constructor(filePath = configFile()) {
    this.filePath = filePath;
  }

  read(): Partial<RawConfig> {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      return parsed as Partial<RawConfig>;
    } catch {
      // File missing or invalid JSON — graceful empty return
      return {};
    }
  }

  write(partial: Partial<RawConfig>): void {
    const current = this.read();
    const merged = { ...current, ...partial };
    // Remove undefined values
    for (const k of Object.keys(merged) as (keyof RawConfig)[]) {
      if (merged[k] === undefined) delete merged[k];
    }
    mkdirSync(dirname(this.filePath), { recursive: true });
    const content = JSON.stringify(merged, null, 2) + "\n";
    writeFileSync(this.filePath, content, { encoding: "utf8" });
    // Restrict file permissions on POSIX (ignored on Windows)
    try {
      chmodSync(this.filePath, 0o600);
    } catch {
      // Windows — chmod not supported, skip silently
    }
  }

  unset(key: keyof RawConfig): void {
    const current = this.read();
    delete current[key];
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(current, null, 2) + "\n", { encoding: "utf8" });
  }
}

export const store = new ConfigStore();
