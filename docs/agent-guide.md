# Agent Guide — @mrgoonie/rapidapi-cli

This guide documents the stable contract for AI agents consuming the `rapidapi` CLI.

---

## Self-discovery

Always run `--manifest` first to discover available commands and flags without reading source code:

```bash
rapidapi --manifest
```

Returns a JSON object:

```json
{
  "name": "rapidapi",
  "version": "0.1.0",
  "commands": [
    {
      "name": "call",
      "description": "Proxy an HTTP request through RapidAPI",
      "arguments": ["host", "path"],
      "options": [...]
    }
  ]
}
```

Use the `commands[].name` and `commands[].options` fields to build calls dynamically.

---

## Structured output (`--json`)

Every command supports `--json`. Always pass it when consuming output programmatically.

```bash
rapidapi call twitter154.p.rapidapi.com /user/details \
  --query username=elonmusk --json
```

On success, stdout is valid JSON (the API response body parsed if it is JSON, or a string wrapper if not).

On error, stderr contains a JSON object and the process exits with a non-zero code.

---

## Error schema

All errors written to stderr follow this schema:

```json
{
  "error": {
    "code": "MISSING_KEY",
    "message": "RAPIDAPI_KEY required",
    "hint": "Set via --key, RAPIDAPI_KEY env, or `rapidapi config set apiKey <value>`"
  }
}
```

| Field | Type | Always present |
|-------|------|----------------|
| `error.code` | `string` | yes |
| `error.message` | `string` | yes |
| `error.hint` | `string` | no |

### Known error codes

| Code | Meaning |
|------|---------|
| `MISSING_KEY` | No API key configured |
| `STDIN_TTY` | `--data -` used without piped stdin |
| `FILE_READ_ERROR` | `--data @file` could not read file |
| `INVALID_TIMEOUT` | `--timeout` is not a positive integer |
| `SEARCH_NOT_CONFIGURED` | `searchEndpoint` not set |
| `UNKNOWN_CONFIG_KEY` | Invalid key passed to `config get/set` |
| `REQUEST_TIMEOUT` | Request exceeded `--timeout` ms |
| `NETWORK_ERROR` | Network-level failure |
| `HTTP_ERROR` | API returned 4xx/5xx |

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | HTTP 4xx or usage/config error |
| `2` | HTTP 5xx or missing required config |
| `130` | Interrupted (Ctrl-C) |

---

## Stable flags contract

These flags are stable across patch and minor versions:

- `--json` — machine-readable output
- `--quiet` — suppress informational messages
- `--no-color` — disable ANSI colors
- `--verbose` — write request/response summary to stderr
- `--manifest` — print command manifest and exit

Flags marked `(experimental)` in `--help` may change in minor releases.

---

## Deprecation policy

- Deprecated flags emit a warning to stderr but continue to work for **two minor versions**.
- Removed flags produce exit code `2` with `code: "UNKNOWN_FLAG"`.
- Breaking changes require a major version bump (`feat!:` commit).

---

## Recommended agent pattern

```bash
# Step 1: discover
MANIFEST=$(rapidapi --manifest)

# Step 2: call with json + error capture
RESULT=$(rapidapi call twitter154.p.rapidapi.com /user/details \
  --query username=elonmusk --json 2>/tmp/rapidapi-err.json)

EXIT=$?
if [ $EXIT -ne 0 ]; then
  ERROR_CODE=$(jq -r '.error.code' /tmp/rapidapi-err.json)
  # handle by error code
fi

# Step 3: parse result
echo "$RESULT" | jq .
```

---

## Config for agents (non-interactive)

Agents should prefer environment variables over config file:

```bash
export RAPIDAPI_KEY=your_key_here
rapidapi call host /path --json
```

Or pass inline:

```bash
rapidapi call host /path --key "$RAPIDAPI_KEY" --json
```

Never pass the key as a bare positional argument — the CLI will warn and the value may appear in process listings.
