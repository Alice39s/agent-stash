import { describe, expect, test } from "vitest";
import { editKey, episodesOfLog, judgeOutcome, normalizeError, toolKind } from "./episodes.ts";
import { compilePatterns, redact } from "./redact.ts";
import {
  failingSession,
  hostileSession,
  recoverySession,
  releaseSession,
  routineSession,
  sessionLog,
} from "./testing.ts";

const OPTIONS = { redact: (text: string) => redact(text), keepOutput: true };
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);

describe("episodesOfLog", () => {
  test("pairs direct and run_code tool calls with their results", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("build it")
      .bash("pnpm build", { exit: 2, output: "error TS2345: bad" })
      .edit("/w/src/a.ts")
      .sh("pnpm build")
      .end()
      .build();
    const [episode] = episodesOfLog(log, OPTIONS);
    expect(episode?.ops.map((op) => [op.kind, op.sig, op.ok, op.exit])).toEqual([
      ["exec", "pnpm build", false, 2],
      ["edit", "src/a.ts", true, null],
      ["exec", "pnpm build", true, 0],
    ]);
    expect(episode?.ops[0]?.error).toBe("error TS2345: bad");
  });

  test("marks a task verified only when a check passes after the last edit", () => {
    const [verified] = episodesOfLog(recoverySession("s1", T0), OPTIONS);
    expect(verified?.outcome).toBe("verified");
    const [failed] = episodesOfLog(failingSession("s2", T0), OPTIONS);
    expect(failed?.outcome).toBe("failed");
  });

  test("ignores the agent's own claim of success", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("fix the bug")
      .edit("/w/src/a.ts")
      .reply("All tests pass now.")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.outcome).toBe("unverified");
  });

  test("downgrades success when the user says it did not work", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("fix the bug")
      .edit("/w/src/a.ts")
      .sh("pnpm test")
      .end()
      .human("还是不行，页面还是白屏")
      .reply("Looking.")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.outcome).toBe("disputed");
  });

  test("keeps steering messages inside the running task", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("bump deps")
      .sh("pnpm update")
      .human("only minor versions please")
      .sh("pnpm test")
      .end()
      .build();
    const episodes = episodesOfLog(log, OPTIONS);
    expect(episodes).toHaveLength(1);
    expect(episodes[0]?.goal).toBe("bump deps");
    expect(episodes[0]?.steering).toEqual(["only minor versions please"]);
  });

  test("skips a task whose turn is still running", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" }).human("long job").sh("pnpm build").build();
    expect(episodesOfLog(log, OPTIONS)).toEqual([]);
  });

  test("skips the inherited prefix of a fork and flags a replayed request", () => {
    const parent = sessionLog({ id: "parent", cwd: "/w" })
      .human("release it")
      .sh("pnpm bundle")
      .end();
    const fork = sessionLog({ id: "fork", cwd: "/w" }, parent.build().events)
      .human("release it")
      .sh("pnpm bundle")
      .end()
      .human("now write the changelog")
      .edit("/w/CHANGELOG.md")
      .end()
      .build();
    const episodes = episodesOfLog(fork, OPTIONS);
    expect(episodes.map((episode) => [episode.goal, episode.replay])).toEqual([
      ["release it", true],
      ["now write the changelog", false],
    ]);
    expect(episodes.every((episode) => episode.startSeq >= fork.inheritedEventCount)).toBe(true);
  });

  test("finds a recovery that needed a dependency reinstall", () => {
    const [episode] = episodesOfLog(recoverySession("s1", T0), OPTIONS);
    expect(episode?.recoveries).toEqual([
      expect.objectContaining({
        sig: "pnpm build",
        key: "pm run build",
        fixKinds: ["install"],
        procedural: true,
      }),
    ]);
    expect(episode?.recoveries[0]?.errorSig).toBe(
      "pm run build: Error: Cannot find module @rollup/rollup-<platform>. npm has a bug related to optional dependencies.",
    );
  });

  test("closes a recovery when the same action passes under another spelling", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("tests fail after the upgrade")
      .sh("npm test", { exit: 1, output: "Error: Cannot find module 'jsdom'" })
      .sh("pnpm add -D jsdom")
      .sh("pnpm test")
      .end()
      .build();
    const [episode] = episodesOfLog(log, OPTIONS);
    expect(episode?.outcome).toBe("verified");
    expect(episode?.recoveries).toMatchObject([
      { sig: "pnpm test", key: "pm run test", fixKinds: ["install"] },
    ]);
  });

  test("keeps a failure open when a different action passes", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("build and test")
      .sh("pnpm build", { exit: 1, output: "error TS2304: Cannot find name 'x'" })
      .sh("pnpm add -D @types/node")
      .sh("pnpm test")
      .end()
      .build();
    const [episode] = episodesOfLog(log, OPTIONS);
    expect(episode?.recoveries).toEqual([]);
    expect(episode?.outcome).toBe("failed");
  });

  test("counts a restored JSON build config as a procedural fix", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("the build fails, fix it")
      .bash("npm run build", {
        exit: 1,
        output: "Error: Cannot find build config build.config.json",
      })
      .edit("/w/build.config.json")
      .bash("npm run build")
      .bash("npm test")
      .end()
      .build();
    const [episode] = episodesOfLog(log, OPTIONS);
    expect(episode?.recoveries).toMatchObject([{ fixKinds: ["config"], procedural: true }]);
  });

  test("does not count a failed edit as a fix", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("the build fails, fix it")
      .bash("npm run build", { exit: 1, output: "Error: Cannot find build config" })
      .edit("/w/build.config.json", false)
      .bash("npm run build")
      .bash("npm test")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.recoveries).toEqual([]);
  });

  test("keeps credentials out of command signatures", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("check the pods")
      .sh("kubectl --token s3cr3t-value-123 get pods")
      .sh("deploy-tool --api-key k3y-value-456 sync")
      .sh("kubectl --password hunter2 get pods")
      .end()
      .build();
    const ops = episodesOfLog(log, OPTIONS)[0]?.ops ?? [];
    expect(ops.map((op) => op.sig)).toEqual(["kubectl get", "deploy-tool", "kubectl get"]);
    expect(JSON.stringify(ops)).not.toMatch(/s3cr3t|k3y-value|hunter2/u);
  });

  test("counts a rerun with changed options as a command fix", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("the tests time out in CI mode")
      .sh("pnpm test", { exit: 1, output: "Error: Test timed out in 5000ms" })
      .sh("pnpm test --runInBand")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.recoveries).toMatchObject([
      { key: "pm run test", fixKinds: ["command"], procedural: true },
    ]);
  });

  test("does not call another inline snippet or another URL a fix", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("how many records are in a.json, and is staging up?")
      .sh("python3 -c 'import json; print(len(json.load(open(\"a.json\"))))'", {
        exit: 1,
        output: "KeyError: 'items'",
      })
      .sh('python3 -c \'import json; print(len(json.load(open("a.json"))["data"]))\'')
      .sh("curl -fsS https://staging.example.com/health", { exit: 22, output: "curl: (22) 404" })
      .sh("curl -fsS https://staging.example.com/api/health")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.recoveries).toEqual([]);
  });

  test("does not count an inline check between a failure and a source fix as a procedural fix", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("fix the failing date formatter test")
      .sh("pnpm test", { exit: 1, output: "FAIL src/date.test.ts > formats ISO dates" })
      .edit("/w/src/date.ts")
      .sh("node -e 'console.log(new Date(0).toISOString())'")
      .sh("pnpm test")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.recoveries).toMatchObject([
      { key: "pm run test", fixKinds: ["source"], procedural: false },
    ]);
  });

  test("keeps an inline script recovery that needed a package install", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("parse the config with yaml")
      .sh("python3 -c 'import yaml'", {
        exit: 1,
        output: "ModuleNotFoundError: No module named 'yaml'",
      })
      .sh("pip install pyyaml")
      .sh("python3 -c 'import yaml'")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.recoveries).toMatchObject([
      { key: "python -c", fixKinds: ["install"], procedural: true },
    ]);
  });

  test("does not call a plain retry a recovery", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("run the tests")
      .sh("pnpm test", { exit: 1, output: "ECONNRESET" })
      .sh("pnpm test")
      .end()
      .build();
    expect(episodesOfLog(log, OPTIONS)[0]?.recoveries).toEqual([]);
  });

  test("redacts credentials and home directories in recorded text", () => {
    const [episode] = episodesOfLog(hostileSession("s1", T0), OPTIONS);
    const { cwd, ...recorded } = episode ?? { cwd: null };
    expect(JSON.stringify(recorded)).not.toMatch(
      /sk-live-|ghp_|SECRETVALUE|abcdefghijklmnop123456|alice/u,
    );
    // 工作目录留在本机存储里，用来定位项目级 Skill 目录；发给模型前另行脱敏。
    expect(cwd).toBe("/Users/alice/work/widget");
    expect(episode?.goal).toBe("Deploy the preview with my token [redacted]");
  });

  test("drops tool output when output sharing is off", () => {
    const [episode] = episodesOfLog(recoverySession("s1", T0), { ...OPTIONS, keepOutput: false });
    expect(episode?.ops[0]?.error).toBeNull();
    expect(episode?.recoveries[0]?.errorSig).toBe("pm run build exit 1");
  });

  test("records edits and shell calls from other agents' and MCP tools", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("bump the version")
      .tool("mcp__fs__edit_file", { path: "/w/package.json" })
      .tool("MultiEdit", { file_path: "/w/CHANGELOG.md" })
      .tool("apply_patch", { input: "*** Begin Patch\n*** Update File: src/a.ts\n@@\n-a\n+b" })
      .tool("run_terminal_cmd", { command: "pnpm test" })
      .tool("mcp__github__create_issue", { title: "x" })
      .end()
      .build();
    const [episode] = episodesOfLog(log, OPTIONS);
    expect(episode?.ops.map((op) => [op.kind, op.key])).toEqual([
      ["edit", "edit package.json"],
      ["edit", "edit CHANGELOG.md"],
      ["edit", "edit"],
      ["exec", "pm run test"],
      ["exec", "tool:create_issue"],
    ]);
    expect(episode?.outcome).toBe("verified");
  });

  test("applies user redaction patterns", () => {
    const patterns = compilePatterns(["acme-[0-9]+"]);
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("ship acme-4242")
      .sh("pnpm build")
      .end()
      .build();
    const [episode] = episodesOfLog(log, { ...OPTIONS, redact: (text) => redact(text, patterns) });
    expect(episode?.goal).toBe("ship [redacted]");
  });

  test("keeps routine sessions small", () => {
    const [episode] = episodesOfLog(routineSession("s1", T0 + DAY), OPTIONS);
    expect(episode?.counts).toEqual({ read: 2, edit: 1, exec: 1, delegate: 0 });
    expect(episode?.ops).toHaveLength(2);
  });

  test("reads a release workflow end to end", () => {
    const [episode] = episodesOfLog(releaseSession("s1", T0, "Release a patch version"), OPTIONS);
    expect(episode?.outcome).toBe("verified");
  });

  test("fails a task whose last step failed after the check passed", () => {
    const log = sessionLog({ id: "s1", cwd: "/w" })
      .human("release a patch version")
      .bash("npm test")
      .bash("npm version patch --no-git-tag-version")
      .bash("npm pack --pack-destination .release", { exit: 255, output: "npm error EACCES" })
      .reply("Released.")
      .end()
      .build();
    const [episode] = episodesOfLog(log, OPTIONS);
    expect(episode?.outcome).toBe("failed");
    expect(episode?.evidence).toEqual([episode?.ops[2]?.seq]);
  });
});

