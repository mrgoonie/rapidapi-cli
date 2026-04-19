# Phase 09 — Docs & AI-agent Hints

## Context Links
- Plan: [../plan.md](./plan.md)
- Depends on: Phases 03, 05, 06

## Overview
- Priority: P2
- Status: pending
- README targeting both humans and agents; every command's `--help` has examples; `docs/agent-guide.md` for LLM consumers.

## Requirements
- README sections: What / Install / Quickstart / Commands / Config / Agent usage / Limitations / Contributing / License.
- Every Commander command: `.addHelpText('after', '\nExamples:\n  $ rapidapi call ...\n  $ ...')`.
- `docs/agent-guide.md`: contract for `--json`, `--manifest`, exit codes, error JSON schema.
- `CONTRIBUTING.md`: conventional commits, release flow.
- `LICENSE`: MIT.

## Related Code Files
Create:
- `README.md` (full rewrite from stub)
- `docs/agent-guide.md`
- `CONTRIBUTING.md`
- `LICENSE`
Modify:
- Every `src/commands/*.ts` — add `.addHelpText`

## Implementation Steps
1. README:
   - Badge row: npm version, CI, license.
   - Quickstart with the Twitter example verbatim.
   - Install: `npm i -g rapidapi` (works with node via bundled TS? no — requires bun OR we ship a built JS). **Decision:** add `"prepublishOnly": "bun build bin/rapidapi.ts --target=node --outfile=dist/rapidapi.cjs"` and change `bin` to `./dist/rapidapi.cjs` OR keep TS + require `bun`. Document both paths: recommended install `bun install -g rapidapi`, fallback `npx rapidapi` (needs bun on machine).
   - **Revise scaffold decision:** Add build step so npm users without Bun still work. Update phase 01 `prepublishOnly` + `bin` accordingly when doing doc pass — flag this back to phase 01 as a modification item.
2. `docs/agent-guide.md`:
   - "Call `rapidapi --manifest` first to discover commands."
   - Error JSON schema: `{error:{code:string,message:string,hint?:string}}`.
   - Exit codes: 0 ok, 1 HTTP 4xx, 2 config/usage, 3 HTTP 5xx, >=64 unexpected.
   - Stable flags contract; deprecation policy.
3. `.addHelpText('after', ...)` per command with 2–3 realistic examples (including the headline twitter154 example on `call`).
4. CONTRIBUTING: commit format (`feat:`, `fix:`, `feat!:`), how release-please triggers bumps.
5. LICENSE: MIT, copyright "mrgoonie".

## Todo
- [ ] README full
- [ ] docs/agent-guide.md
- [ ] CONTRIBUTING.md
- [ ] LICENSE (MIT)
- [ ] Per-command help examples
- [ ] Reconcile bin/prepublishOnly decision (amend phase 01)

## Success Criteria
- `rapidapi call --help` shows examples including the Twitter case.
- `rapidapi --manifest` output documented in agent-guide with sample.
- Fresh reader can install + make first call within 2 minutes.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Shipping TS-only breaks npm users without Bun | High | High | Add `prepublishOnly` build to CJS; ship `dist/` |
| Manifest docs drift from code | Med | Med | Agent guide links to `--manifest` output rather than re-documenting |

## Security
- No API keys in examples; use `$RAPIDAPI_KEY` placeholder.

## Next
Phase 10 creates repo + first publish.
