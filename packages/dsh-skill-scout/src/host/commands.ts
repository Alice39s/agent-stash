/**
 * 规范化 Agent 执行过的 shell 命令：拆分管道与命令链，去掉环境变量赋值和包装命令，
 * 得到每段命令的签名、动作与命令族。分词交给 shell-quote。
 *
 * 签名（sig）保留命令原来的写法，用于展示；动作（key）把等价的写法归成同一个，用于跨会话比较：
 * - npm、pnpm、yarn、bun 的同一操作：`pnpm build` 与 `npm run build`，`npm i` 与 `pnpm install`；
 * - 包管理器代为执行的工具：`pnpm vitest`、`npx vitest`、`pnpm exec vitest` 都是 `vitest`；
 * - pip 的几种入口、cargo 的单字母别名、`docker-compose` 与 `docker compose`、
 *   `git checkout -b` 与 `git switch -c`；
 * - 解释器运行脚本与直接运行同一脚本：`bash scripts/release.sh` 与 `./scripts/release.sh`。
 * 参数、路径、分支名与版本号不进签名与动作。
 *
 * here-document 的正文与 here-string 的词是交给程序的数据，不是命令；注释在分词前去掉。
 * 循环、条件、case 的模式与函数定义的名字这类 shell 语法不是程序，`set`、`export` 这类内建命令
 * 也不成为动作；`${…}` 与 `$((…))` 换成占位变量后再分词。
 */
import { parse, type ParseEntry } from "shell-quote";
import type { CommandFamily } from "./model.ts";

/** 一条命令链里的一段命令。 */
export interface CommandSegment {
  /** 程序名加子命令，保留原来的写法，例如 `pnpm test`、`git commit`、`vitest`。 */
  readonly sig: string;
  /** 规范动作：等价写法的命令得到同一个 key，例如 `pm run test`。 */
  readonly key: string;
  readonly family: CommandFamily;
}

/** 解析结果：每段的签名、动作与命令族，以及整条命令的主段。 */
export interface ParsedCommand {
  readonly segments: readonly CommandSegment[];
  /** 最能代表这条命令的一段：优先非查看类，同类取最后一段。 */
  readonly main: CommandSegment | undefined;
}

/** 把下一个词当作子命令的程序（包管理器另行处理）。 */
const SUBCOMMAND_PROGRAMS = new Set([
  "apt",
  "apt-get",
  "brew",
  "cargo",
  "changeset",
  "composer",
  "deno",
  "docker",
  "dotnet",
  "drizzle-kit",
  "fly",
  "flyctl",
  "gem",
  "gh",
  "git",
  "go",
  "gradle",
  "helm",
  "just",
  "kubectl",
  "make",
  "mvn",
  "pip",
  "poetry",
  "prisma",
  "pulumi",
  "supabase",
  "swift",
  "terraform",
  "uv",
  "vercel",
  "wrangler",
]);

/** 子命令之后还有一层动作的命令：`gh pr create`、`docker compose up`。 */
const NESTED_SUBCOMMANDS = new Set(["docker compose", "docker buildx", "uv tool"]);

/** 只包一层、真正的程序在后面的命令。 */
const WRAPPERS = new Set(["sudo", "env", "time", "nice", "nohup", "command", "exec", "xargs"]);

/** 执行包里的工具：`npx vitest` 的签名是 `vitest`。 */
const RUNNERS = new Set(["npx", "pnpx", "bunx", "uvx"]);

/** `uv run`、`poetry run` 这类子命令之后才是真正的程序。 */
const RUNNER_SUBCOMMANDS = new Set(["uv run", "poetry run", "pipenv run", "uv tool run"]);

const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);

/** 包管理器子命令的别名。 */
const PM_ALIASES: Readonly<Record<string, string>> = {
  i: "install",
  in: "install",
  ci: "install",
  rm: "remove",
  un: "remove",
  uninstall: "remove",
  up: "update",
  upgrade: "update",
  t: "test",
  ls: "list",
  info: "view",
  show: "view",
  "run-script": "run",
  x: "exec",
  dlx: "exec",
};

