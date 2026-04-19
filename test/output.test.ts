import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { formatOutput, formatError, shouldColor } from "../src/lib/output.ts";
import { CliError } from "../src/lib/errors.ts";

// Capture stdout/stderr writes
function captureStdout(fn: () => void): string {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  };
  fn();
  process.stdout.write = orig;
  return chunks.join("");
}

function captureStderr(fn: () => void): string {
  const chunks: string[] = [];
  const orig = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  };
  fn();
  process.stderr.write = orig;
  return chunks.join("");
}

describe("shouldColor", () => {
  it("returns false when json=true", () => {
    expect(shouldColor({ json: true, noColor: false })).toBe(false);
  });

  it("returns false when noColor=true", () => {
    expect(shouldColor({ json: false, noColor: true })).toBe(false);
  });

  it("returns false when NO_COLOR env set", () => {
    process.env["NO_COLOR"] = "1";
    expect(shouldColor({ json: false, noColor: false })).toBe(false);
    delete process.env["NO_COLOR"];
  });
});

describe("formatOutput", () => {
  it("emits compact JSON when json=true", () => {
    const out = captureStdout(() =>
      formatOutput({ a: 1 }, { json: true, noColor: false })
    );
    expect(out.trim()).toBe('{"a":1}');
  });

  it("emits pretty output when json=false", () => {
    const out = captureStdout(() =>
      formatOutput({ hello: "world" }, { json: false, noColor: true })
    );
    expect(out).toContain("hello");
    expect(out).toContain("world");
  });
});

describe("formatError", () => {
  it("json mode: writes JSON error to stdout", () => {
    const err = new CliError("TEST_CODE", "test message", "hint text");
    const out = captureStdout(() =>
      formatError(err, { json: true, noColor: false })
    );
    const parsed = JSON.parse(out) as { error: { code: string; message: string; hint: string } };
    expect(parsed.error.code).toBe("TEST_CODE");
    expect(parsed.error.message).toBe("test message");
    expect(parsed.error.hint).toBe("hint text");
  });

  it("human mode: writes to stderr", () => {
    const err = new CliError("TEST_CODE", "test message");
    const errOut = captureStderr(() =>
      formatError(err, { json: false, noColor: true })
    );
    expect(errOut).toContain("test message");
  });

  it("handles non-CliError in json mode", () => {
    const out = captureStdout(() =>
      formatError(new Error("boom"), { json: true, noColor: false })
    );
    const parsed = JSON.parse(out) as { error: { code: string; message: string } };
    expect(parsed.error.code).toBe("UNEXPECTED_ERROR");
    expect(parsed.error.message).toBe("boom");
  });
});
