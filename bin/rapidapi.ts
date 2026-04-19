#!/usr/bin/env bun
import { run } from "../src/cli.ts";

run(process.argv).catch((e) => {
  process.stderr.write(String(e?.message ?? e) + "\n");
  process.exit(1);
});
