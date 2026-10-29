/**
 * 规范化 Agent 执行过的 shell 命令：拆分管道与命令链，去掉环境变量赋值和包装命令，
 * 得到可跨会话比较的命令签名与命令族。分词交给 shell-quote。
 */
import { parse, type ParseEntry } from "shell-quote";
import type { CommandFamily } from "./model.ts";

/** 一条命令链里的一段命令。 */
export interface CommandSegment {
  /** 程序名加子命令，例如 `pnpm test`、`git commit`、`vitest`。 */
  readonly sig: string;
  readonly family: CommandFamily;
}

/** 解析结果：每段的签名与命令族，以及整条命令的主签名。 */
export interface ParsedCommand {
  readonly segments: readonly CommandSegment[];
  /** 最能代表这条命令的一段：优先非查看类，同类取最后一段。 */
  readonly main: CommandSegment | undefined;
}

/** 把下一个词当作子命令的程序。 */
const SUBCOMMAND_PROGRAMS = new Set([
  "apt",
  "apt-get",
  "brew",
  "bun",
  "cargo",
  "composer",
  "deno",
  "docker",
  "dotnet",
  "gem",
  "gh",
  "git",
  "go",
  "gradle",
  "helm",
  "kubectl",
  "make",
  "mvn",
  "npm",
  "pip",
  "pip3",
  "pnpm",
  "poetry",
  "swift",
  "terraform",
  "uv",
  "wrangler",
  "yarn",
]);

/** 只包一层、真正的程序在后面的命令。 */
const WRAPPERS = new Set(["sudo", "env", "time", "nice", "nohup", "command", "exec", "xargs"]);

/** 执行包里的工具：`npx vitest` 的签名是 `vitest`。 */
const RUNNERS = new Set(["npx", "pnpx", "bunx"]);

/** `pnpm exec`、`uv run` 这类子命令之后才是真正的程序。 */
const RUNNER_SUBCOMMANDS = new Set([
  "pnpm exec",
  "pnpm dlx",
  "npm exec",
  "yarn dlx",
  "yarn exec",
  "bun x",
  "uv run",
  "poetry run",
]);

/** 包管理器里跑 package.json 脚本的子命令。 */
const SCRIPT_RUNNERS = new Set(["npm run", "pnpm run", "yarn run", "bun run"]);

const INSPECT_PROGRAMS = new Set([
  "cat",
  "cd",
  "date",
  "df",
  "diff",
  "du",
  "echo",
  "env",
  "fd",
  "file",
  "find",
  "grep",
  "head",
  "jq",
  "less",
  "ls",
  "printenv",
  "printf",
  "pwd",
  "readlink",
  "realpath",
  "rg",
  "sleep",
  "sort",
  "stat",
  "tail",
  "test",
  "tree",
  "true",
  "uniq",
  "wc",
  "which",
  "[",
]);

const INSPECT_SUBCOMMANDS = new Set([
  "git status",
  "git log",
  "git diff",
  "git show",
  "git branch",
  "git remote",
  "git rev-parse",
  "git worktree",
  "git ls-files",
  "gh auth",
  "gh repo",
  "gh run",
  "gh pr view",
  "npm view",
  "npm ls",
  "pnpm ls",
  "pnpm list",
  "pnpm why",
  "npm config",
  "brew list",
  "docker ps",
  "docker images",
  "docker logs",
  "kubectl get",
  "kubectl describe",
  "pip show",
  "pip list",
]);

const TEST_PROGRAMS = new Set([
  "ava",
  "jest",
  "mocha",
  "phpunit",
  "playwright",
  "pytest",
  "rspec",
  "vitest",
]);

const CHECK_PROGRAMS = new Set([
  "biome",
  "eslint",
  "mypy",
  "oxfmt",
  "oxlint",
  "prettier",
  "pyright",
  "ruff",
  "shellcheck",
  "tsc",
  "vue-tsc",
]);

const BUILD_PROGRAMS = new Set(["rollup", "tsdown", "tsup", "vite", "webpack", "esbuild", "next"]);

const TEST_SUBCOMMANDS = new Set([
  "bun test",
  "cargo test",
  "deno test",
  "dotnet test",
  "go test",
  "gradle test",
  "make test",
  "mvn test",
  "npm test",
  "pnpm test",
  "swift test",
  "yarn test",
]);

const CHECK_SUBCOMMANDS = new Set([
  "cargo check",
  "cargo clippy",
  "cargo fmt",
  "deno check",
  "deno lint",
  "go vet",
  "make check",
  "make lint",
  "pnpm check",
  "pnpm lint",
  "pnpm typecheck",
  "npm run-script",
]);