/** 包管理器自带的命令与它们的命令族；其余的词是 package.json 脚本或代为执行的工具。 */
const PM_BUILTINS: Readonly<Record<string, CommandFamily>> = {
  install: "install",
  add: "install",
  remove: "install",
  update: "install",
  dedupe: "install",
  prune: "install",
  rebuild: "install",
  link: "install",
  unlink: "install",
  import: "install",
  fetch: "install",
  publish: "publish",
  audit: "check",
  list: "inspect",
  view: "inspect",
  why: "inspect",
  outdated: "inspect",
  config: "inspect",
  root: "inspect",
  bin: "inspect",
  whoami: "inspect",
  help: "inspect",
  search: "inspect",
  env: "inspect",
  store: "inspect",
  cache: "inspect",
  doctor: "inspect",
  version: "run",
  pack: "run",
  init: "run",
  create: "run",
  login: "run",
  logout: "run",
  patch: "run",
  deploy: "run",
  setup: "run",
  workspaces: "run",
  licenses: "run",
  owner: "run",
};

/** npm 不加 run 也能运行的脚本。 */
const NPM_SCRIPT_SHORTHAND = new Set(["test", "start", "stop", "restart"]);

/** bun 自带、不是脚本的命令。 */
const BUN_BUILTINS: Readonly<Record<string, CommandFamily>> = { test: "test", build: "build" };

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
  "[[",
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
  "git describe",
  "git blame",
  "git reflog",
  "brew list",
  "docker ps",
  "docker images",
  "docker logs",
  "docker compose ps",
  "docker compose logs",
  "kubectl get",
  "kubectl describe",
  "kubectl logs",
  "pip show",
  "pip list",
  "pip freeze",
]);

/** gh 只读取不改动的动作。 */
const GH_INSPECT_ACTIONS = new Set(["checks", "diff", "list", "status", "view", "watch"]);

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

/** 包管理器可以代为执行、不当作脚本名的工具。 */
const PM_TOOLS = new Set([
  ...TEST_PROGRAMS,
  ...CHECK_PROGRAMS,
  ...BUILD_PROGRAMS,
  "changeset",
  "drizzle-kit",
  "lerna",
  "nx",
  "prisma",
  "ts-node",
  "tsx",
  "turbo",
  "vercel",
  "vite-node",
  "wrangler",
]);

const TEST_SUBCOMMANDS = new Set([
  "cargo nextest",
  "cargo test",
  "deno test",
  "dotnet test",
  "go test",
  "gradle test",
  "make test",
  "mvn test",
  "swift test",
]);

const CHECK_SUBCOMMANDS = new Set([
  "cargo check",
  "cargo clippy",
  "deno check",
  "deno lint",
  "go vet",
  "make check",
  "make lint",
]);

const BUILD_SUBCOMMANDS = new Set([
  "cargo build",
  "docker build",
  "docker buildx build",
  "dotnet build",
  "go build",
  "gradle build",
  "make",
  "make build",
  "mvn package",
  "swift build",
]);

const INSTALL_SUBCOMMANDS = new Set([
  "apt install",
  "apt-get install",
  "brew install",
  "brew upgrade",
  "cargo add",
  "cargo install",
  "composer install",
  "gem install",
  "go get",
  "go mod",
  "pip install",
  "poetry add",
  "poetry install",
  "uv add",
  "uv sync",
]);

const PUBLISH_SUBCOMMANDS = new Set([
  "cargo publish",
  "changeset publish",
  "docker push",
  "fly deploy",
  "flyctl deploy",
  "gh release create",
  "gh release upload",
  "helm upgrade",
  "kubectl apply",
  "pulumi up",
  "terraform apply",
  "vercel",
  "vercel deploy",
  "wrangler deploy",
]);

/** cargo 的单字母别名。 */
const CARGO_ALIASES: Readonly<Record<string, string>> = {
  b: "build",
  c: "check",
  d: "doc",
  r: "run",
  t: "test",
};

