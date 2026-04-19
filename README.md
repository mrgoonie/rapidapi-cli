# @mrgoonie/rapidapi-cli

[![npm version](https://img.shields.io/npm/v/@mrgoonie/rapidapi-cli)](https://www.npmjs.com/package/@mrgoonie/rapidapi-cli)
[![CI](https://github.com/mrgoonie/rapidapi-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/mrgoonie/rapidapi-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

CLI proxy for [RapidAPI.com](https://rapidapi.com) — designed for both humans and AI agents.

---

## What it does

- Proxies HTTP requests through RapidAPI with automatic auth headers injected.
- Provides `--json` output on every command for machine-readable piping.
- Exposes `--manifest` for self-discovery by AI agents.
- Supports RapidAPI Enterprise Hub GraphQL search.

---

## Install

### Recommended (any machine with Node ≥ 20)

```bash
npm install -g @mrgoonie/rapidapi-cli
```

### With Bun

```bash
bun install -g @mrgoonie/rapidapi-cli
```

### One-shot (no install)

```bash
npx @mrgoonie/rapidapi-cli --manifest
```

---

## Quickstart

```bash
# 1. Save your key
rapidapi login --key $RAPIDAPI_KEY

# 2. Make your first call
rapidapi call twitter154.p.rapidapi.com /user/details \
  --query username=elonmusk \
  --query user_id=44196397

# 3. Get JSON output for scripting / agents
rapidapi call twitter154.p.rapidapi.com /user/details \
  --query username=elonmusk \
  --json | jq .result.legacy.name
```

---

## Commands

### `rapidapi call <host> <path>`

Proxy an HTTP request through RapidAPI.

```
Options:
  --method <method>    HTTP method (default: GET)
  --header <k=v>       Extra headers (repeatable)
  --query <k=v>        Query params (repeatable)
  --data <body>        Request body: JSON string, @file, or - for stdin
  --key <key>          RapidAPI key (overrides env/config)
  --timeout <ms>       Request timeout in ms (default: 30000)
  --raw                Print raw response body
```

**Unknown flags become query params automatically:**

```bash
rapidapi call twitter154.p.rapidapi.com /user/details \
  --username elonmusk --user_id 44196397
```

**POST with JSON body:**

```bash
rapidapi call api.example.p.rapidapi.com /items \
  --method POST \
  --data '{"name":"widget"}' \
  --header Content-Type=application/json
```

**Body from file:**

```bash
rapidapi call api.example.p.rapidapi.com /items \
  --method POST --data @payload.json
```

**Body from stdin:**

```bash
cat payload.json | rapidapi call api.example.p.rapidapi.com /items \
  --method POST --data -
```

### `rapidapi search <query>`

Search for APIs on RapidAPI Enterprise Hub (requires `searchEndpoint`).

```
Options:
  --category <name>    Filter by category
  --tag <tag>          Filter by tag
  --limit <n>          Results per page (default: 10)
  --cursor <cursor>    Pagination cursor from previous page
  --key <key>          RapidAPI key override
```

```bash
rapidapi search "twitter" --limit 5 --json
rapidapi search "weather" --category "Data" --json
```

See [docs/search-setup.md](./docs/search-setup.md) for Enterprise Hub configuration.

### `rapidapi login`

Save your RapidAPI key to local config.

```bash
rapidapi login              # interactive prompt (hidden input)
rapidapi login --key $KEY   # non-interactive
```

### `rapidapi config`

Manage CLI configuration.

```bash
rapidapi config list                          # show all values
rapidapi config get apiKey                    # get one value
rapidapi config set apiKey <value>            # persist a value
rapidapi config set searchEndpoint <url>      # set Enterprise search URL
rapidapi config unset apiKey                  # remove a value
rapidapi config path                          # show config file location
```

### `rapidapi --manifest`

Print a machine-readable JSON description of all commands and flags. Intended for AI agent self-discovery.

```bash
rapidapi --manifest | jq .commands[].name
```

---

## Configuration & env var precedence

Values are resolved in this order (highest → lowest priority):

| Priority | Source |
|----------|--------|
| 1 | CLI flag (`--key`, `--timeout`, …) |
| 2 | Environment variable |
| 3 | Config file (`rapidapi config set …`) |
| 4 | Built-in default |

### Supported environment variables

| Variable | Config key | Description |
|----------|------------|-------------|
| `RAPIDAPI_KEY` | `apiKey` | Your RapidAPI subscription key |
| `RAPIDAPI_SEARCH_ENDPOINT` | `searchEndpoint` | Enterprise Hub GraphQL URL |
| `RAPIDAPI_DEFAULT_HOST` | `defaultHost` | Default API host (optional shorthand) |
| `RAPIDAPI_IDENTITY_KEY` | `identityKey` | Team identity key for Enterprise accounts |

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

---

## For AI agents

See [docs/agent-guide.md](./docs/agent-guide.md) for:
- How to use `--manifest` for self-discovery
- Stable `--json` error schema
- Exit codes
- Deprecation policy

Quick pattern:

```bash
# 1. Discover commands
rapidapi --manifest

# 2. Call with structured output
rapidapi call <host> <path> [flags] --json

# 3. Parse errors
rapidapi call bad.host /path --json 2>&1 | jq .error
```

---

## Limitations

- Requires a RapidAPI account and a subscribed API.
- `search` requires RapidAPI Enterprise Hub (not available on free tier).
- `--provenance` on npm publish requires GitHub Actions OIDC (configured in CI).

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
