# rapidapi plugin

Claude Code plugin that teaches Claude to proxy HTTP calls through [RapidAPI.com](https://rapidapi.com) using the [`@mrgoonie/rapidapi-cli`](https://www.npmjs.com/package/@mrgoonie/rapidapi-cli) command.

## Install

```bash
/plugin marketplace add mrgoonie/rapidapi-cli
/plugin install rapidapi@rapidapi-cli-marketplace
```

You also need the CLI itself on PATH:

```bash
npm install -g @mrgoonie/rapidapi-cli
```

## What it does

Once installed, ask Claude things like:

- "Call the Twitter154 RapidAPI search endpoint for 'claude code' with limit 5"
- "Use RapidAPI to fetch weather from `weatherapi-com.p.rapidapi.com/current.json?q=Hanoi`"
- "Set my RapidAPI key from `$RAPIDAPI_KEY`"

The `rapidapi` skill activates automatically and runs the right CLI invocations.

## Repo

https://github.com/mrgoonie/rapidapi-cli