describe("tool classification", () => {
  test.each([
    ["bash", "shell"],
    ["run_terminal_cmd", "shell"],
    ["mcp__desktop__execute_command", "shell"],
    ["edit", "edit"],
    ["MultiEdit", "edit"],
    ["mcp__filesystem__write_file", "edit"],
    ["str_replace_based_edit_tool", "edit"],
    ["read", "read"],
    ["mcp__filesystem__read_text_file", "read"],
    ["codebase_search", "read"],
    ["mcp__github__create_issue", "other"],
    ["create_pull_request", "other"],
    ["todo_write", null],
  ])("classifies %s as %s", (tool, kind) => {
    expect(toolKind(tool)).toBe(kind);
  });

  test("names edits only for files with a fixed role", () => {
    expect(editKey("package.json")).toBe("edit package.json");
    expect(editKey("packages/a/package.json")).toBe("edit package.json");
    expect(editKey(".github/workflows/release.yml")).toBe("edit .github/workflows");
    expect(editKey("vite.config.ts")).toBe("edit vite.config.ts");
    expect(editKey("src/index.ts")).toBe("edit");
  });
});

describe("normalizeError", () => {
  test("gives the same error from two machines one signature", () => {
    expect(
      normalizeError(
        "Error: Cannot find module '/Users/a/proj/node_modules/x/index.js' at /Users/a/proj/src/b.ts:12:5",
      ),
    ).toBe(
      normalizeError(
        "Error: Cannot find module '/home/b/work/node_modules/x/index.js' at /home/b/work/src/c.ts:40:17",
      ),
    );
    expect(
      normalizeError("ERR_PNPM_FETCH_404 GET https://registry.npmjs.org/x: Not Found - 404"),
    ).toBe("ERR_PNPM_FETCH_404 GET <url> Not Found - <n>");
    expect(normalizeError("requires node >=20.11.0, found v18.19.1")).toBe(
      "requires node >=<ver>, found <ver>",
    );
    expect(normalizeError("Cannot find module @rollup/rollup-linux-x64-gnu")).toBe(
      normalizeError("Cannot find module @rollup/rollup-darwin-arm64"),
    );
  });

  test("keeps different errors apart", () => {
    expect(normalizeError("error TS2304: Cannot find name 'x'")).not.toBe(
      normalizeError("error TS2345: Argument of type 'x' is not assignable"),
    );
  });
});

describe("judgeOutcome", () => {
  test("treats cancelled and failed turns as unsuccessful", () => {
    expect(judgeOutcome([], "aborted", null).outcome).toBe("aborted");
    expect(judgeOutcome([], "error", null).outcome).toBe("failed");
  });
});
