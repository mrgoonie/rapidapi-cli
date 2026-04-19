import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/** Create a unique temp directory; returns path + cleanup function */
export function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "rapidapi-test-"));
  return {
    dir,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    },
  };
}
