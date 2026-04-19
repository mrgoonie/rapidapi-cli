# Phase 10 — Repo Creation & First Publish

## Context Links
- Plan: [../plan.md](./plan.md)
- Depends on: Phases 01–09 (all)

## Overview
- Priority: P1 (final)
- Status: pending
- Create `mrgoonie/rapidapi-cli` (public), push, configure npm trusted publisher, cut v0.1.0.

## Requirements
- Public GitHub repo at `mrgoonie/rapidapi-cli`.
- npm package name `rapidapi` reserved to user's npm account.
- v0.1.0 published with provenance.
- Smoke test: `npx rapidapi@0.1.0 --manifest` on fresh machine → JSON.

## Implementation Steps
1. **Pre-check name availability:**
   - `npm view rapidapi` → must return 404. If taken, fallback to `@mrgoonie/rapidapi-cli` scoped (requires `--access public` + scoped trusted publisher config).
2. **Create repo:**
   ```bash
   cd D:/www/oss/rapidapi-cli
   git init -b main
   git add .
   git commit -m "feat: initial rapidapi cli scaffold"
   gh repo create mrgoonie/rapidapi-cli --public --source=. --remote=origin --push
   ```
3. **Configure npm trusted publisher** (manual, on npmjs.com):
   - Log in as publisher account.
   - Package page → Settings → Trusted Publishers → Add GitHub Actions
   - Repo `mrgoonie/rapidapi-cli`, workflow `release.yml`, environment blank.
   - **Bootstrap problem:** npm requires package to exist first. Fix: do a manual first publish with NPM_TOKEN, then convert to OIDC.
     - Option A (preferred): `npm publish --provenance --access public` locally once (uses granular token), then add trusted publisher and remove token.
     - Option B: skip provenance on v0.1.0, add trusted publisher for v0.1.1+.
4. **Verify CI green on main.**
5. **Cut v0.1.0 manually** the first time:
   - Bump `package.json` version → `0.1.0`.
   - Update `.release-please-manifest.json` → `{".":"0.1.0"}`.
   - Commit `chore: release 0.1.0`, tag `v0.1.0`, push.
   - (Or let release-please do it by merging a `feat:` commit — cleaner.)
6. **Smoke test published package:**
   ```bash
   cd /tmp && npx rapidapi@0.1.0 --manifest | jq .name
   # expect "rapidapi"
   ```
7. **Announce:** README links, done.

## Todo
- [ ] `npm view rapidapi` availability check
- [ ] `gh repo create` public
- [ ] Initial commit + push
- [ ] First publish (one-time token path)
- [ ] Configure npm trusted publisher
- [ ] Remove NPM_TOKEN secret after OIDC works
- [ ] Smoke-test via `npx` on clean env
- [ ] Tag v0.1.0

## Success Criteria
- `https://github.com/mrgoonie/rapidapi-cli` public, CI green.
- `https://npmjs.com/package/rapidapi` (or scoped) shows v0.1.0 with provenance badge (v0.1.1+ if bootstrap path).
- `npx rapidapi@latest --manifest` works on any machine with Node 20.
- User's curl-equivalent call example works end-to-end with real RAPIDAPI_KEY.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| npm name `rapidapi` taken | High | High | Fallback to `@mrgoonie/rapidapi-cli`; update README/bin accordingly |
| Trusted publisher can't be set before first publish | High | Med | One-time granular token publish, then switch |
| OIDC provenance fails silently | Low | Low | Verify badge on package page post-publish |
| Secrets leaked in initial commit | Low | High | Pre-commit: `gh secret scan`; verify `.env*` ignored |

## Rollback
- `npm deprecate rapidapi@0.1.0 "initial release, use 0.1.1"` if broken.
- Never `unpublish` (24h window only; avoids ecosystem breakage).
- Repo: can archive / make private; does not affect npm.

## Security
- Verify no `.env`, no keys in git history BEFORE `gh repo create`.
- Run `git log -p | rg -i "rapidapi.?key"` before push.

## Unresolved Questions
- Confirm npm name `rapidapi` available (must check at execution time).
- Does user want compiled binaries on GitHub Releases for v0.1.0 or defer? (Deferred per plan.)