/** 运行脚本文件的解释器；TypeScript 运行器也按解释器处理，动作看脚本文件名。 */
const INTERPRETERS = new Set([
  "bash",
  "node",
  "perl",
  "python",
  "python3",
  "ruby",
  "sh",
  "zsh",
  "tsx",
  "ts-node",
  "vite-node",
]);

/** 解释器的这些选项后面跟的是内联代码，不是脚本文件。 */
const INLINE_CODE = new Set(["-c", "-e", "--eval", "-p", "--print"]);

/** 出现在命令段开头、之后才是真正命令的 shell 关键字：`if cond`、`do cmd`、`! cmd`。 */
const LEADING_KEYWORDS = new Set(["if", "then", "else", "elif", "do", "while", "until", "!", "{"]);

/** 整段都不是程序调用的开头：循环与分支的头部、结束关键字，以及只改变 shell 状态的内建命令。 */
const NON_COMMANDS = new Set([
  "for",
  "select",
  "case",
  "esac",
  "fi",
  "done",
  "}",
  ";;",
  "function",
  ":",
  "set",
  "export",
  "local",
  "declare",
  "typeset",
  "readonly",
  "unset",
  "shift",
  "return",
  "exit",
  "break",
  "continue",
  "trap",
  "wait",
  "read",
  "eval",
  "alias",
  "source",
  ".",
]);

/** 内联代码的动作名：同一种解释器的内联代码是一个动作，`python3 -c` 与 `python -c` 相同。 */
function inlineKey(program: string): string {
  const name = program === "python3" ? "python" : program;
  return `${name} ${name === "python" ? "-c" : "-e"}`;
}

/**
 * 动作本身说明不了做了什么的命令：内联代码、HTTP 请求、远程登录与打开文件。
 * 它们出现在流程里不能说明两个任务做的是同一件事，换一种写法也不算修复。
 */
const OPAQUE_PROGRAMS = new Set(["curl", "wget", "http", "https", "xh", "ssh", "scp", "open"]);

/** 动作是否说明不了做了什么，见 `OPAQUE_PROGRAMS`。 */
export function isOpaque(key: string): boolean {
  return OPAQUE_PROGRAMS.has(key.split(" ")[0] ?? key) || / -[ce]$/u.test(key);
}

/** 任务运行器的任务名按 package.json 脚本处理：`turbo run build`、`turbo build`、`lerna run build`。 */
const TASK_RUNNERS = new Set(["turbo", "lerna"]);

/** 脚本文件的扩展名。 */
const SCRIPT_FILE = /\.(?:[cm]?[jt]sx?|sh|bash|zsh|py|rb|pl)$/u;

/** 名称带子命令的脚本：`python manage.py migrate`。 */
const SCRIPTS_WITH_SUBCOMMANDS = new Set(["manage.py"]);

/** package.json 脚本名里表示测试、检查、构建、发布的词。 */
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
    if (WRAPPERS.has(program) || RUNNERS.has(program)) {
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
    return rest;
  }
}

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

/** 选项之外的词。 */
function operands(words: readonly string[]): string[] {
  const result: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? "";
    if (word.startsWith("-")) {
      if (VALUE_OPTIONS.has(word)) index += 1;
      continue;
    }
    result.push(word);
  }
  return result;
}

/** 运行 package.json 脚本的一段；动作不区分包管理器与是否写了 `run`。 */
function scriptSegment(sig: string, script: string): CommandSegment {
  return { sig, key: `pm run ${script}`, family: scriptFamily(script) };
}

/**
 * npm、pnpm、yarn、bun 的一段命令。
 * @param pm - 包管理器。
 * @param words - 包管理器之后的词。
 * @param stdin - 这段命令的标准输入来自 here-document 或 here-string。
 */
