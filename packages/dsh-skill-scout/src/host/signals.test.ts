import { describe, expect, test } from "vitest";
import { episodesOfLog } from "./episodes.ts";
import type { Episode } from "./model.ts";
import { redact } from "./redact.ts";
import {
  detectCandidates,
  jaccard,
  orderAgreement,
  relation,
  similarity,
  tokens,
  weightOf,
  type Action,
} from "./signals.ts";
import {
  failingSession,
  migrationSession,
  recoverySession,
  releaseSession,
  routineSession,
  sessionLog,
} from "./testing.ts";
import type { DshSessionLog } from "./dsh.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);
const OPTIONS = { minOccurrences: 2 };

function episodes(...logs: readonly DshSessionLog[]): Episode[] {
  return logs.flatMap((log) =>
    episodesOfLog(log, { redact: (text) => redact(text), keepOutput: true }),
  );
}

/** 先构建、再发布一个网站：脚本名可以带后缀。 */
function deploy(id: string, start: number, build: string, ship: string): DshSessionLog {
  return sessionLog({ id, cwd: "/work/site" }, [], start)
    .human("Deploy the web app")
    .sh(`pnpm run ${build}`)
    .sh(`pnpm run ${ship}`)
    .end()
    .build();
}

/** 日常的改、装、测、提交、推送。 */
function everydayLoop(id: string, start: number): DshSessionLog {
  return sessionLog({ id, cwd: "/work/widget" }, [], start)
    .human("Fix the button alignment and commit")
    .edit("/work/widget/src/button.tsx")
    .sh("pnpm install")
    .sh("pnpm test")
    .sh("pnpm lint")
    .sh("git add -A")
    .sh("git commit -m 'fix: align button'")
    .sh("git push")
    .end()
    .build();
}

/** 按给定顺序执行一组命令的任务。 */
function ordered(id: string, start: number, commands: readonly string[]): DshSessionLog {
  return commands
    .reduce(
      (log, command) => log.sh(command),
      sessionLog({ id, cwd: "/work/infra" }, [], start).human("Roll out the infra change"),
    )
    .end()
    .build();
}

function action(key: string, family: Action["family"] = "run"): Action {
  return { key, sig: key, family };
}

/** 测试失败后只改源码就通过的一次调试。 */
function debug(id: string, start: number): DshSessionLog {
  return sessionLog({ id, cwd: "/work/widget" }, [], start)
    .human("tests are red")
    .sh("pnpm test", { exit: 1, output: "Error: ResizeObserver is not defined" })
    .edit("/work/widget/src/setup.ts")
    .sh("pnpm test")
    .end()
    .build();
}

