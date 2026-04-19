# Phase 04 — Output Formatting & Error Handling

## Context Links
- Plan: [../plan.md](./plan.md)
- Depends on: Phase 01

## Overview
- Priority: P1
- Status: complete
- Unified `formatOutput` + `formatError` used by all commands. Respects `--json` globally.

## Requirements
- `--json` (global): emit single-line JSON to stdout, no color, no extra text on stderr (except fatal).
- Human mode: colorized via `picocolors`, JSON bodies pretty-printed with 2-space indent, key/value coloring.
- TTY detection: if stdout not a TTY → auto no-color (but still pretty JSON unless `--json`).
- Errors: typed `CliError { code, message, hint?, cause? }`; exit code from `code`.
- `NO_COLOR` env respected (https://no-color.org).

## Architecture
```
any command result → formatOutput(result, opts)
                       ├─ opts.json → JSON.stringify(result)
                       └─ else → prettyPrint(result)

thrown CliError → formatError(err, opts)
                    ├─ opts.json → JSON.stringify({error: {...}})
                    └─ else → red "Error:" + hint in dim
```

## Related Code Files
Create:
- `src/lib/output.ts` (<120 LOC)
- `src/lib/errors.ts` (<80 LOC)

## Implementation Steps
1. `errors.ts`: `class CliError extends Error { constructor(public code: string, msg: string, public hint?: string, public exitCode=1){...} }`. Common factories: `missingKey()`, `badEndpoint()`, `httpError(status, body)`, `configInvalid(reason)`.
2. `output.ts`:
   - `shouldColor(opts)`: `!opts.json && process.stdout.isTTY && !process.env.NO_COLOR`.
   - `formatOutput(value, opts)`: JSON mode → `process.stdout.write(JSON.stringify(value)+'\n')`; human → `prettyJson(value)` with picocolors (keys cyan, strings green, numbers yellow, null/bool magenta).
   - `formatError(err, opts)`: on `--json`, `{error:{code,message,hint}}` to **stdout** (agents parse stdout); human → stderr colored.
3. Top-level `run()` in `src/cli.ts` wraps every command: `try { await handler(); } catch(e) { formatError(e, globalOpts); process.exit(e.exitCode ?? 1); }`.
4. Add `--json`, `--no-color`, `--quiet`, `--verbose` as global Commander options.

## Todo
- [x] CliError class + factories
- [x] prettyJson with picocolors
- [x] TTY + NO_COLOR detection
- [x] Global flag wiring in cli.ts
- [x] Error JSON schema documented in types.ts

## Success Criteria
- `rapidapi call ... --json | jq` works (no color bytes, valid JSON).
- On error with `--json`, stdout has parseable `{error:{...}}`, stderr empty.
- Piping non-TTY auto-disables color.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Agent confuses stderr vs stdout | Med | High | Document: agents SHOULD use `--json`, read stdout only; errors go to stdout as JSON in `--json` mode |
| Double-formatting if command forgets `formatOutput` | Med | Low | Lint rule: all handlers must return; top-level wrapper formats |

## Security
- Never include `apiKey` in error output; sanitizer strips keys matching `x-rapidapi-key` in header dumps.

## Next
Phases 05/06 use `CliError` + `formatOutput`. Phase 07 tests this module.
