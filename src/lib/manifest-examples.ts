/** Curated CLI examples per command name — used by manifest builder */
export const COMMAND_EXAMPLES: Record<string, string[]> = {
  call: [
    "rapidapi call twitter154.p.rapidapi.com /search/search --query foo",
    "rapidapi call api.example.com /v1/resource --method POST --data '{\"key\":\"val\"}'",
    "rapidapi call api.example.com /v1/resource --method GET --json",
  ],
  search: [
    "rapidapi search 'email validation' --limit 5",
    "rapidapi search weather --category Weather --limit 10 --json",
    "rapidapi search sms --tag messaging --cursor <endCursor>",
  ],
  config: [
    "rapidapi config set apiKey sk_mykey",
    "rapidapi config get apiKey",
    "rapidapi config list",
    "rapidapi config unset searchEndpoint",
    "rapidapi config path",
  ],
  login: [
    "rapidapi login --key sk_mykey",
    "echo $RAPIDAPI_KEY | rapidapi login",
  ],
};
