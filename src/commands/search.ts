import type { Command } from "commander";
import { resolveConfig } from "../lib/config/index.ts";
import { gqlPost } from "../lib/graphql-client.ts";
import { SEARCH_APIS_QUERY } from "../lib/queries/search-apis.graphql.ts";
import { CliError } from "../lib/errors.ts";
import { formatOutput, formatError } from "../lib/output.ts";
import type { GlobalOptions } from "../types.ts";

interface ApiNode {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  rating: number | null;
  categoryNames: string[] | null;
  tags: string[] | null;
}

interface SearchEdge {
  node: ApiNode;
  cursor: string;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface SearchApisData {
  searchApis: {
    edges: SearchEdge[];
    pageInfo: PageInfo;
    total: number;
  };
}

interface SearchResult {
  name: string;
  description: string;
  provider: string;
  rating: number | null;
  cursor: string;
}

interface SearchOutput {
  results: SearchResult[];
  pageInfo: PageInfo;
  total: number;
  nextCursor: string | null;
}

interface SearchOptions {
  category?: string;
  tag?: string;
  limit: string;
  cursor?: string;
  key?: string;
  identityKey?: string;
}

/** Truncate string to maxLen chars, appending … if cut */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/** Print results as a simple aligned table to stdout */
function printTable(results: SearchResult[], total: number): void {
  if (results.length === 0) {
    process.stdout.write("No results found.\n");
    return;
  }

  const NAME_W = 30;
  const PROV_W = 20;
  const RATE_W = 6;
  const DESC_W = 60;

  const header =
    "Name".padEnd(NAME_W) +
    "  " +
    "Provider".padEnd(PROV_W) +
    "  " +
    "Rating".padEnd(RATE_W) +
    "  " +
    "Description";
  const divider = "-".repeat(NAME_W + PROV_W + RATE_W + DESC_W + 8);

  process.stdout.write(`${header}\n${divider}\n`);

  for (const r of results) {
    const name = truncate(r.name, NAME_W).padEnd(NAME_W);
    const prov = truncate(r.provider || "—", PROV_W).padEnd(PROV_W);
    const rate = (r.rating != null ? r.rating.toFixed(1) : "—").padEnd(RATE_W);
    const desc = truncate(r.description || "", DESC_W);
    process.stdout.write(`${name}  ${prov}  ${rate}  ${desc}\n`);
  }

  process.stdout.write(`\nTotal: ${total}\n`);
}

export function registerSearch(program: Command): void {
  program
    .command("search <query>")
    .description("Search for APIs on RapidAPI Enterprise Hub (requires searchEndpoint)")
    .option("--category <category>", "Filter by category name")
    .option("--tag <tag>", "Filter by tag")
    .option("--limit <n>", "Number of results to return", "10")
    .option("--cursor <cursor>", "Pagination cursor (endCursor from previous page)")
    .option("--key <key>", "RapidAPI key (overrides env/config)")
    .option("--identity-key <key>", "RapidAPI identity key for Enterprise team accounts")
    .addHelpText("after", `
Examples:
  # Basic text search
  $ rapidapi search "twitter" --limit 10

  # Filter by category, machine-readable output
  $ rapidapi search "weather" --category "Data" --json

  # Paginate results
  $ rapidapi search "maps" --limit 10 --json
  $ rapidapi search "maps" --limit 10 --cursor <endCursor> --json

Note: requires searchEndpoint to be configured.
  $ rapidapi config set searchEndpoint https://your-hub.p.rapidapi.com/graphql
`)
    .action(async (query: string, opts: SearchOptions, cmd: Command) => {
      const globalOpts = cmd.parent?.opts<GlobalOptions>() ?? {
        json: false, noColor: false, quiet: false, verbose: false,
      };

      try {
        const cliFlags: Record<string, string> = {};
        if (opts.key) cliFlags["apiKey"] = opts.key;

        const config = resolveConfig(cliFlags);

        if (!config.apiKey) {
          throw new CliError(
            "MISSING_KEY",
            "RAPIDAPI_KEY required",
            "Set via --key, RAPIDAPI_KEY env, or `rapidapi config set apiKey <value>`",
            2
          );
        }

        if (!config.searchEndpoint) {
          throw new CliError(
            "SEARCH_NOT_CONFIGURED",
            "searchEndpoint is not configured",
            "Set RAPIDAPI_SEARCH_ENDPOINT or run `rapidapi config set searchEndpoint <url>`. Requires RapidAPI Enterprise Hub.",
            2
          );
        }

        const limit = parseInt(opts.limit, 10);
        if (isNaN(limit) || limit < 1) {
          throw new CliError("INVALID_LIMIT", `Invalid --limit value: ${opts.limit}`, "Must be a positive integer", 1);
        }

        const where: Record<string, unknown> = {
          term: query,
          locale: "EN_US",
        };
        if (opts.category) where["categoryNames"] = [opts.category];
        if (opts.tag) where["tags"] = [opts.tag];

        const variables: Record<string, unknown> = {
          where,
          pagination: { first: limit, after: opts.cursor ?? null },
          orderBy: { field: "POPULARITY", direction: "DESC" },
        };

        if (globalOpts.verbose) {
          process.stderr.write(`> POST ${config.searchEndpoint}\n`);
        }

        const data = await gqlPost<SearchApisData>(
          config.searchEndpoint,
          SEARCH_APIS_QUERY,
          variables,
          { apiKey: config.apiKey, identityKey: opts.identityKey }
        );

        const edges = data.searchApis.edges;
        const pageInfo = data.searchApis.pageInfo;
        const total = data.searchApis.total;

        const results: SearchResult[] = edges.map((edge) => ({
          name: edge.node.name,
          description: edge.node.description ?? "",
          provider: edge.node.provider ?? "",
          rating: edge.node.rating ?? null,
          cursor: edge.cursor,
        }));

        const output: SearchOutput = {
          results,
          pageInfo,
          total,
          nextCursor: pageInfo.endCursor ?? null,
        };

        if (globalOpts.json) {
          formatOutput(output, globalOpts);
        } else {
          printTable(results, total);
          if (pageInfo.hasNextPage && pageInfo.endCursor) {
            process.stdout.write(`\nNext page: --cursor ${pageInfo.endCursor}\n`);
          }
        }
      } catch (err) {
        formatError(err, globalOpts);
        if (err instanceof CliError) process.exit(err.exitCode);
        else process.exit(1);
      }
    });
}
