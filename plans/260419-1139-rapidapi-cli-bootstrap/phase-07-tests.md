# Phase 07 — Tests (bun test)

## Context Links
- Plan: [../plan.md](./plan.md)
- Research: `plans/reports/researcher-260419-1140-bun-cli-npm-publish.md` §5
- Depends on: Phases 02–06

## Overview
- Priority: P1 (blocks CI)
- Status: pending
- Unit + integration coverage; mock `fetch` via `globalThis.fetch = mock(...)`.

## Requirements
- `bun test` green, <5s.
- Coverage targets (measured via `bun test --coverage`):
  - `src/lib/config/*` ≥90% lines
  - `src/lib/http-client.ts` ≥85%
  - `src/lib/graphql-client.ts` ≥80%
  - overall ≥75%
- No real network calls; no real filesystem writes outside `tmp/`.

## Test Matrix
| Module | Unit | Integration |
|--------|------|-------------|
| config/resolver | precedence (cli>env>.env.local>.env>file), missing files, redaction | — |
| config/store | read/write roundtrip, 0600 perms (POSIX), invalid JSON | — |
| http-client buildRequest | header merge order, query encoding, auto content-type, URL building | — |
| http-client executeRequest | timeout, 200, 4xx, 5xx (mocked fetch) | — |
| unknown-flag collector | `--foo bar`, repeated keys → array, reserved flag collision | — |
| graphql-client | 429 backoff retries, errors[] handling, Retry-After | — |
| output | JSON mode, NO_COLOR, TTY off, error formatting | — |
| manifest | every registered command/flag appears | — |
| commands/call | end-to-end with mocked fetch | `spawn(['bun','bin/rapidapi.ts','call',...])` |
| commands/search | missing-endpoint error, pagination | — |
| commands/login | non-TTY without --key fails | — |

## Related Code Files
Create:
- `test/config/resolver.test.ts`
- `test/config/store.test.ts`
- `test/http-client.test.ts`
- `test/unknown-flags.test.ts`
- `test/graphql-client.test.ts`
- `test/output.test.ts`
- `test/manifest.test.ts`
- `test/commands/call.test.ts`
- `test/commands/search.test.ts`
- `test/commands/login.test.ts`
- `test/integration/cli.test.ts` (spawn-based)
- `test/helpers/fetch-mock.ts`, `test/helpers/tmp-dir.ts`

## Implementation Steps
1. `helpers/fetch-mock.ts`: `installFetchMock(routes: {match: RegExp|Fn, respond: Response|Fn}[])`, restore in `afterEach`.
2. `helpers/tmp-dir.ts`: unique `os.tmpdir()/rapidapi-test-<uuid>` per test, cleanup.
3. Override `envPaths('rapidapi').config` by setting env var `XDG_CONFIG_HOME=<tmp>` before importing `paths.ts`, or export override hook: `setConfigDirForTesting(path)`.
4. Integration test uses `spawn(['bun','bin/rapidapi.ts',...], {env:{...process.env, RAPIDAPI_KEY:'test', XDG_CONFIG_HOME: tmpDir}})` and asserts stdout JSON.
5. Manifest test: import `buildManifest(program)` and snapshot-compare command names + option flags; ensures no drift.

## Todo
- [ ] fetch mock helper
- [ ] tmp-dir helper
- [ ] Config override hook for tests
- [ ] All unit tests listed above
- [ ] Integration test via spawn
- [ ] `bun test --coverage` passes thresholds

## Success Criteria
- `bun test` exits 0 in CI.
- `bun test --coverage` meets thresholds.
- No test touches real rapidapi.com.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Flaky spawn tests on Windows | Med | Med | Use absolute paths, shell:false, generous timeout; skip spawn tests in matrix on Windows if flaky, keep unit |
| fetch global replacement leaks between tests | Med | High | `beforeEach` install, `afterEach` restore; use per-test isolated module if needed |
| Coverage thresholds block merges | Low | Low | Start with warn-only; enforce after first green run |

## Security
- No real keys in fixtures; use `"sk_test_fake"`.

## Next
Phase 08 wires this into CI.
