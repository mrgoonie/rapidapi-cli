# Contributing

## Dev loop

```bash
bun install
bun test
bun run build        # outputs dist/rapidapi.cjs
bun run typecheck    # tsc --noEmit
```

## Commit format

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) to drive automated releases via release-please.

| Prefix | Effect |
|--------|--------|
| `feat:` | Minor bump (0.x.0) |
| `fix:` | Patch bump (0.0.x) |
| `feat!:` / `fix!:` | Major bump (x.0.0) |
| `chore:`, `docs:`, `test:`, `refactor:` | No release (no version bump) |

Examples:

```
feat: add --timeout flag to call command
fix: handle empty body on 204 responses
feat!: rename --key to --api-key (breaking change)
```

## Release flow

1. Merge a `feat:` or `fix:` commit to `main`.
2. release-please opens a Release PR automatically.
3. Review the generated `CHANGELOG.md` entry and version bump.
4. Merge the Release PR — a git tag is pushed and CI publishes to npm.

## Running tests

```bash
bun test             # all tests
bun test --watch     # watch mode
```

## Project structure

```
bin/rapidapi.ts      # CLI entrypoint (Bun TS)
src/
  commands/          # Commander sub-commands
  lib/               # Core logic (config, http, errors, output)
  types.ts           # Shared TypeScript types
test/                # Bun test files mirroring src/
dist/                # Built CJS bundle (git-ignored, created by bun run build)
```