function packageSegment(
  pm: string,
  words: readonly string[],
  stdin: boolean,
): CommandSegment | undefined {
  // bun 直接运行脚本文件：`bun scripts/x.ts`、`bun run scripts/x.ts`。
  if (pm === "bun") {
    const direct = firstOperand(words, /\S/u);
    const file = direct?.word === "run" ? firstOperand(direct.rest, /\S/u) : direct;
    if (file !== undefined && SCRIPT_FILE.test(file.word))
      return segmentOf([file.word, ...file.rest], stdin);
  }
  const first = firstOperand(words, SCRIPT_NAME);
  if (first === undefined) {
    // 只有选项的 `yarn` 等于 `yarn install`。
    return pm === "yarn" && operands(words).length === 0
      ? { sig: "yarn", key: "pm install", family: "install" }
      : { sig: pm, key: "pm", family: "run" };
  }
  const word = PM_ALIASES[first.word] ?? first.word;
  if (pm === "bun") {
    const builtin = BUN_BUILTINS[word];
    if (builtin !== undefined) return { sig: `bun ${word}`, key: `bun ${word}`, family: builtin };
  }
  if (word === "exec") return segmentOf(first.rest, stdin);
  if (word === "run") {
    const script = firstOperand(first.rest, SCRIPT_NAME);
    if (script === undefined) return { sig: `${pm} run`, key: "pm run", family: "inspect" };
    return scriptSegment(`${pm} run ${script.word}`, script.word);
  }
  if (pm === "yarn" && word === "workspace") {
    const target = firstOperand(first.rest, /^\S+$/u);
    if (target !== undefined) return packageSegment(pm, target.rest, stdin);
  }
  if (word === "install" && operands(first.rest).length > 0) {
    return { sig: `${pm} ${first.word}`, key: "pm add", family: "install" };
  }
  const builtin = PM_BUILTINS[word];
  if (builtin !== undefined) {
    return { sig: `${pm} ${first.word}`, key: `pm ${word}`, family: builtin };
  }
  if (PM_TOOLS.has(word)) return segmentOf([word, ...first.rest], stdin);
  if (pm === "npm" && !NPM_SCRIPT_SHORTHAND.has(word)) {
    return { sig: `npm ${first.word}`, key: `pm ${word}`, family: "run" };
  }
  return scriptSegment(`${pm} ${first.word}`, word);
}

/** 解释器运行的脚本文件；内联代码或没有脚本时返回 undefined。 */
function scriptOf(
  words: readonly string[],
): { readonly file: string; readonly rest: readonly string[] } | undefined {
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? "";
    if (INLINE_CODE.has(word)) return undefined;
    if (word.startsWith("-")) continue;
    return SCRIPT_FILE.test(word) || word.includes("/")
      ? { file: word, rest: words.slice(index + 1) }
      : undefined;
  }
  return undefined;
}

/** 脚本文件的一段：动作只看文件名，与直接运行这个文件相同。 */
function scriptFileSegment(sig: string, file: string, rest: readonly string[]): CommandSegment {
  let key = basename(file);
  if (SCRIPTS_WITH_SUBCOMMANDS.has(key)) {
    const sub = firstOperand(rest, SUBCOMMAND);
    if (sub !== undefined) key = `${key} ${sub.word}`;
  }
  // 脚本名只能可靠地看出发布类脚本；测试与检查要由真正的测试或检查工具证明。
  const family = scriptFamily(basename(file)) === "publish" ? "publish" : "run";
  return { sig: sig === basename(file) ? key : `${sig} ${key}`, key, family };
}

/** git 的等价写法：新建分支与切换分支各归成一个动作。 */
function gitKey(sig: string, words: readonly string[]): string {
  if (sig === "git checkout") {
    if (words.some((word) => word === "-b" || word === "-B")) return "git switch -c";
    return words.includes("--") ? "git restore" : "git switch";
  }
  if (sig === "git switch") {
    return words.some((word) => word === "-c" || word === "-C" || word === "--create")
      ? "git switch -c"
      : "git switch";
  }
  return sig;
}