const BUILD_SUBCOMMANDS = new Set([
  "cargo build",
  "docker build",
  "dotnet build",
  "go build",
  "gradle build",
  "make",
  "make build",
  "mvn package",
  "pnpm build",
  "pnpm bundle",
  "swift build",
  "yarn build",
]);

const INSTALL_SUBCOMMANDS = new Set([
  "apt install",
  "apt-get install",
  "brew install",
  "brew upgrade",
  "bun add",
  "bun install",
  "cargo add",
  "cargo install",
  "composer install",
  "gem install",
  "go get",
  "go mod",
  "npm ci",
  "npm i",
  "npm install",
  "pip install",
  "pip3 install",
  "pnpm add",
  "pnpm i",
  "pnpm install",
  "pnpm update",
  "poetry add",
  "poetry install",
  "uv add",
  "uv pip",
  "uv sync",
  "yarn add",
  "yarn install",
]);

const PUBLISH_SUBCOMMANDS = new Set([
  "cargo publish",
  "docker push",
  "gh release",
  "helm upgrade",
  "kubectl apply",
  "npm publish",
  "pnpm publish",
  "terraform apply",
  "wrangler deploy",
  "yarn publish",
]);

/** package.json 脚本名里表示测试、检查、构建的词。 */
const SCRIPT_FAMILY: readonly (readonly [RegExp, CommandFamily])[] = [
  [/^(test|e2e|spec)/u, "test"],
  [/^(check|lint|typecheck|type-check|format|fmt|verify)/u, "check"],
  [/^(build|bundle|compile|dist)/u, "build"],
  [/^(release|publish|deploy)/u, "publish"],
];

function scriptFamily(script: string): CommandFamily {
  for (const [pattern, family] of SCRIPT_FAMILY) if (pattern.test(script)) return family;
  return "run";
}

function familyOf(program: string, sig: string, words: readonly string[]): CommandFamily {
  if (TEST_SUBCOMMANDS.has(sig) || TEST_PROGRAMS.has(program)) return "test";
  if (CHECK_SUBCOMMANDS.has(sig) || CHECK_PROGRAMS.has(program)) {
    // `oxfmt`、`prettier --write` 这类格式化命令只有带 --check 时才算检查。
    if ((program === "oxfmt" || program === "prettier") && !words.includes("--check")) return "run";
    return "check";
  }
  if (BUILD_SUBCOMMANDS.has(sig)) return "build";
  if (BUILD_PROGRAMS.has(program))
    return program === "vite" && !words.includes("build") ? "run" : "build";
  if (INSTALL_SUBCOMMANDS.has(sig)) return "install";
  if (PUBLISH_SUBCOMMANDS.has(sig)) return "publish";
  if (INSPECT_SUBCOMMANDS.has(sig) || INSPECT_PROGRAMS.has(program)) return "inspect";
  if (program === "sed" && !words.some((word) => word.startsWith("-i"))) return "inspect";
  if (program === "git" || program === "gh") return "vcs";
  return "run";
}

function basename(word: string): string {
  const index = word.lastIndexOf("/");
  return index === -1 ? word : word.slice(index + 1);
}

/** 去掉前导环境变量赋值与包装命令，返回真正执行的程序及其参数。 */
function unwrap(words: readonly string[]): readonly string[] {
  let rest = words;
  for (;;) {
    const head = rest[0];
    if (head === undefined) return rest;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/u.test(head)) {
      rest = rest.slice(1);
      continue;
    }
    const program = basename(head);
    if (WRAPPERS.has(program)) {
      rest = rest.slice(1);
      while (rest[0]?.startsWith("-") === true) rest = rest.slice(1);
      continue;
    }
    if (program === "timeout") {
      rest = rest.slice(1);
      while (rest[0] !== undefined && (rest[0].startsWith("-") || /^\d/u.test(rest[0]))) {
        rest = rest.slice(1);
      }
      continue;
    }
    if (RUNNERS.has(program)) {
      rest = rest.slice(1);
      while (rest[0]?.startsWith("-") === true) rest = rest.slice(1);
      continue;
    }
    return rest;
  }
}

/** 出现在子命令之前、后面跟一个值的全局选项：值不是子命令。 */
const VALUE_OPTIONS = new Set([
  "-C",
  "-c",
  "-F",
  "-H",
  "-R",
  "-n",
  "-p",
  "-u",
  "-w",
  "--cluster",
  "--config",
  "--context",
  "--cwd",
  "--dir",
  "--directory",
  "--filter",
  "--git-dir",
  "--host",
  "--kube-context",
  "--kubeconfig",
  "--manifest-path",
  "--namespace",
  "--password",
  "--prefix",
  "--profile",
  "--project",
  "--region",
  "--repo",
  "--server",
  "--token",
  "--user",
  "--username",
  "--work-tree",
  "--workspace",
]);