describe("detectCandidates", () => {
  test("finds a workflow repeated in two independent sessions", () => {
    const found = detectCandidates(
      episodes(
        releaseSession("s1", T0, "Release a new patch version of widget"),
        releaseSession("s2", T0 + 3 * DAY, "发布 widget 的 patch 版本 release"),
        releaseSession("s3", T0 + 5 * DAY, "Cut a patch release for widget"),
      ),
      OPTIONS,
    );
    const repeated = found.filter((candidate) => candidate.kind === "repeated");
    expect(repeated).toHaveLength(1);
    expect(repeated[0]?.occurrences).toBeGreaterThanOrEqual(2);
    expect(repeated[0]?.features).toEqual(
      expect.arrayContaining(["pm publish", "pm version", "gh release create"]),
    );
    expect(repeated[0]?.steps).toEqual([
      "pnpm check",
      "pnpm bundle",
      "npm version",
      "git push",
      "npm publish",
      "gh release create",
    ]);
  });

  test("matches a workflow written with other package managers and described in another language", () => {
    const yarnRelease = sessionLog({ id: "s2", cwd: "/work/widget" }, [], T0 + 2 * DAY)
      .human("把 widget 发一个补丁版")
      .sh("yarn check")
      .sh("npm run bundle")
      .sh("pnpm version patch")
      .sh("git push --follow-tags")
      .sh("yarn publish")
      .sh("gh release create v1.4.3")
      .end()
      .build();
    const found = detectCandidates(
      episodes(releaseSession("s1", T0, "Release a new patch version of widget"), yarnRelease),
      OPTIONS,
    );
    expect(found.map((candidate) => [candidate.kind, candidate.occurrences])).toEqual([
      ["repeated", 2],
    ]);
  });

  test("matches package scripts that share a stem", () => {
    const found = detectCandidates(
      episodes(
        deploy("s1", T0, "build:web", "deploy:web"),
        deploy("s2", T0 + DAY, "build", "deploy"),
      ),
      OPTIONS,
    );
    expect(found.map((candidate) => candidate.kind)).toEqual(["repeated"]);
  });

  test("does not call the everyday edit, test, commit loop a repeated workflow", () => {
    const logs = episodes(everydayLoop("s1", T0), everydayLoop("s2", T0 + DAY));
    expect(detectCandidates(logs, OPTIONS)).toEqual([]);
  });

  test("does not join unrelated tasks that share one deploy command", () => {
    const docs = sessionLog({ id: "s1", cwd: "/work/site" }, [], T0)
      .human("Publish the new pricing docs page")
      .edit("/work/site/docs/pricing.md")
      .sh("pnpm run build:docs")
      .sh("wrangler deploy")
      .end()
      .build();
    const login = sessionLog({ id: "s2", cwd: "/work/site" }, [], T0 + DAY)
      .human("The OAuth callback returns 500, fix it")
      .edit("/work/site/src/auth.ts")
      .sh("pnpm test")
      .sh("wrangler deploy")
      .end()
      .build();
    expect(detectCandidates(episodes(docs, login), OPTIONS)).toEqual([]);
  });

  test("does not join unrelated tasks that only share inline scripts and HTTP requests", () => {
    const stars = sessionLog({ id: "s1", cwd: "/work/site" }, [], T0)
      .human("How many stars does the repo have on GitHub?")
      .sh("python3 -c 'print(1)'")
      .sh("curl -s https://api.github.com/repos/a/b")
      .sh("git commit -m 'docs: stars'")
      .end()
      .build();
    const login = sessionLog({ id: "s2", cwd: "/work/site" }, [], T0 + DAY)
      .human("Fix the login page styles")
      .edit("/work/site/src/login.css")
      .sh("python3 -c 'print(2)'")
      .sh("curl -s http://localhost:3000/login")
      .sh("pnpm test")
      .end()
      .build();
    expect(detectCandidates(episodes(stars, login), OPTIONS)).toEqual([]);
  });

  test("does not join workflows whose shared steps run in another order", () => {
    const forward = [
      "terraform init",
      "terraform plan",
      "terraform apply",
      "helm upgrade api ./chart",
    ];
    const found = detectCandidates(
      episodes(ordered("s1", T0, forward), ordered("s2", T0 + DAY, forward.toReversed())),
      OPTIONS,
    );
    expect(found.filter((candidate) => candidate.kind === "repeated")).toEqual([]);
  });

  test("joins the same failure across sessions when the build ran under another spelling", () => {
    const viaVite = sessionLog({ id: "s2", cwd: "/work/app" }, [], T0 + DAY)
      .human("vite build fails on the new laptop")
      .sh("npx vite build", {
        exit: 1,
        output:
          "Error: Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies.",
      })
      .sh("rm -rf node_modules package-lock.json && npm install")
      .sh("npx vite build")
      .end()
      .build();
    const found = detectCandidates(episodes(recoverySession("s1", T0), viaVite), OPTIONS);
    expect(found.map((candidate) => [candidate.kind, candidate.occurrences])).toEqual([
      ["recovery", 2],
    ]);
    expect(found[0]?.steps).toEqual(["pnpm build", "rm", "pnpm install", "pnpm build"]);
  });

  test("keeps different failures of the same command apart", () => {
    const found = detectCandidates(
      episodes(
        recoverySession("s1", T0),
        recoverySession(
          "s2",
          T0 + DAY,
          "/work/site",
          "Error: ENOSPC: no space left on device, write",
        ),
      ),
      OPTIONS,
    );
    expect(found.map((candidate) => [candidate.kind, candidate.occurrences])).toEqual([
      ["recovery", 1],
      ["recovery", 1],
    ]);
  });

  test("does not count one session twice", () => {
    const log = sessionLog({ id: "s1", cwd: "/work/widget" })
      .human("Release a patch version")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end()
      .human("Release a patch version again")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end()
      .build();
    expect(detectCandidates(episodes(log), OPTIONS)).toEqual([]);
  });

  test("does not count a forked replay as an independent repetition", () => {
    const parent = sessionLog({ id: "parent", cwd: "/work/widget" })
      .human("Release a patch version")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end();
    const fork = sessionLog({ id: "fork", cwd: "/work/widget" }, parent.build().events)
      .human("Release a patch version")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end()
      .build();
    expect(detectCandidates(episodes(parent.build(), fork), OPTIONS)).toEqual([]);
  });

  test("finds a verified recovery that needed a dependency reinstall", () => {
    const found = detectCandidates(episodes(recoverySession("s1", T0)), OPTIONS);
    expect(found.map((candidate) => [candidate.kind, candidate.occurrences])).toEqual([
      ["recovery", 1],
    ]);
  });

  test("needs two sessions before a source-only fix becomes a debugging pattern", () => {
    expect(detectCandidates(episodes(debug("s1", T0)), OPTIONS)).toEqual([]);
    const found = detectCandidates(episodes(debug("s1", T0), debug("s2", T0 + DAY)), OPTIONS);
    expect(found.map((candidate) => [candidate.kind, candidate.occurrences])).toEqual([
      ["recovery", 2],
    ]);
  });

  test("leaves a long one-off migration to the summary as a complex candidate", () => {
    const found = detectCandidates(episodes(migrationSession("s1", T0)), OPTIONS);
    expect(found.map((candidate) => candidate.kind)).toEqual(["complex"]);
  });

  test("finds nothing in routine edits or failed attempts", () => {
    const found = detectCandidates(
      episodes(
        routineSession("s1", T0),
        routineSession("s2", T0 + DAY),
        failingSession("s3", T0 + 2 * DAY),
        failingSession("s4", T0 + 3 * DAY),
      ),
      OPTIONS,
    );
    expect(found).toEqual([]);
  });

  test("keeps candidate ids stable across detections", () => {
    const logs = [
      releaseSession("s1", T0, "Release a new patch version of widget"),
      releaseSession("s2", T0 + DAY, "Release a patch version of widget"),
    ];
    const first = detectCandidates(episodes(...logs), OPTIONS)[0]?.id;
    const second = detectCandidates(episodes(...logs.toReversed()), OPTIONS)[0]?.id;
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });
});