function familyOf(program: string, key: string, words: readonly string[]): CommandFamily {
  if (program === "gh") {
    if (PUBLISH_SUBCOMMANDS.has(key)) return "publish";
    const action = key.split(" ").at(-1) ?? "";
    if (key === "gh auth" || GH_INSPECT_ACTIONS.has(action)) return "inspect";
    return key === "gh workflow run" ? "run" : "vcs";
  }
  if (TEST_SUBCOMMANDS.has(key) || TEST_PROGRAMS.has(program)) return "test";
  if (CHECK_SUBCOMMANDS.has(key) || CHECK_PROGRAMS.has(program)) {
    // `oxfmt`、`prettier --write` 这类格式化命令只有带 --check 时才算检查。
    if ((program === "oxfmt" || program === "prettier") && !words.includes("--check")) return "run";
    return "check";
  }
  if (key === "cargo fmt") return words.includes("--check") ? "check" : "run";
  if (BUILD_SUBCOMMANDS.has(key)) return "build";
  if (BUILD_PROGRAMS.has(program))
    return program === "vite" && !words.includes("build") ? "run" : "build";
  if (INSTALL_SUBCOMMANDS.has(key)) return "install";
  if (PUBLISH_SUBCOMMANDS.has(key)) return "publish";
  if (INSPECT_SUBCOMMANDS.has(key) || INSPECT_PROGRAMS.has(program)) return "inspect";
  if (program === "sed" && !words.some((word) => word.startsWith("-i"))) return "inspect";
  if (program === "git") return "vcs";
  return "run";
}

/** 去掉段首的 shell 关键字；整段不是程序调用时返回空数组。 */
function commandWords(raw: readonly string[]): readonly string[] {
  let words = raw;
  while (words[0] !== undefined && LEADING_KEYWORDS.has(words[0])) words = words.slice(1);
  return words[0] !== undefined && NON_COMMANDS.has(words[0]) ? [] : words;
}

/**
 * 一段命令的签名、动作与命令族。
 * @param raw - 这段命令的词。
 * @param stdin - 标准输入来自 here-document 或 here-string：解释器据此知道代码来自标准输入。
 */
function segmentOf(raw: readonly string[], stdin = false): CommandSegment | undefined {
  let words = unwrap(commandWords(raw));
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
  if (program === "pip3") program = "pip";
  if (program === "docker-compose") {
    words = ["docker", "compose", ...words.slice(1)];
    program = "docker";
  }
  if (PACKAGE_MANAGERS.has(program)) return packageSegment(program, words.slice(1), stdin);
  if (INTERPRETERS.has(program)) {
    const args = words.slice(1);
    const script = scriptOf(args);
    if (script !== undefined) return scriptFileSegment(program, script.file, script.rest);
    // 内联代码，或者从 here-document、here-string、显式的 `-` 读代码：`python3 - <<EOF`、`bash <<EOF`。
    // 只带 `--version`、`--help` 这类选项时是程序本身。
    if (stdin || args.some((word) => INLINE_CODE.has(word) || word === "-")) {
      return { sig: program, key: inlineKey(program), family: "run" };
    }
  }
  if (SCRIPT_FILE.test(program)) return scriptFileSegment(program, program, words.slice(1));
  if (TASK_RUNNERS.has(program)) {
    const first = firstOperand(words.slice(1), SCRIPT_NAME);
    const task = first?.word === "run" ? firstOperand(first.rest, SCRIPT_NAME) : first;
    if (task !== undefined) return scriptSegment(`${program} ${task.word}`, task.word);
  }
  let sig = program;
  let rest: readonly string[] = words.slice(1);
  if (SUBCOMMAND_PROGRAMS.has(program)) {
    const sub = firstOperand(rest, SUBCOMMAND);
    if (sub !== undefined) {
      const word = program === "cargo" ? (CARGO_ALIASES[sub.word] ?? sub.word) : sub.word;
      sig = `${program} ${word}`;
      rest = sub.rest;
    }
  }
  if (sig === "uv pip") return segmentOf(["pip", ...rest]);
  if (RUNNER_SUBCOMMANDS.has(sig)) {
    const inner = segmentOf(rest, stdin);
    if (inner !== undefined) return inner;
  }
  if (sig === "deno run") {
    const script = scriptOf(rest);
    if (script !== undefined) return scriptFileSegment("deno run", script.file, script.rest);
  }
  if ((program === "gh" && sig !== program) || NESTED_SUBCOMMANDS.has(sig)) {
    const action = firstOperand(rest, SUBCOMMAND);
    if (action !== undefined) {
      sig = `${sig} ${action.word}`;
      rest = action.rest;
      if (sig === "uv tool run") return segmentOf(rest, stdin);
    }
  }
  const key = program === "git" ? gitKey(sig, words) : sig;
  return { sig, key, family: familyOf(program, key, words) };
}

