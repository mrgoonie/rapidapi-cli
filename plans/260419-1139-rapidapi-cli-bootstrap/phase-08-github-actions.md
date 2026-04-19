# Phase 08 — GitHub Actions: CI + release-please + NPM OIDC

## Context Links
- Plan: [../plan.md](./plan.md)
- Research: `plans/reports/researcher-260419-1140-bun-cli-npm-publish.md` §4
- Depends on: Phase 07

## Overview
- Priority: P1 (blocks publish)
- Status: pending
- Two workflows: `ci.yml` on PR/push; `release.yml` on push to main using release-please + NPM trusted publishing (OIDC).

## Requirements
Functional:
- CI: typecheck + test on Ubuntu + Windows (Node 20, Bun latest).
- Release: conventional commits → release-please opens/updates Release PR; merging tags + publishes to npm with provenance.
- No NPM classic token — use OIDC trusted publisher.

Non-functional:
- Jobs <3 min.
- Fails loud on test/typecheck errors.

## Related Code Files
Create:
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `release-please-config.json`
- `.release-please-manifest.json`
- `.github/CODEOWNERS` (mrgoonie)

## Implementation Steps
1. `ci.yml`:
   ```yaml
   name: ci
   on: { pull_request: {}, push: { branches: [main] } }
   jobs:
     test:
       strategy: { matrix: { os: [ubuntu-latest, windows-latest] } }
       runs-on: ${{ matrix.os }}
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v2
           with: { bun-version: latest }
         - run: bun install --frozen-lockfile
         - run: bun run typecheck
         - run: bun test
   ```
2. `release-please-config.json`:
   ```json
   {
     "packages": {
       ".": {
         "release-type": "node",
         "package-name": "rapidapi",
         "changelog-path": "CHANGELOG.md",
         "bump-minor-pre-major": true,
         "include-v-in-tag": true
       }
     }
   }
   ```
3. `.release-please-manifest.json`: `{".":"0.0.0"}`.
4. `release.yml`:
   ```yaml
   name: release
   on: { push: { branches: [main] } }
   permissions: { contents: write, pull-requests: write, id-token: write }
   jobs:
     release-please:
       runs-on: ubuntu-latest
       outputs: { released: ${{ steps.rp.outputs.release_created }} }
       steps:
         - uses: googleapis/release-please-action@v4
           id: rp
           with:
             config-file: release-please-config.json
             manifest-file: .release-please-manifest.json
     publish:
       needs: release-please
       if: needs.release-please.outputs.released == 'true'
       runs-on: ubuntu-latest
       permissions: { contents: read, id-token: write }
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v2
         - uses: actions/setup-node@v4
           with: { node-version: 20, registry-url: 'https://registry.npmjs.org' }
         - run: bun install --frozen-lockfile
         - run: bun test
         - run: npm publish --provenance --access public
   ```
5. On npmjs.com: configure `rapidapi` package → Trusted Publishers → add GitHub Actions publisher (repo: `mrgoonie/rapidapi-cli`, workflow: `release.yml`, environment: none). This replaces NPM_TOKEN entirely.
6. Add commit-lint (optional, deferred) — release-please tolerates non-conventional commits (they just won't trigger bumps).

## Todo
- [ ] ci.yml with ubuntu + windows matrix
- [ ] release-please-config.json
- [ ] .release-please-manifest.json
- [ ] release.yml with OIDC publish
- [ ] Configure trusted publisher on npmjs.com (manual, after repo exists — phase 10)
- [ ] CODEOWNERS

## Success Criteria
- PR triggers ci.yml green on both OS.
- Merge of feat commit → release-please PR opened.
- Merging release PR → tag pushed → npm publishes with provenance (visible on npmjs.com with "Built and signed on GitHub Actions" badge).

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| OIDC trusted publisher not yet configured → first publish fails | High | Med | Phase 10 explicitly configures before first merge; fallback: one-time NPM_TOKEN for v0.1.0 then switch |
| Windows CI fails for spawn tests | Med | Med | See phase 07 risk; allow-skip OS-specific tests |
| release-please version bump wrong (breaking vs feat) | Low | Med | Document conventional-commit rules in CONTRIBUTING.md |

## Security
- No secrets in workflow files.
- OIDC only — no long-lived NPM token after trusted publisher configured.
- `permissions:` minimal per job.

## Rollback
If publish breaks prod CLI: `npm deprecate rapidapi@<bad-version> "broken, use <prev>"`; never unpublish (npm policy).

## Next
Phase 09 updates README to reference CI badges + install instructions.
