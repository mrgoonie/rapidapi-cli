export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string,
    public readonly exitCode: number = 1,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function missingKey(): CliError {
  return new CliError(
    "MISSING_KEY",
    "RAPIDAPI_KEY required",
    "Set via --key, RAPIDAPI_KEY env, or `rapidapi config set apiKey <value>`",
    2
  );
}

export function badEndpoint(url: string): CliError {
  return new CliError(
    "BAD_ENDPOINT",
    `Invalid endpoint: ${url}`,
    "Provide a valid host and path, e.g. rapidapi call api.example.com /v1/resource"
  );
}

export function httpError(status: number, body: string): CliError {
  const exitCode = status >= 500 ? 2 : 1;
  return new CliError(
    "HTTP_ERROR",
    `HTTP ${status}`,
    body.slice(0, 200),
    exitCode
  );
}

export function configInvalid(reason: string): CliError {
  return new CliError(
    "CONFIG_INVALID",
    `Invalid config: ${reason}`,
    "Run `rapidapi config list` to inspect current config"
  );
}