/** 变量保持字面形式。 */
function env(key: string): string {
  return `$${key}`;
}

/** here-document 的起始运算符：`<<DELIM`、`<<-DELIM`、`<<'DELIM'`、`<<"DELIM"`、`<<\DELIM`。 */
const HEREDOC = /^<<(-?)[ \t]*(?:\\([A-Za-z_][\w-]*)|(['"])([A-Za-z_][\w-]*)\3|([A-Za-z_][\w-]*))/u;

/**
 * here-document 在逻辑行里换成这段 here-string：两者都把数据交给程序的标准输入。
 * 分段时 here-string 之后的一个词按数据跳过，程序据此知道标准输入来自命令里的数据。
 */
const HEREDOC_STAND_IN = " <<< _";

/** 注释的 `#` 要在一个词的开头：行首、空白或运算符之后。 */
const WORD_BOUNDARY = /[\s;&|()]/u;

/**
 * 按 shell 的规则把命令文本分成逻辑行：
 * - 引号外的换行结束一条命令，行尾的反斜杠续行；引号里的换行属于参数（多行的提交信息）；
 * - 单引号里没有转义，双引号与 `$'…'` 里反斜杠转义下一个字符；
 * - 引号外一个词开头的 `#` 到行尾是注释，去掉；词中间的 `#` 是字面字符；
 * - 引号外的 here-document 运算符换成 `HEREDOC_STAND_IN`，正文从下一行起到只有分隔符的一行为止，去掉；
 *   正文没有结束行时去到命令末尾。
 */
function logicalLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let quote: "'" | '"' | "$'" | null = null;
  let pending: { readonly delimiter: string; readonly tabs: boolean }[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index] ?? "";
    const next = text[index + 1];
    if (quote === "'") {
      current += char;
      if (char === "'") quote = null;
      index += 1;
      continue;
    }
    if (char === "\\") {
      // 引号外与双引号里的反斜杠加换行是续行，其余的反斜杠连同下一个字符原样保留。
      if (next !== "\n" || quote === "$'") current += char + (next ?? "");
      index += 2;
      continue;
    }
    if (quote !== null) {
      current += char;
      if ((quote === '"' && char === '"') || (quote === "$'" && char === "'")) quote = null;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      index += 1;
      continue;
    }
    if (char === "$" && next === "'") {
      quote = "$'";
      current += "$'";
      index += 2;
      continue;
    }
    if (char === "#") {
      if (current === "" || WORD_BOUNDARY.test(current.at(-1) ?? "")) {
        const end = text.indexOf("\n", index);
        index = end === -1 ? text.length : end;
      } else {
        // 词中间的 `#` 是字面字符（`a#b`、URL 的片段）；shell-quote 会把它当成注释开头，转义后再交给它。
        current += "\\#";
        index += 1;
      }
      continue;
    }
    const heredoc =
      char === "<" && text[index - 1] !== "<" ? HEREDOC.exec(text.slice(index, index + 80)) : null;
    if (heredoc !== null) {
      pending.push({
        delimiter: heredoc[2] ?? heredoc[4] ?? heredoc[5] ?? "",
        tabs: heredoc[1] === "-",
      });
      current += HEREDOC_STAND_IN;
      index += heredoc[0].length;
      continue;
    }
    index += 1;
    if (char !== "\n") {
      current += char;
      continue;
    }
    lines.push(current);
    current = "";
    // 起始行之后依次是各个 here-document 的正文。
    for (const doc of pending) {
      while (index < text.length) {
        const end = text.indexOf("\n", index);
        const line = text.slice(index, end === -1 ? text.length : end);
        index = end === -1 ? text.length : end + 1;
        if ((doc.tabs ? line.replace(/^\t+/u, "") : line) === doc.delimiter) break;
      }
    }
    pending = [];
  }
  lines.push(current);
  return lines.filter((line) => line.trim() !== "");
}

/** 跨行保留的 case 结构：所在的 case 层数，以及接下来的词是不是一个分支的模式。 */
interface CaseState {
  depth: number;
  pattern: boolean;
}

/** 分词结果里的运算符；词与注释为 null。 */
function opOf(entry: ParseEntry | undefined): string | null {
  return entry !== undefined && typeof entry !== "string" && "op" in entry && entry.op !== "glob"
    ? entry.op
    : null;
}

/**
 * 一行命令的各段。
 * @param state - case 结构的状态，同一条命令的各行共用：模式标签 `a)` 不成为命令段。
 */
function lineSegments(line: string, state: CaseState): CommandSegment[] {
  let entries = parse(line, env);
  // shell-quote 不认识双引号里的命令替换：替换里的引号会提前结束外层引号，之后的词全部错位，
  // 这时会出现含 `$(` 的词。改用替换之前的部分，外层命令的程序与子命令都在这一段里。
  if (entries.some((entry) => typeof entry === "string" && entry.includes("$("))) {
    entries = parse(line.slice(0, line.indexOf("$(")), env);
  }
  const segments: CommandSegment[] = [];
  let words: string[] = [];
  let stdin = false;
  let data = false;
  const flush = (): void => {
    if (words[0] === "esac") {
      state.depth = Math.max(0, state.depth - 1);
      state.pattern = false;
    }
    segments.push(...segmentsOf(words, stdin));
    words = [];
    stdin = false;
  };
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const word = entry === undefined ? null : wordOf(entry);
    if (word !== null) {
      // here-string 之后的一个词是交给程序的数据。
      if (data) {
        data = false;
      } else if (word === "in" && words.length === 2 && words[0] === "case") {
        // `case <词> in` 之后是第一个分支的模式。
        state.depth += 1;
        state.pattern = true;
        words = [];
      } else {
        words.push(word);
      }
      continue;
    }
    const op = opOf(entry);
    if (op !== null && REDIRECTS.has(op)) {
      if (op === "<<<") {
        stdin = true;
        data = true;
      }
      continue;
    }
    // 模式里的 `|` 分隔几个模式，`(` 是可选的开头，`)` 结束模式。
    if (state.pattern && (op === "|" || op === "(")) continue;
    if (state.pattern && op === ")") {
      words = [];
      state.pattern = false;
      continue;
    }
    // `name() { … }` 定义函数，name 不是命令。
    if (op === "(" && words.length === 1 && opOf(entries[index + 1]) === ")") {
      words = [];
      index += 1;
      continue;
    }
    flush();
    if (op === ";;" && state.depth > 0) state.pattern = true;
  }
  flush();
  return segments;
}