describe("similarity", () => {
  test("rates partial matches below exact ones and unrelated actions at zero", () => {
    expect(relation(action("pm run build", "build"), action("pm run build", "build"))).toBe(1);
    expect(relation(action("pm run build:web", "build"), action("pm run build", "build"))).toBe(
      0.7,
    );
    expect(relation(action("pm run test", "test"), action("pytest", "test"))).toBe(0.5);
    expect(relation(action("wrangler deploy", "publish"), action("vercel deploy", "publish"))).toBe(
      0,
    );
  });

  test("weights inline code and HTTP requests like routine steps", () => {
    expect(weightOf(action("python -c"))).toBe(weightOf(action("git push", "vcs")));
    expect(weightOf(action("curl"))).toBe(weightOf(action("git push", "vcs")));
    expect(weightOf(action("seed.ts"))).toBe(1);
  });

  test("weights routine steps below distinctive ones", () => {
    expect(weightOf(action("git commit", "vcs"))).toBeLessThan(
      weightOf(action("pm run test", "test")),
    );
    expect(weightOf(action("pm run test", "test"))).toBeLessThan(
      weightOf(action("gh release create", "publish")),
    );
  });

  test("scores two routine-only procedures as similar but leaves them unshared", () => {
    const loop = [
      action("pm install", "install"),
      action("pm run test", "test"),
      action("git commit", "vcs"),
    ];
    expect(similarity(loop, loop)).toBe(1);
    expect(
      similarity(loop, [action("cargo build", "build"), action("docker push", "publish")]),
    ).toBe(0);
  });

  test("measures how many shared steps keep their order", () => {
    const steps = ["a", "b", "c", "d"].map((key) => action(key));
    expect(orderAgreement(steps, steps)).toBe(1);
    expect(orderAgreement(steps, steps.toReversed())).toBe(0);
  });
});

describe("tokens", () => {
  test("splits Latin words and Chinese character pairs", () => {
    expect([...tokens("发布 widget 的版本 please")]).toEqual(["widget", "发布", "的版", "版本"]);
    expect(jaccard(tokens("release widget"), tokens("Release Widget"))).toBe(1);
  });
});
