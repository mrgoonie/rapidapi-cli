# Phase 02 — Config & Env Resolution

## Context Links
- Plan: [../plan.md](./plan.md)
- Research: `plans/reports/researcher-260419-1140-bun-cli-npm-publish.md` §3

## Overview
- Priority: P1 (blocks 03/05/06)
- Status: complete
- Build multi-source resolver returning merged config + origin map (for debug).

## Requirements
Functional:
- Resolver returns `{ apiKey, searchEndpoint, defaultHost, origin }` where `origin` is a map of field → source label.
- Precedence (high→low): CLI flag > `process.env` (before dotenv loads) > `.env.local` > `.env` > `{configHome}/rapidapi/config.json` > OS env (same as process.env after dotenv, deduped).
- Graceful when files missing (no throw).
- Writer API for phase 06 `config set`.

Non-functional:
- Pure fn where possible; one class `ConfigStore` for writes.
- Never echo key; `toString()` redacts.

## Architecture
Data flow:
```
CLI flags ──┐
process.env ┤
.env.local ─┤──► mergeWithPrecedence() ──► ResolvedConfig { value, origin }
.env ───────┤
config.json ┤
OS env ─────┘
```

## Related Code Files
Create:
- `src/lib/config/resolver.ts` (<120 LOC) — merge logic
- `src/lib/config/store.ts` (<100 LOC) — read/write JSON file
- `src/lib/config/paths.ts` (<40 LOC) — env-paths wrapper
- `src/lib/config/index.ts` — barrel
- `src/types.ts` — add `ResolvedConfig`, `ConfigOrigin`

## Implementation Steps
1. `paths.ts`: export `configDir()` via `envPaths('rapidapi').config`, `configFile()` = `join(configDir(), 'config.json')`.
2. `store.ts`: `read(): Partial<RawConfig>` (returns `{}` if missing/invalid JSON, does not throw), `write(partial)` merges + `mkdir -p` + 0600 perms on POSIX.
3. `resolver.ts`:
   ```ts
   export function resolveConfig(cliFlags: Partial<RawConfig>): ResolvedConfig {
     // snapshot process.env BEFORE dotenv mutates it
     const osEnv = pickEnv(process.env);
     dotenv.config({ path: '.env.local', override: false });
     dotenv.config({ path: '.env', override: false });
     const afterDotenv = pickEnv(process.env);
     const fileConfig = store.read();
     return mergeInOrder([
       ['cli', cliFlags],
       ['process-env', osEnv],         // original shell env
       ['.env.local', diff(afterDotenv, osEnv, '.env.local')],
       ['.env', diff(afterDotenv, osEnv, '.env')],
       ['config.json', fileConfig],
     ]);
   }
   ```
   Note: simpler valid impl — read both dotenv files manually via `dotenv.parse(fs.readFileSync)` to preserve per-file origin without mutating process.env. **Prefer this** — no global state side effect.
4. Field mapping: `RAPIDAPI_KEY`→`apiKey`, `RAPIDAPI_SEARCH_ENDPOINT`→`searchEndpoint`, `RAPIDAPI_DEFAULT_HOST`→`defaultHost`.
5. `ResolvedConfig.toString()` redacts `apiKey` to `sk_***abcd` (last 4 only).
6. Export `resolve(cliFlags)` + `ConfigStore` from barrel.

## Todo
- [x] paths.ts with env-paths
- [x] store.ts read/write with 0600 perms
- [x] resolver.ts with dotenv.parse (no global mutation)
- [x] origin tracking per field
- [x] redacted toString() — implemented as redactKey() utility
- [x] Types in src/types.ts

## Success Criteria
- Unit tests (phase 07) pass: each precedence level wins over lower.
- `rapidapi config list --show-origin` (phase 06) prints source for each field.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| dotenv mutates process.env unexpectedly | Med | Med | Use `dotenv.parse()` on file buffers, skip `config()` |
| File perms 0600 fails on Windows | Med | Low | Wrap chmod in try/catch, only enforce on POSIX |
| `.env` scanned from wrong cwd | Low | Med | Always resolve relative to `process.cwd()`; document |

## Security
- `store.write` sets 0600 on POSIX.
- Never log resolved key in debug mode; use redacted form.

## Next
Phase 03 imports `resolve()`.
