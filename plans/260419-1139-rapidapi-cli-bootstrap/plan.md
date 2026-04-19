---
title: "rapidapi CLI bootstrap"
description: "Bun-based CLI that proxies HTTP through RapidAPI with auto headers, dual agent/human output, NPM auto-publish."
status: pending
priority: P2
effort: ~14h
branch: main
tags: [cli, bun, rapidapi, npm, bootstrap]
created: 2026-04-19
---

# rapidapi CLI — Implementation Plan

## Goal
Ship `rapidapi` (NPM, `mrgoonie/rapidapi-cli`) that proxies HTTP calls through RapidAPI, auto-injecting `x-rapidapi-host` + `x-rapidapi-key`, with agent-friendly (`--json`, `--manifest`) and human-friendly (colored, helpful) modes.

## Key Locked Decisions
- **Runtime:** Bun >=1.1; ship TS source via npm; shebang `#!/usr/bin/env bun` with Node fallback via npx.
- **Framework:** Commander.js (stable, dual output).
- **Config:** dotenv + env-paths; precedence = CLI flag > process.env > .env.local > .env > `{configHome}/rapidapi/config.json` > OS env.
- **Search:** GraphQL `searchApis` against Enterprise Hub endpoint; CLI **accepts** user-provided `search-endpoint` + key; graceful error if unset (no scraping).
- **Publish:** release-please + NPM OIDC provenance (no classic tokens).
- **Tests:** bun test; mock fetch via `globalThis.fetch` override.
- **Safety:** Never log key; redact in errors; warn if key passed as positional arg.

## Phases
| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 01 | [Project scaffold](./phase-01-project-scaffold.md) | 1h | pending |
| 02 | [Config & env resolution](./phase-02-config-env-resolution.md) | 1.5h | pending |
| 03 | [HTTP proxy core (`call`)](./phase-03-http-proxy-core.md) | 2h | pending |
| 04 | [Output formatting & errors](./phase-04-output-formatting.md) | 1h | pending |
| 05 | [`search` command (GraphQL)](./phase-05-search-command.md) | 2h | pending |
| 06 | [Auxiliary cmds (`config`, `login`, `--manifest`)](./phase-06-auxiliary-commands.md) | 1.5h | pending |
| 07 | [Tests (bun test)](./phase-07-tests.md) | 1.5h | pending |
| 08 | [GitHub Actions CI + release-please](./phase-08-github-actions.md) | 1h | pending |
| 09 | [Docs & AI-agent hints](./phase-09-docs-and-agent-hints.md) | 1h | pending |
| 10 | [Repo creation & first publish](./phase-10-repo-and-publish.md) | 0.5h | pending |

## Dependency Graph
```
01 ── 02 ── 03 ── 04 ── 07 ── 08 ── 10
            │       │
            └── 05 ─┤
            └── 06 ─┘
                    └── 09
```
Phases 03/05/06 share nothing except `lib/config.ts` (read-only) and `lib/http-client.ts` (read-only after 03).

## File Ownership (no overlap within a phase)
- 01: `package.json`, `tsconfig.json`, `bin/rapidapi.ts`, folder skeleton
- 02: `src/lib/config/*`
- 03: `src/lib/http-client.ts`, `src/commands/call.ts`
- 04: `src/lib/output.ts`, `src/lib/errors.ts`
- 05: `src/lib/graphql-client.ts`, `src/commands/search.ts`
- 06: `src/commands/config.ts`, `src/commands/login.ts`, `src/lib/manifest.ts`
- 07: `test/**`
- 08: `.github/workflows/*`, `release-please-config.json`, `.release-please-manifest.json`
- 09: `README.md`, `docs/agent-guide.md`
- 10: ops only (no new files)

## Deferred / Unresolved
- Compiled binaries via `bun build --compile` for GitHub Releases (post-v1).
- Search without Enterprise key — no safe option; documented as limitation.
- `rapidapi init` wizard (interactive) — YAGNI until requested.

## Success Criteria
- `npx rapidapi call twitter154.p.rapidapi.com /search/search --query "claude code" --section top --min_retweets 1 --limit 5` returns parsed JSON response using key from env.
- `rapidapi --manifest` emits JSON listing every command, flag, type, default.
- CI green, release-please PR opens on conventional commit, NPM publishes with provenance on merge.
