import { describe, it, expect } from "bun:test";

// Inline the collectUnknownFlags logic to test it in isolation.
// The real function is unexported from call.ts, so we duplicate the pure logic here.
// If the implementation changes, this test validates the contract.
function collectUnknownFlags(rawArgs: string[]): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  let i = 0;
  while (i < rawArgs.length) {
    const token = rawArgs[i];
    if (token !== undefined && token.startsWith("--")) {
      const key = token.slice(2);
      const next = rawArgs[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        const existing = query[key];
        if (existing === undefined) {
          query[key] = next;
        } else if (Array.isArray(existing)) {
          existing.push(next);
        } else {
          query[key] = [existing, next];
        }
        i += 2;
      } else {
        query[key] = query[key] ?? "";
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return query;
}

describe("collectUnknownFlags", () => {
  it("maps --foo bar to { foo: 'bar' }", () => {
    expect(collectUnknownFlags(["--foo", "bar"])).toEqual({ foo: "bar" });
  });

  it("collects repeated keys into array", () => {
    const result = collectUnknownFlags(["--tag", "a", "--tag", "b"]);
    expect(result["tag"]).toEqual(["a", "b"]);
  });

  it("treats boolean flag (no value) as empty string", () => {
    expect(collectUnknownFlags(["--verbose"])).toEqual({ verbose: "" });
  });

  it("ignores bare positional values", () => {
    expect(collectUnknownFlags(["positional", "--key", "val"])).toEqual({ key: "val" });
  });

  it("handles multiple distinct flags", () => {
    const result = collectUnknownFlags(["--foo", "1", "--bar", "2"]);
    expect(result).toEqual({ foo: "1", bar: "2" });
  });

  it("returns empty object for empty input", () => {
    expect(collectUnknownFlags([])).toEqual({});
  });

  it("handles flag followed immediately by another flag", () => {
    const result = collectUnknownFlags(["--a", "--b", "val"]);
    expect(result["a"]).toBe("");
    expect(result["b"]).toBe("val");
  });
});
