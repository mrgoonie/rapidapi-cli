/** Raw config fields as stored/read from env or file */
export interface RawConfig {
  apiKey: string;
  searchEndpoint: string;
  defaultHost: string;
}

/** Which source each resolved field came from */
export type ConfigOrigin = Partial<Record<keyof RawConfig, string>>;

/** Resolved config returned to commands */
export interface ResolvedConfig extends Partial<RawConfig> {
  /** Maps each field to the source label that won precedence */
  origin: ConfigOrigin;
}

/** Global CLI options available to every command */
export interface GlobalOptions {
  json: boolean;
  noColor: boolean;
  quiet: boolean;
  verbose: boolean;
  key?: string;
}

/** Shape of error output in --json mode */
export interface ErrorJson {
  error: {
    code: string;
    message: string;
    hint?: string;
  };
}

/** Result from executeRequest */
export interface HttpResult {
  status: number;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
}
