# Phase 03 — HTTP Proxy Core (`call` command)

## Context Links
- Plan: [../plan.md](./plan.md)
- Depends on: Phase 01, 02

## Overview
- Priority: P1 (headline feature)
- Status: complete
- Implement `rapidapi call <host> <path> [flags]` — auto-injects RapidAPI headers, forwards method/query/body, returns response.

## Requirements
Functional:
- Signature: `rapidapi call <host> <path> [--method GET] [--header K=V ...] [--query K=V ...] [--data <json|@file>] [--key <k>] [--timeout 30000] [--raw] [--json]`
- Unknown `--<name> <val>` flags are interpreted as query params (for the user's example: `--query "claude code" --section top --min_retweets 1 --limit 5`).
- Auto-headers: `x-rapidapi-host: <host>`, `x-rapidapi-key: <apiKey>`.
- Body: `--data '{"k":"v"}'` or `--data @file.json`.
- Support stdin body if `--data -`.
- Status ≥400 → non-zero exit but still print body.

Non-functional:
- Uses global `fetch` (Bun/Node20+), no `axios`.
- `--timeout` via `AbortController`.

## Architecture
Data flow:
```
argv → Commander parse → CallOptions
     → resolveConfig(cli) → { apiKey }
     → buildRequest(host, path, opts) → Request
     → fetch() → Response
     → formatOutput() → stdout + exit(status<400 ? 0 : status)
```

## Related Code Files
Create:
- `src/lib/http-client.ts` (<150 LOC) — `buildRequest`, `executeRequest`
- `src/commands/call.ts` (<150 LOC) — Commander action, arg parsing, passthrough flag collection
- Update `src/cli.ts` to register real handler

## Implementation Steps
1. `http-client.ts`:
   ```ts
   export function buildRequest(p: {
     host: string; path: string; method: string;
     headers: Record<string,string>; query: Record<string,string|string[]>;
     body?: string; apiKey: string;
   }): Request
   ```
   - URL: `https://${host}${path.startsWith('/')?path:'/'+path}` + `URLSearchParams`.
   - Headers merge order: defaults (`accept: application/json`) < user `--header` < auto (`x-rapidapi-*`).
   - If body set and no `content-type`, default `application/json`.
2. `executeRequest(req, timeoutMs)`: AbortController, returns `{status, headers, body: string, durationMs}`.
3. `call.ts`:
   - Commander: `.command('call <host> <path>').allowUnknownOption(true).allowExcessArguments(false)`.
   - Collect unknown flags: use `program.parseOptions` residue OR custom walk over `argv.slice(cmdIndex+3)`; map `--foo bar` → `query.foo = bar`, repeated keys → array.
   - Read `--data`: literal string, `@path` = read file, `-` = stdin via `Bun.stdin` / `process.stdin`.
   - Warn to stderr (colored) if positional/unknown flag value looks like a key (regex `/^[a-f0-9]{40,}$/i`).
4. Output: delegate to `formatOutput` (phase 04). Default: if `content-type` includes `json`, parse+pretty; else raw.
5. Exit code: `status<400 ? 0 : (status>=500 ? 2 : 1)`.

## Todo
- [x] http-client.ts buildRequest + executeRequest
- [x] Unknown-flag → query collector utility
- [x] `--data` literal / `@file` / `-` stdin
- [x] API-key-looks-leaked warning
- [x] Timeout via AbortController
- [x] call.ts Commander handler
- [x] Wire into cli.ts

## Success Criteria
- Demo works: `rapidapi call twitter154.p.rapidapi.com /search/search --query "claude code" --section top --min_retweets 1 --limit 5` → JSON response.
- Missing API key → stderr "RAPIDAPI_KEY required (set via --key, RAPIDAPI_KEY env, or `rapidapi config set apiKey`)" exit 2.
- 429 response → body printed, exit 1.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Unknown-flag parsing collides with Commander opts | High | High | Use `allowUnknownOption` + parse residue; add tests for conflicting names (e.g. user has `--method` query) — reserve `--method/--header/--query/--data/--key/--timeout/--raw/--json` and document |
| Large response exhausts memory | Low | Med | Document; don't buffer >10MB unless `--raw` — for v1 just buffer (YAGNI) |
| Binary response corrupted by text decode | Med | Med | If `content-type` not textual, write `response.arrayBuffer()` to stdout as bytes |
| Windows stdin `-` hangs | Med | Low | Document; detect TTY and error |

## Security
- Never echo `x-rapidapi-key` in verbose/debug output; redact.
- Warn on leaked-key pattern in argv.

## Next
Phase 04 formats the output; callers of `formatOutput` stubbed until then.