/** 子命令与脚本名的形态；不符合的词（URL、凭据、路径）不进签名。 */
const SUBCOMMAND = /^[a-z][a-z0-9-]{0,31}$/u;
const SCRIPT_NAME = /^[A-Za-z0-9][\w:.-]{0,47}$/u;

/**
 * 第一个操作数：跳过选项与全局选项的值。
 * @param words - 程序名之后的词。
 * @param shape - 操作数必须符合的形态；不符合时返回 undefined，签名只用程序名。
 * @returns 操作数与它之后的词。
 */
function firstOperand(
  words: readonly string[],
  shape: RegExp,
): { readonly word: string; readonly rest: readonly string[] } | undefined {
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? "";
    if (word.startsWith("-")) {
      if (VALUE_OPTIONS.has(word)) index += 1;
      continue;
    }
    return shape.test(word) ? { word, rest: words.slice(index + 1) } : undefined;
  }
  return undefined;
}

function segmentOf(raw: readonly string[]): CommandSegment | undefined {
  let words = unwrap(raw);
  const head = words[0];
  if (head === undefined) return undefined;
  let program = basename(head);
  if (program === "python" || program === "python3") {
    const index = words.indexOf("-m");
    const module = index === -1 ? undefined : words[index + 1];
    if (module !== undefined) {
      words = words.slice(index + 1);
      program = module;
    }
  }
  let sig = program;
  let rest: readonly string[] = words.slice(1);
  if (SUBCOMMAND_PROGRAMS.has(program)) {
    const sub = firstOperand(rest, SUBCOMMAND);
    if (sub !== undefined) {
      sig = `${program} ${sub.word}`;
      rest = sub.rest;
    }
  }
  if (RUNNER_SUBCOMMANDS.has(sig)) {
    const inner = segmentOf(rest);
    if (inner !== undefined) return inner;
  }
  if (SCRIPT_RUNNERS.has(sig)) {
    const script = firstOperand(rest, SCRIPT_NAME);
    if (script !== undefined) {
      return { sig: `${program} run ${script.word}`, family: scriptFamily(script.word) };
    }
  }
  if (program === "gh" && sig !== program) {
    const action = firstOperand(rest, SUBCOMMAND);
    if (action !== undefined) sig = `${sig} ${action.word}`;
  }
  return { sig, family: familyOf(program, sig, words) };
}

/** 变量保持字面形式。 */
function env(key: string): string {
  return `$${key}`;
}

/** 重定向运算符不分隔命令。 */
const REDIRECTS = new Set([">", ">>", "<", ">&"]);

/** 分词结果里属于当前命令的词：普通词与通配符。 */
function wordOf(entry: ParseEntry): string | null {
  if (typeof entry === "string") return entry;
  return "op" in entry && entry.op === "glob" ? entry.pattern : null;
}

/** 分词结果是否结束当前命令段：命令分隔符与注释结束，重定向不结束。 */
function ends(entry: ParseEntry): boolean {
  if (typeof entry === "string") return false;
  return "comment" in entry || !REDIRECTS.has(entry.op);
}

/**
 * 解析一条 shell 命令。变量保持字面形式，不做展开。
 * @param command - Agent 交给 shell 工具的完整命令文本。
 * @returns 各段签名与主签名。
 */
export function parseCommand(command: string): ParsedCommand {
  let entries = parse(command, env);
  // shell-quote 不认识双引号里的命令替换：替换里的引号会提前结束外层引号，之后的词全部错位，
  // 这时会出现含 `$(` 的词。改用替换之前的部分，外层命令的程序与子命令都在这一段里。
  if (entries.some((entry) => typeof entry === "string" && entry.includes("$("))) {
    entries = parse(command.slice(0, command.indexOf("$(")), env);
  }
  const segments: CommandSegment[] = [];
  let words: string[] = [];
  for (const entry of entries) {
    const word = wordOf(entry);
    if (word !== null) words.push(word);
    else if (ends(entry)) {
      const segment = segmentOf(words);
      if (segment !== undefined) segments.push(segment);
      words = [];
    }
  }
  const last = segmentOf(words);
  if (last !== undefined) segments.push(last);
  const meaningful = segments.filter((segment) => segment.family !== "inspect");
  return { segments, main: (meaningful.length > 0 ? meaningful : segments).at(-1) };
}

/** 测试、检查与构建：成功时可以作为任务完成的验证证据。 */
export function isVerification(family: CommandFamily): boolean {
  return family === "test" || family === "check" || family === "build";
}
