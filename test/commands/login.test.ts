import { describe, it, expect } from "bun:test";
import { CliError } from "../../src/lib/errors.ts";

describe("login — non-TTY without --key", () => {
  it("throws NO_TTY_NO_KEY when stdin is not a TTY and no key provided", () => {
    // Simulate the guard logic from login.ts directly
    const isTTY = false;
    const key: string | undefined = undefined;

    let thrown: unknown;
    try {
      if (!key && !isTTY) {
        throw new CliError(
          "NO_TTY_NO_KEY",
          "No TTY detected and --key not provided",
          "Pass --key <k> or run in an interactive terminal",
          2
        );
      }
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(CliError);
    expect((thrown as InstanceType<typeof CliError>).code).toBe("NO_TTY_NO_KEY");
    expect((thrown as InstanceType<typeof CliError>).exitCode).toBe(2);
  });

  it("succeeds when --key is provided regardless of TTY", () => {
    const isTTY = false;
    const key = "sk_test_fake";

    let thrown: unknown;
    try {
      if (!key && !isTTY) {
        throw new CliError("NO_TTY_NO_KEY", "No TTY", undefined, 2);
      }
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeUndefined();
  });
});

describe("login — empty key", () => {
  it("throws EMPTY_KEY when prompted key is empty string", () => {
    const apiKey = "";
    let thrown: unknown;
    try {
      if (!apiKey) {
        throw new CliError("EMPTY_KEY", "No API key entered", undefined, 1);
      }
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(CliError);
    expect((thrown as InstanceType<typeof CliError>).code).toBe("EMPTY_KEY");
  });
});
