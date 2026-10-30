import { describe, expect, test } from "vitest";
import { isOpaque, optionsOf, parseCommand, scriptStem } from "./commands.ts";

/** 主段命令的动作。 */
function keyOf(command: string): string | undefined {
  return parseCommand(command).main?.key;
}

describe("parseCommand", () => {
  test("names package scripts and subcommands", () => {
    expect(parseCommand("pnpm test").main).toEqual({
      sig: "pnpm test",
      key: "pm run test",
      family: "test",
    });
    expect(parseCommand("pnpm run build:web").main).toEqual({
      sig: "pnpm run build:web",
      key: "pm run build:web",
      family: "build",
    });
    expect(parseCommand("git commit -m 'feat: x'").main).toEqual({
      sig: "git commit",
      key: "git commit",
      family: "vcs",
    });
    expect(parseCommand("gh pr create --fill").main).toEqual({
      sig: "gh pr create",
      key: "gh pr create",
      family: "vcs",
    });
  });

  test("strips environment assignments, wrappers, and runners", () => {
    expect(parseCommand("CI=1 timeout 60 npx vitest run src").main?.sig).toBe("vitest");
    expect(parseCommand("pnpm exec oxlint --type-aware").main).toEqual({
      sig: "oxlint",
      key: "oxlint",
      family: "check",
    });
    expect(parseCommand("uv run pytest -q").main).toEqual({
      sig: "pytest",
      key: "pytest",
      family: "test",
    });
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
    expect(parsed.main).toEqual({ sig: "pnpm build", key: "pm run build", family: "build" });
  });

  test("treats read-only commands as inspection", () => {
    expect(parseCommand("ls -la && git status --short").main?.family).toBe("inspect");
    expect(parseCommand("sed -n 1,40p README.md").main?.family).toBe("inspect");
    expect(parseCommand("sed -i 's/a/b/' x.txt").main?.family).toBe("run");
    expect(parseCommand("gh pr view 12").main?.family).toBe("inspect");
    expect(parseCommand("gh run watch 99").main?.family).toBe("inspect");
    expect(parseCommand("npm view react version").main?.family).toBe("inspect");
  });

  test("keeps the outer command when a quoted substitution nests quotes", () => {
    const parsed = parseCommand(`git tag "v$(node -p "require('./package.json').version")"`);
    expect(parsed.segments).toEqual([{ sig: "git tag", key: "git tag", family: "vcs" }]);
    expect(parseCommand("cd $(git rev-parse --show-toplevel) && pnpm test").main?.key).toBe(
      "pm run test",
    );
  });

  test("skips global options and their values before the subcommand", () => {
    expect(parseCommand("pnpm --filter @scope/pkg run bundle").main).toEqual({
      sig: "pnpm run bundle",
      key: "pm run bundle",
      family: "build",
    });
    expect(parseCommand("git -C ../repo status").main?.sig).toBe("git status");
    expect(parseCommand("docker -H tcp://host:2375 build .").main?.sig).toBe("docker build");
    expect(parseCommand("cargo --manifest-path a/Cargo.toml test").main).toEqual({
      sig: "cargo test",
      key: "cargo test",
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
    expect(parseCommand("cargo fmt --check").main?.family).toBe("check");
  });

  test("ignores here-document bodies", () => {
    const python = parseCommand(
      "python3 - <<'PYEOF'\nimport json\nopen('x.json')\nfor row in rows: print(row)\nPYEOF",
    );
    expect(python.segments).toEqual([{ sig: "python3", key: "python -c", family: "run" }]);
    const written = parseCommand("cat > notes.md <<EOF\ndone\nrm -rf /\nEOF\npnpm test");
    expect(written.segments.map((segment) => segment.key)).toEqual(["cat", "pm run test"]);
    const indented = parseCommand("bash <<-END\n\tgit push\n\tEND\ngit status");
    expect(indented.segments.map((segment) => segment.key)).toEqual(["bash -e", "git status"]);
    expect(parseCommand('grep x <<<"$text" && pnpm build').main?.key).toBe("pm run build");
  });

  test("treats only a here-document, a here-string, or a dash as code on standard input", () => {
    expect(keyOf("python3 -")).toBe("python -c");
    expect(keyOf("node - <<'JS'\nconsole.log(1)\nJS")).toBe("node -e");
    expect(keyOf("python3 <<< 'print(1)'")).toBe("python -c");
    expect(parseCommand("jq . <<< '{\"a\":1}'").segments).toEqual([
      { sig: "jq", key: "jq", family: "inspect" },
    ]);
    expect(
      parseCommand('mysql -e x <<< "SELECT secret FROM t"').segments.map((s) => s.key),
    ).toEqual(["mysql"]);
    expect(optionsOf("grep -q x <<< '--not-an-option'")).toEqual(["-q"]);
  });

  test("keeps an interpreter asked only for its version or help as the program itself", () => {
    const programs: [string, string][] = [
      ["node --version", "node"],
      ["node -v", "node"],
      ["python3 -V", "python3"],
      ["python3 --help", "python3"],
      ["bash --version", "bash"],
      ["ruby -v", "ruby"],
    ];
    for (const [command, key] of programs) {
      expect(keyOf(command)).toBe(key);
      expect(isOpaque(key)).toBe(false);
    }
  });

  test("skips here-document bodies whatever the delimiter is quoted with", () => {
    for (const start of ["<<\\EOF", "<<'EOF'", '<<"EOF"', "<< EOF"]) {
      const parsed = parseCommand(`cat ${start}\nrm -rf x\nEOF\npnpm test`);
      expect(parsed.segments.map((segment) => segment.key)).toEqual(["cat", "pm run test"]);
    }
    const quoted = parseCommand('echo "usage: cmd <<EOF"\npnpm test\npnpm build');
    expect(quoted.segments.map((segment) => segment.key)).toEqual([
      "echo",
      "pm run test",
      "pm run build",
    ]);
  });

  test("drops comments and keeps quotes inside them from changing the next lines", () => {
    const comment = parseCommand("# Check that we're on main\ngit checkout main\npnpm test");
    expect(comment.segments.map((segment) => segment.key)).toEqual(["git switch", "pm run test"]);
    const middle = parseCommand("pnpm install # don't skip\npnpm test\npnpm build");
    expect(middle.segments.map((segment) => segment.key)).toEqual([
      "pm install",
      "pm run test",
      "pm run build",
    ]);
    expect(keyOf('echo "#1" a#b && echo ${#arr} && pnpm build')).toBe("pm run build");
  });

  test("reads escaped quotes inside ANSI-C quoting", () => {
    const parsed = parseCommand("echo $'it\\'s'\npnpm test\npnpm build");
    expect(parsed.segments.map((segment) => segment.key)).toEqual([
      "echo",
      "pm run test",
      "pm run build",
    ]);
  });

  test("leaves case patterns and function names out of the commands", () => {
    const branch = parseCommand(
      'case "$1" in\n  start|dev) pnpm dev ;;\n  build) pnpm build ;;\n  *) echo usage ;;\nesac\npnpm test',
    );
    expect(branch.segments.map((segment) => segment.key)).toEqual([
      "pm run dev",
      "pm run build",
      "echo",
      "pm run test",
    ]);
    const inline = parseCommand("case $x in a) pnpm lint;; (b) pnpm check;; esac; git push");
    expect(inline.segments.map((segment) => segment.key)).toEqual([
      "pm run lint",
      "pm run check",
      "git push",
    ]);
    const defined = parseCommand("deploy() { pnpm build && wrangler deploy; }\ndeploy");
    expect(defined.segments.map((segment) => segment.key)).toEqual([
      "pm run build",
      "wrangler deploy",
      "deploy",
    ]);
  });

  test("splits multi-line scripts into commands but keeps quoted newlines", () => {
    const script = parseCommand(
      'pnpm install\npnpm build \\\n  --filter web\ngit commit -m "feat: x\n\nbody"\n# done\n',
    );
    expect(script.segments.map((segment) => segment.key)).toEqual([
      "pm install",
      "pm run build",
      "git commit",
    ]);
  });

  test("reads the commands inside loops and conditionals, not the keywords", () => {
    const loop = parseCommand('for f in src/*.ts; do pnpm vitest "$f"; done');
    expect(loop.segments.map((segment) => segment.key)).toEqual(["vitest"]);
    const wait = parseCommand("while ! curl -sf localhost:3000; do sleep 1; done; pnpm e2e");
    expect(wait.segments.map((segment) => segment.key)).toEqual(["curl", "sleep", "pm run e2e"]);
    const branch = parseCommand("if [ -f dist/index.js ]; then pnpm publish; else pnpm build; fi");
    expect(branch.segments.map((segment) => segment.key)).toEqual([
      "[",
      "pm publish",
      "pm run build",
    ]);
    const builtins = parseCommand("set -euo pipefail; export CI=1; : > log.txt; pnpm check");
    expect(builtins.segments.map((segment) => segment.key)).toEqual(["pm run check"]);
  });

  test("parses parameter and arithmetic expansions without failing", () => {
    const parsed = parseCommand('key="${pair%%:*}"; n=$((n+1)); git tag "v${version#v}"');
    expect(parsed.segments.map((segment) => segment.key)).toEqual(["git tag"]);
    expect(parseCommand("echo ${HOME:-${USER}} && pnpm build").main?.key).toBe("pm run build");
    expect(optionsOf('pnpm test --filter "${pkg%%/*}"')).toEqual(["--filter"]);
    // 存储里的命令按字数裁剪过，可能停在展开中间。
    expect(optionsOf('cd "${PWD:-~/src')).toEqual([]);
    expect(parseCommand('pnpm build --filter "${pkg').main?.key).toBe("pm run build");
    expect(
      parseCommand("printf '%s' \"${\"; curl -w '%{http_code}' x").segments.map((s) => s.key),
    ).toEqual(["printf", "curl"]);
    expect(parseCommand("echo $(( (1+2)*3 )) && pnpm build").segments.map((s) => s.key)).toEqual([
      "echo",
      "pm run build",
    ]);
  });

  test("expands the command inside bash -c", () => {
    expect(parseCommand(`bash -lc "cd web && pnpm build"`).main).toEqual({
      sig: "pnpm build",
      key: "pm run build",
      family: "build",
    });
  });
});

describe("action keys", () => {
  test.each([
    [
      "the same script through each package manager",
      ["pnpm build", "npm run build", "yarn build", "bun run build", "pnpm run build"],
    ],
    ["npm test shorthands", ["npm test", "npm t", "pnpm test", "yarn test", "npm run test"]],
    [
      "dependency installs",
      [
        "npm install",
        "npm i",
        "npm ci",
        "pnpm install",
        "pnpm i",
        "yarn",
        "yarn install",
        "bun install",
      ],
    ],
    [
      "adding a dependency",
      ["pnpm add zod", "npm install zod", "npm i -D zod", "yarn add zod", "bun add zod"],
    ],
    ["publishing", ["npm publish", "pnpm publish --no-git-checks", "yarn publish"]],
    [
      "a tool run through any runner",
      [
        "vitest run",
        "npx vitest run",
        "pnpm vitest",
        "pnpm exec vitest",
        "yarn vitest",
        "bunx vitest",
        "pnpm dlx vitest",
      ],
    ],
    [
      "pytest entry points",
      [
        "pytest -q",
        "python -m pytest",
        "python3 -m pytest tests",
        "uv run pytest",
        "poetry run pytest",
      ],
    ],
    [
      "pip entry points",
      [
        "pip install -r requirements.txt",
        "pip3 install x",
        "python -m pip install x",
        "uv pip install x",
      ],
    ],
    ["docker compose spellings", ["docker compose up -d", "docker-compose up"]],
    [
      "creating a branch",
      ["git checkout -b feat/x", "git switch -c fix/y", "git switch --create z"],
    ],
    ["cargo aliases", ["cargo b --release", "cargo build"]],
    [
      "a script run directly or through an interpreter",
      ["./scripts/release.sh patch", "bash scripts/release.sh", "sh ./scripts/release.sh minor"],
    ],
    [
      "a node script",
      ["node scripts/sync.mjs", "bun scripts/sync.mjs", "bun run scripts/sync.mjs"],
    ],
    [
      "a TypeScript script through any runner",
      [
        "tsx scripts/seed.ts",
        "npx tsx scripts/seed.ts",
        "pnpm tsx scripts/seed.ts",
        "ts-node scripts/seed.ts",
      ],
    ],
    [
      "a task through a task runner or a package manager",
      ["turbo run build", "turbo build", "lerna run build", "pnpm build"],
    ],
    ["inline Python under either name", ["python -c 'print(1)'", "python3 -c 'import sys'"]],
  ])("treats %s as one action", (_label, commands) => {
    const keys = new Set(commands.map(keyOf));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBeDefined();
  });

  test.each([
    ["building and testing", "pnpm build", "pnpm test"],
    ["two different scripts", "pnpm run build:web", "pnpm run build:docs"],
    ["installing and adding", "pnpm install", "pnpm add zod"],
    ["a script and a same-named built-in", "pnpm run publish", "pnpm publish"],
    ["two release scripts", "./scripts/release.sh", "./scripts/deploy.sh"],
    ["switching and creating a branch", "git checkout main", "git checkout -b main"],
    ["two git actions", "git push", "git pull"],
    ["two gh actions", "gh pr create", "gh pr merge"],
    ["different interpreters' inline code", "node -e 'console.log(1)'", "python -c 'print(1)'"],
    ["two test runners", "vitest", "jest"],
    ["a bare program and a package manager built-in", "deploy", "pnpm deploy"],
    ["two TypeScript scripts", "tsx scripts/seed.ts", "tsx scripts/seed-dev.ts"],
    ["two turbo tasks", "turbo run build", "turbo run lint"],
  ])("keeps %s apart", (_label, left, right) => {
    expect(keyOf(left)).not.toBe(keyOf(right));
  });

  test("marks inline code, HTTP requests, and remote logins as opaque", () => {
    const opaque = [
      "python3 -c 'print(1)'",
      "node -e 'console.log(1)'",
      "curl -fsS https://example.com/health",
      "wget https://example.com/x.tgz",
      "ssh host uptime",
    ];
    expect(opaque.map((command) => isOpaque(keyOf(command) ?? ""))).toEqual(opaque.map(() => true));
    const clear = ["pnpm build", "tsx scripts/seed.ts", "python -m pytest", "git push"];
    expect(clear.map((command) => isOpaque(keyOf(command) ?? ""))).toEqual(clear.map(() => false));
  });

  test("lists option names and environment assignments without option values", () => {
    expect(
      optionsOf(
        "NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter=web build --runInBand -x src",
      ),
    ).toEqual(["NODE_OPTIONS=--max-old-space-size=4096", "--filter", "--runInBand", "-x"]);
    expect(optionsOf("pnpm --filter=docs build")).toEqual(optionsOf("pnpm --filter=web build"));
  });

  test("gives package scripts a stem for partial matches", () => {
    expect(scriptStem("pm run build:web")).toBe("build");
    expect(scriptStem("pm run build")).toBe("build");
    expect(scriptStem("git push")).toBeNull();
  });
});
