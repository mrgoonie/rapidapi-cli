#!/usr/bin/env node
// Post-build: ensure dist/rapidapi.mjs starts with a Node shebang so `npx`
// works on machines without Bun installed. Bun's bundler prepends its own
// `// @bun` marker and may keep the `#!/usr/bin/env bun` shebang from source.
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const file = "dist/rapidapi.mjs";
let content = readFileSync(file, "utf8");

content = content.replace(/^#!.*\n/, "");
content = content.replace(/^\/\/ @bun\n/, "");
content = `#!/usr/bin/env node\n${content}`;

writeFileSync(file, content);
try { chmodSync(file, 0o755); } catch { /* ignore on Windows */ }
console.log("fix-shebang: patched", file);
