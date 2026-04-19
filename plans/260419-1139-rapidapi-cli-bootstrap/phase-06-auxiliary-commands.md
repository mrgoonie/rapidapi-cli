# Phase 06 — Auxiliary Commands: `config`, `login`, `--manifest`

## Context Links
- Plan: [../plan.md](./plan.md)
- Depends on: Phase 02, 04

## Overview
- Priority: P2
- Status: pending
- CRUD for persisted config, interactive key setup (non-interactive if piped), agent-discovery manifest.

## Requirements
Functional:
- `rapidapi config get <key>` → prints value (redacted for apiKey unless `--reveal`).
- `rapidapi config set <key> <value>` → writes to `{configHome}/rapidapi/config.json`, 0600.
- `rapidapi config list [--show-origin]` → dumps resolved config + optional origin per field.
- `rapidapi config unset <key>` → removes key.
- `rapidapi config path` → prints file path.
- `rapidapi login [--key <k>]` → if `--key` provided, `config set apiKey`; else read from stdin (prompt only if TTY), fail cleanly in non-TTY without `--key`.
- `rapidapi --manifest` (top-level flag, not subcommand) → emit JSON describing every command, flag (name, type, default, description, required), to stdout; exits 0.

Non-functional:
- No new deps (no `@clack/prompts`); use plain `process.stdin` for login.
- Valid config keys whitelist: `apiKey`, `searchEndpoint`, `defaultHost`, `identityKey`.

## Related Code Files
Create:
- `src/commands/config.ts` (<120 LOC)
- `src/commands/login.ts` (<70 LOC)
- `src/lib/manifest.ts` (<100 LOC)
Modify:
- `src/cli.ts` — handle `--manifest` before Commander parses subcommand.

## Implementation Steps
1. `config.ts`: Commander subcommand tree (`config get|set|list|unset|path`); validate key against whitelist, throw `CliError('UNKNOWN_CONFIG_KEY')` otherwise. `list` calls `resolveConfig({})` then masks `apiKey`.
2. `login.ts`:
   - If `--key`: `store.write({apiKey: key})`; print `saved to <path>` (human) or `{ok:true,path}` (--json).
   - Else if TTY: prompt `RapidAPI key: ` with `readline.question` + `hideInput` (echo off via `process.stdin.setRawMode`).
   - Else: `CliError('NO_TTY_NO_KEY', 'Pass --key <k> or run in a TTY', exitCode=2)`.
3. `manifest.ts`:
   - Build manifest by walking the Commander program tree (`program.commands`), extracting `name, description, options[], arguments[]`.
   - Shape:
     ```json
     {
       "name":"rapidapi","version":"x.y.z",
       "commands":[{
         "name":"call",
         "description":"...",
         "arguments":[{"name":"host","required":true}, ...],
         "options":[{"flags":"--method <m>","description":"...","default":"GET","type":"string"}],
         "examples":["rapidapi call twitter154.p.rapidapi.com /search/search --query foo"]
       }]
     }
     ```
   - Attach curated examples per command (maintained in `src/lib/manifest-examples.ts`).
4. `cli.ts`: before `program.parse`, if `argv.includes('--manifest')` → print manifest JSON and `exit(0)`. Document in README that manifest is stable contract for agents.

## Todo
- [ ] config get/set/list/unset/path
- [ ] Key whitelist validation
- [ ] login with TTY prompt + hidden input
- [ ] Non-TTY login fails cleanly
- [ ] manifest.ts walking Commander tree
- [ ] --manifest short-circuit in cli.ts
- [ ] Curated examples per command

## Success Criteria
- `rapidapi config set apiKey sk_test && rapidapi config get apiKey` → `sk_***test` (redacted); `--reveal` shows full.
- `rapidapi --manifest | jq '.commands[].name'` → `["call","search","config","login"]`.
- `echo $KEY | rapidapi login` in pipe → error (no TTY, no --key); `rapidapi login --key $KEY` works.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Manifest drifts from actual flags | High | High | Generate from Commander tree, not hand-written; add phase-07 test that every command registered ↔ appears in manifest |
| Prompt echoes key on Windows terminals | Med | High | Test setRawMode; fallback: require `--key` on Windows |
| Config file world-readable on POSIX | Low | High | 0600 enforced in store.ts; test |

## Security
- `config get apiKey` redacts by default; `--reveal` requires explicit opt-in.
- `config set` never echoes value back.
- File created with 0600 (phase 02).

## Next
Phase 07 tests config, login, manifest.