/** 把 `$((…))` 换成占位变量；里面可以有成对的括号，没有闭合时原样保留。 */
function maskArithmetic(command: string): string {
  let result = "";
  let from = 0;
  for (;;) {
    const start = command.indexOf("$((", from);
    if (start === -1) return result + command.slice(from);
    let depth = 0;
    let end: number | null = null;
    for (let at = start + 3; at < command.length && end === null; at += 1) {
      const char = command[at];
      if (char === "(") depth += 1;
      else if (char === ")" && depth > 0) depth -= 1;
      else if (char === ")") end = command[at + 1] === ")" ? at + 2 : -1;
    }
    if (end === null || end === -1) return result + command.slice(from);
    result += `${command.slice(from, start)}$N`;
    from = end;
  }
}

/**
 * 把参数展开与算术展开换成占位变量：shell-quote 不认识 `${name%%pattern}` 这类写法会抛错，
 * `$((n+1))` 会被拆成词。嵌套的参数展开从里往外替换。剩下没有配对右括号的 `${`（存储里的命令
 * 按字数裁剪过，可能裁在展开中间；命令本身也可能写错）同样换成占位变量。
 */
function maskExpansions(command: string): string {
  let result = maskArithmetic(command);
  for (;;) {
    const next = result.replace(/\$\{[^{}]*\}/gu, "$V");
    if (next === result) return result.replaceAll("${", "$V");
    result = next;
  }
}

