# Phase 01 — Project Scaffold

## Context Links
- Plan: [../plan.md](./plan.md)
- Research: `plans/reports/researcher-260419-1140-bun-cli-npm-publish.md`

## Overview
- Priority: P1 (blocks all)
- Status: complete
- Initialize Bun project, package.json bin, TS config, directory skeleton, README stub.

## Requirements
Functional:
- `bun install` works, `bun bin/rapidapi.ts --help` prints commander help.
- `npm link` exposes `rapidapi` globally.

Non-functional:
- Files <200 LOC each, kebab-case.
- No runtime deps beyond: `commander`, `dotenv`, `env-paths`, `picocolors`.

## Architecture
```
rapidapi-cli/
├── bin/rapidapi.ts              # shebang entry (thin, <30 LOC)
├── src/
│   ├── cli.ts                   # builds Commander program, registers commands
│   ├── commands/                # one file per subcommand
│   ├── lib/                     # config, http, output, errors, manifest
│   └── types.ts                 # shared TS types
├── test/
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example
└── README.md
```

## Related Code Files
Create:
- `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`
- `bin/rapidapi.ts`, `src/cli.ts`, `src/types.ts`
- `README.md` (stub; full content in phase 09)

## Implementation Steps
1. `cd D:/www/oss/rapidapi-cli && bun init -y` then overwrite generated files.
2. Write `package.json`:
   ```json
   {
     "name": "rapidapi",
     "version": "0.0.0",
     "description": "CLI proxy for RapidAPI.com — agent & human friendly",
     "type": "module",
     "bin": { "rapidapi": "./bin/rapidapi.ts" },
     "engines": { "bun": ">=1.1", "node": ">=20" },
     "files": ["bin", "src", "README.md", "LICENSE"],
     "keywords": ["rapidapi","cli","proxy","http","api","agent"],
     "repository": "github:mrgoonie/rapidapi-cli",
     "license": "MIT",
     "scripts": {
       "dev": "bun bin/rapidapi.ts",
       "test": "bun test",
       "typecheck": "bunx tsc --noEmit",
       "lint": "bunx tsc --noEmit"
     },
     "dependencies": {
       "commander": "^12.0.0",
       "dotenv": "^16.4.0",
       "env-paths": "^3.0.0",
       "picocolors": "^1.0.0"
     },
     "devDependencies": {
       "@types/bun": "latest",
       "typescript": "^5.4.0"
     }
   }
   ```
3. `tsconfig.json`: strict, `"module":"esnext"`, `"target":"es2022"`, `"moduleResolution":"bundler"`, `"allowImportingTsExtensions":true`, `"noEmit":true`.
4. `bin/rapidapi.ts`:
   ```ts
   #!/usr/bin/env bun
   import { run } from "../src/cli.ts";
   run(process.argv).catch((e) => {
     process.stderr.write(String(e?.message ?? e) + "\n");
     process.exit(1);
   });
   ```
   On POSIX, `chmod +x bin/rapidapi.ts` via postinstall not needed (npm sets exec bit from bin map).
5. `src/cli.ts` — skeleton Commander program, `name("rapidapi")`, `version`, `.command("call")`, `.command("search")`, `.command("config")`, `.command("login")`, each delegating to handler files (stubs for now returning "not implemented").
6. `.gitignore`: node_modules, .env, .env.local, dist, *.log, .DS_Store.
7. `.env.example`: `RAPIDAPI_KEY=`, `RAPIDAPI_SEARCH_ENDPOINT=`.
8. `bun install`, verify `bun bin/rapidapi.ts --help` shows all 4 commands.

## Todo
- [x] `bun init` + overwrite package.json
- [x] tsconfig.json strict mode
- [x] bin/rapidapi.ts shebang entry
- [x] src/cli.ts with command stubs
- [x] .gitignore, .env.example
- [x] README stub (title + 1-liner)
- [x] Verify `--help` output

## Success Criteria
- `bun bin/rapidapi.ts --help` exits 0, lists `call|search|config|login`.
- `bunx tsc --noEmit` clean.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Bun shebang not honored on Windows npm | Med | Med | npm generates `.cmd` shim; test via `npm link` on Windows before publish |
| TS strict too noisy on stubs | Low | Low | Use `// TODO` with explicit `never` returns |

## Security
- `.env*` in .gitignore from day 0.

## Next
Phase 02 reads config; don't start without 01 green.
