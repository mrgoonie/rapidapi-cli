# Search Setup — RapidAPI Enterprise Hub

The `rapidapi search` command queries a **RapidAPI Enterprise Hub** GraphQL endpoint.
It is **not available** on the public RapidAPI marketplace tier.

---

## Prerequisites

- An active RapidAPI Enterprise Hub subscription.
- Your hub's GraphQL search endpoint URL (provided by your RapidAPI account team).
- A valid RapidAPI API key with `search` scope.

---

## Configure the endpoint

### Option A — Environment variable (recommended for CI/agents)

```bash
export RAPIDAPI_SEARCH_ENDPOINT=https://your-hub.p.rapidapi.com/graphql
export RAPIDAPI_KEY=your_rapidapi_key
```

### Option B — Config file (persistent for local dev)

```bash
rapidapi config set searchEndpoint https://your-hub.p.rapidapi.com/graphql
rapidapi config set apiKey your_rapidapi_key
```

### Option C — `.env` file

```
RAPIDAPI_SEARCH_ENDPOINT=https://your-hub.p.rapidapi.com/graphql
RAPIDAPI_KEY=your_rapidapi_key
```

---

## Enterprise identity key (team accounts)

For team-based Enterprise accounts, pass the identity key:

```bash
export RAPIDAPI_IDENTITY_KEY=your_identity_key
rapidapi search "payment" --json
```

Or per-call:

```bash
rapidapi search "payment" --identity-key "$RAPIDAPI_IDENTITY_KEY" --json
```

---

## Usage examples

```bash
# Basic search
rapidapi search "twitter" --limit 10

# Filter by category
rapidapi search "weather" --category "Data" --limit 5

# Filter by tag
rapidapi search "sms" --tag "messaging"

# Paginate
rapidapi search "maps" --limit 10 --json
# grab nextCursor from output, then:
rapidapi search "maps" --limit 10 --cursor <endCursor> --json

# Machine-readable output
rapidapi search "finance" --json | jq '.results[] | {name, provider}'
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `SEARCH_NOT_CONFIGURED` | `searchEndpoint` not set | Set via env or `config set` |
| `MISSING_KEY` | No API key | Set `RAPIDAPI_KEY` |
| `HTTP_ERROR` (401) | Invalid key or no search scope | Check key permissions in hub settings |
| `HTTP_ERROR` (403) | Account not on Enterprise | Contact RapidAPI sales |
| Empty results | Query too specific or wrong hub | Try broader terms; verify endpoint URL |

---

## GraphQL query reference

The CLI sends the `searchApis` query with:
- `where.term` — the search string
- `where.categoryNames` — from `--category`
- `where.tags` — from `--tag`
- `where.locale` — always `EN_US`
- `pagination.first` — from `--limit`
- `pagination.after` — from `--cursor`
- `orderBy` — `POPULARITY DESC`

The raw GraphQL is at `src/lib/queries/search-apis.graphql.ts` if you need to inspect it.