/** 重定向运算符不分隔命令；`<<<` 之后的一个词是数据。 */
const REDIRECTS = new Set([">", ">>", "<", ">&", "<&", "&>", "<<", "<<<"]);

/** 分词结果里属于当前命令的词：普通词与通配符。 */
function wordOf(entry: ParseEntry): string | null {
  if (typeof entry === "string") return entry;
  return "op" in entry && entry.op === "glob" ? entry.pattern : null;
}

const SHELLS = new Set(["bash", "sh", "zsh"]);

/** `bash -lc "<命令>"` 里交给 shell 的命令文本；不是这种形式时返回 undefined。 */
function inlineShell(words: readonly string[]): string | undefined {
  const [head, ...rest] = unwrap(words);
  if (head === undefined || !SHELLS.has(basename(head))) return undefined;
  const flag = rest.findIndex((word) => /^-[a-z]*c[a-z]*$/u.test(word));
  return flag === -1 ? undefined : rest[flag + 1];
}

/** 一段命令的词转换成命令段；`bash -c` 展开成里面的命令。 */
function segmentsOf(words: readonly string[], stdin: boolean): CommandSegment[] {
  const inline = inlineShell(words);
  if (inline !== undefined) return [...parseCommand(inline).segments];
  const segment = segmentOf(words, stdin);
  return segment === undefined ? [] : [segment];
}

/**
 * 解析一条 shell 命令。变量保持字面形式，不做展开。
 * @param command - Agent 交给 shell 工具的完整命令文本。
 * @returns 各段签名、动作与主段。
 */
export function parseCommand(command: string): ParsedCommand {
  const state: CaseState = { depth: 0, pattern: false };
  const segments = logicalLines(command).flatMap((line) =>
    lineSegments(maskExpansions(line), state),
  );
  const meaningful = segments.filter((segment) => segment.family !== "inspect");
  return { segments, main: (meaningful.length > 0 ? meaningful : segments).at(-1) };
}

/**
 * 命令里的选项名与环境变量赋值，按出现顺序去重：`--runInBand`、`-x`、`NODE_OPTIONS=...`。
 * 选项只取名字（`--filter=web` 是 `--filter`），环境变量保留取值；here-string 的数据不算。
 * 两次运行的选项不同，才算改写了命令；只换了文件、参数或选项的值不算。
 */
export function optionsOf(command: string): string[] {
  const options: string[] = [];
  for (const line of logicalLines(command)) {
    let data = false;
    for (const entry of parse(maskExpansions(line), env)) {
      const word = wordOf(entry);
      if (word === null) {
        data = opOf(entry) === "<<<";
        continue;
      }
      if (data) data = false;
      else if (/^[A-Z_][A-Z0-9_]*=/u.test(word)) options.push(word);
      else if (word.startsWith("-")) options.push(word.split("=")[0] ?? word);
    }
  }
  return [...new Set(options)];
}

/** 测试、检查与构建：成功时可以作为任务完成的验证证据。 */
export function isVerification(family: CommandFamily): boolean {
  return family === "test" || family === "check" || family === "build";
}

/** `pm run <脚本>` 的脚本名词干：`build:web` 与 `build` 的词干相同。 */
export function scriptStem(key: string): string | null {
  if (!key.startsWith("pm run ")) return null;
  return key.slice("pm run ".length).split(/[:.]/u)[0] ?? null;
}
