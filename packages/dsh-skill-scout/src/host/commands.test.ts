import { describe, expect, test } from "vitest";
import { parseCommand } from "./commands.ts";

describe("parseCommand", () => {
  test("names package scripts and subcommands", () => {
    expect(parseCommand("pnpm test").main).toEqual({ sig: "pnpm test", family: "test" });
    expect(parseCommand("pnpm run build:web").main).toEqual({
      sig: "pnpm run build:web",
      family: "build",
    });
    expect(parseCommand("git commit -m 'feat: x'").main).toEqual({
      sig: "git commit",
      family: "vcs",
    });
    expect(parseCommand("gh pr create --fill").main).toEqual({
      sig: "gh pr create",
      family: "vcs",
    });
  });

  test("strips environment assignments, wrappers, and runners", () => {
    expect(parseCommand("CI=1 timeout 60 npx vitest run src").main?.sig).toBe("vitest");
    expect(parseCommand("pnpm exec oxlint --type-aware").main).toEqual({
      sig: "oxlint",
      family: "check",
    });
    expect(parseCommand("uv run pytest -q").main).toEqual({ sig: "pytest", family: "test" });
    expect(parseCommand("python3 -m pytest tests").main?.family).toBe("test");
  });

  test("picks the last meaningful segment of a command chain", () => {
    const parsed = parseCommand("cd packages/a && pnpm install && pnpm build 2>&1 | tail -20");
    expect(parsed.segments.map((segment) => segment.sig)).toEqual([
      "cd",
      "pnpm install",
      "pnpm build",
      "tail",
    ]);
    expect(parsed.main).toEqual({ sig: "pnpm build", family: "build" });
  });

  test("treats read-only commands as inspection", () => {
    expect(parseCommand("ls -la && git status --short").main?.family).toBe("inspect");
    expect(parseCommand("sed -n 1,40p README.md").main?.family).toBe("inspect");
    expect(parseCommand("sed -i 's/a/b/' x.txt").main?.family).toBe("run");
  });

  test("keeps the outer command when a quoted substitution nests quotes", () => {
    const parsed = parseCommand(`git tag "v$(node -p "require('./package.json').version")"`);
    expect(parsed.segments).toEqual([{ sig: "git tag", family: "vcs" }]);
    expect(parseCommand("cd $(git rev-parse --show-toplevel) && pnpm test").main).toEqual({
      sig: "pnpm test",
      family: "test",
    });
  });

  test("skips global options and their values before the subcommand", () => {
    expect(parseCommand("pnpm --filter @scope/pkg run bundle").main).toEqual({
      sig: "pnpm run bundle",
      family: "build",
    });
    expect(parseCommand("git -C ../repo status").main?.sig).toBe("git status");
    expect(parseCommand("docker -H tcp://host:2375 build .").main?.sig).toBe("docker build");
    expect(parseCommand("cargo --manifest-path a/Cargo.toml test").main).toEqual({
      sig: "cargo test",
      family: "test",
    });
    expect(parseCommand("uv --directory web run pytest").main?.sig).toBe("pytest");
    expect(parseCommand("gh -R owner/repo pr view 1").main?.sig).toBe("gh pr view");
  });

  test("leaves words that do not look like a subcommand out of the signature", () => {
    expect(parseCommand("kubectl ghp_abcdefghijklmnopqrstuvwxyz0123456789ab").main?.sig).toBe(
      "kubectl",
    );
    expect(parseCommand("pnpm https://registry.example.com/x").main?.sig).toBe("pnpm");
  });

  test("counts formatters as checks only in check mode", () => {
    expect(parseCommand("oxfmt --check").main?.family).toBe("check");
    expect(parseCommand("oxfmt").main?.family).toBe("run");
  });
});
