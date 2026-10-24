#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "pathe";
import { parseArgs } from "node:util";
import * as v from "valibot";
import { Document, isMap, isSeq, parseDocument, YAMLMap } from "yaml";
import { GENERATOR, gooseRecipes, grokSkills, type GeneratedFile } from "../src/init/adapters.ts";
import { parseInitArgs, parsePromptFile, renderInitPrompt } from "../src/init/prompt.ts";
import { CONFIG_PATH, loadInitRegistry } from "../src/init/registry.ts";

const USAGE = `Usage:
  agent-stash init install grok [--dir <skills dir>]
  agent-stash init install goose [--dir <goose config dir>]
  agent-stash init aider [preset] [extra prompt] [-- <aider options>]`;

const GeneratedSkillSchema = v.object({ metadata: v.object({ generator: v.literal(GENERATOR) }) });

const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
const registry = await loadInitRegistry([join(configHome, CONFIG_PATH)]);

async function writeFiles(dir: string, files: GeneratedFile[]): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const target = join(dir, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }),
  );
}

/** 先删掉上次安装的技能目录（frontmatter 带 `metadata.generator` 标记），再写入新的。 */
async function installGrok(dir: string): Promise<string[]> {
  const entries = existsSync(dir) ? await readdir(dir, { withFileTypes: true }) : [];
  await Promise.all(
    entries.map(async (entry) => {
      const skill = join(dir, entry.name, "SKILL.md");
      if (!entry.isDirectory() || !existsSync(skill)) return;
      const { matter } = parsePromptFile(await readFile(skill, "utf8"));
      if (v.is(GeneratedSkillSchema, matter)) await rm(join(dir, entry.name), { recursive: true });
    }),
  );
  const files = await grokSkills(registry);
  await writeFiles(dir, files);
  return files.map((file) => `/${dirname(file.path)}`);
}

/** recipe 写进独立目录，`config.yaml` 的 `slash_commands` 只替换指向这个目录的条目。 */
async function installGoose(configDir: string): Promise<string[]> {
  const recipeDir = join(configDir, "agent-stash-init");
  await rm(recipeDir, { recursive: true, force: true });
  const files = await gooseRecipes(registry);
  await writeFiles(recipeDir, files);

  const configFile = join(configDir, "config.yaml");
  const doc = existsSync(configFile)
    ? parseDocument(await readFile(configFile, "utf8"))
    : new Document({});
  if (doc.errors.length > 0) throw new Error(`Invalid ${configFile}: ${doc.errors[0]?.message}`);
  const current = doc.get("slash_commands");
  if (current !== undefined && !isSeq(current)) {
    throw new Error(`${configFile}: slash_commands must be a list`);
  }
  const kept = (current?.items ?? []).filter((item) => {
    const path = isMap(item) ? item.get("recipe_path") : undefined;
    return !(typeof path === "string" && dirname(path) === recipeDir);
  });
  const added = files.map((file) => {
    const entry = new YAMLMap();
    entry.set("command", file.path.replace(/\.yaml$/, ""));
    entry.set("recipe_path", join(recipeDir, file.path));
    return entry;
  });
  doc.set("slash_commands", doc.createNode([...kept, ...added]));
  await mkdir(configDir, { recursive: true });
  await writeFile(configFile, doc.toString());
  return files.map((file) => `/${file.path.replace(/\.yaml$/, "")}`);
}

/** 渲染预设后交给 `aider --message`，`--` 之后的参数原样传给 aider。 */
async function runAider(args: string[]): Promise<number> {
  const split = args.indexOf("--");
  const own = split === -1 ? args : args.slice(0, split);
  const passthrough = split === -1 ? [] : args.slice(split + 1);
  const { preset, extra } = parseInitArgs(own.join(" "), registry);
  const prompt = renderInitPrompt(await readFile(preset.file, "utf8"), extra, process.cwd());
  console.error(`/init ${preset.name}: ${preset.description}`);
  const result = spawnSync("aider", ["--message", prompt, ...passthrough], { stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const argv = process.argv.slice(2);
const [scope, action, target] = argv;
if (scope !== "init") {
  console.error(USAGE);
  process.exit(2);
}
if (action === "aider") {
  process.exit(await runAider(argv.slice(2)));
}
if (action !== "install" || (target !== "grok" && target !== "goose")) {
  console.error(USAGE);
  process.exit(2);
}
const { values } = parseArgs({ args: argv.slice(3), options: { dir: { type: "string" } } });
const dir = resolve(
  values.dir ??
    (target === "grok"
      ? join(process.env.GROK_HOME ?? join(homedir(), ".grok"), "skills")
      : join(configHome, "goose")),
);
const commands = target === "grok" ? await installGrok(dir) : await installGoose(dir);
console.log(`Installed ${commands.join(", ")} into ${dir}`);
