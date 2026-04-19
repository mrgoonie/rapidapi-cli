# Phase 05 — `search` Command (GraphQL)

## Context Links
- Plan: [../plan.md](./plan.md)
- Research: `plans/reports/researcher-260419-1139-rapidapi-hub-search-api.md`
- Depends on: Phase 02, 04

## Overview
- Priority: P2
- Status: pending
- `rapidapi search <query> [--category] [--limit] [--cursor] [--order popularity]` → calls GraphQL `searchApis`.

## Key Insight
Official search is **Enterprise Hub only** (per researcher report §1). Public/free users lack a supported endpoint. Scraping rapidapi.com violates ToS.

**Decision:** Ship as-is; require user-provided `searchEndpoint` + `apiKey`. If not configured, print actionable CliError with link to docs. Do NOT attempt undocumented endpoints.

## Requirements
Functional:
- Query: `rapidapi search "email validation" --category Email --limit 10`.
- Cursor pagination: `--cursor <endCursor>`, output includes `nextCursor`.
- Fields: name, description, provider, rating, plus `--fields a,b,c` to customize.
- Graceful 429 handling: exponential backoff, max 3 retries, `Retry-After` honored.
- If `--json`: `{ results:[...], pageInfo:{hasNextPage,endCursor}, total }`.

Non-functional:
- All GraphQL logic isolated in `graphql-client.ts` (reusable for future queries).

## Architecture
```
search.ts
  ├─ resolve config (searchEndpoint required)
  ├─ build SearchApiWhereInput from flags
  ├─ graphql-client.ts: post(endpoint, {query, variables}, headers)
  │    ├─ retries on 429 with backoff
  │    └─ returns data or throws CliError('HTTP_429'|'GRAPHQL_ERROR')
  └─ formatOutput(results)
```

## Related Code Files
Create:
- `src/lib/graphql-client.ts` (<120 LOC)
- `src/commands/search.ts` (<150 LOC)
- `src/lib/queries/search-apis.graphql.ts` — query string constant

## Implementation Steps
1. `queries/search-apis.graphql.ts`: export the `query SearchApis(...)` string from report §1.
2. `graphql-client.ts`: `gqlPost<T>(endpoint, query, variables, {apiKey, identityKey?}) → Promise<T>`. Handles:
   - Host header derived from endpoint URL.
   - 429 backoff: sleep `Retry-After` || `2^n * 500ms`, max 3 attempts.
   - `errors[]` in response → `CliError('GRAPHQL_ERROR', errors[0].message)`.
3. `search.ts`:
   - Validate `searchEndpoint` present; if not → `CliError('SEARCH_NOT_CONFIGURED', '...', hint='Set RAPIDAPI_SEARCH_ENDPOINT or run `rapidapi config set searchEndpoint <url>`. Requires RapidAPI Enterprise Hub — see README.')`.
   - Build variables: `{where:{term,categoryNames,tags,exclude,locale:'EN_US'}, pagination:{first:limit, after:cursor}, orderBy:{field:order, direction:'DESC'}}`.
   - Map response edges → simplified `{ name, description, provider, rating, cursor }[]`.
   - Include `pageInfo` + `total`.
4. Human mode: table (name | provider | rating | desc truncated to 60 chars). JSON mode: full object.

## Todo
- [ ] search-apis.graphql.ts query string
- [ ] graphql-client.ts with 429 backoff
- [ ] search.ts command with filters
- [ ] Graceful missing-endpoint error
- [ ] Pagination (cursor forward only)
- [ ] Human table formatter

## Success Criteria
- With valid Enterprise endpoint+key: `rapidapi search email --limit 3 --json` returns 3 results + nextCursor.
- Without endpoint: clear error with hint, exit 2, no stack trace.
- 429 triggers one retry then succeeds or errors cleanly.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Most users lack Enterprise Hub → feature unusable | High | High | Documented limitation in README + error hint; consider `rapidapi search --mock` or contacting RapidAPI for public endpoint (deferred) |
| GraphQL schema changes (response field list) | Med | Med | Keep response mapper tolerant — missing fields → null |
| `x-rapidapi-identity-key` required but unset for team accounts | Med | Med | Accept optional `--identity-key` flag + `RAPIDAPI_IDENTITY_KEY` env |
| Endpoint subdomain unknown to user | High | Med | README: show where to find it in RapidAPI dashboard |

## Security
- API key only in request headers, never logged.
- Redact `searchEndpoint` in `--verbose` if it contains subdomain considered sensitive? No — endpoints are not secrets.

## Unresolved Questions
- Reverse-engineering rapidapi.com's public search GraphQL — out of scope (ToS risk). Revisit if official public API launches.

## Next
Phase 06 adds config setter for `searchEndpoint`.
