/**
 * Skill 文件的写入与撤销。只写进 DSH 会扫描的四个 Skill 目录。新 Skill 先在根目录旁的暂存目录里写好，
 * 再整个目录改名进根目录；改写已有文件先落到同目录的临时文件再改名。DSH 与其他读者看到的始终是完整的 Skill。
 * 撤销前比对写入时的哈希，文件被改过就拒绝，交给用户处理。
 */
import { createHash, randomBytes } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "pathe";
import { SKILL_NAME } from "./llm.ts";
import type { WriteRecord } from "./store.ts";

/** 写入失败的原因，界面据此给出说明。 */
export type WriteErrorKind = "exists" | "changed" | "invalid" | "outside";

export type WriteError = Error & { readonly kind: WriteErrorKind };

export function writeError(kind: WriteErrorKind, message: string): WriteError {
  return Object.assign(new Error(message), { name: "WriteError", kind });
}

export function isWriteError(error: Error): error is WriteError {
  return error.name === "WriteError" && "kind" in error;
}

/** Node 文件系统错误的 `code`，例如 `ENOENT`。 */
export function errorCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

/** 用户级 Skill 根目录，与 DSH 的 skill-filesystem 一致：`$DSH_AGENTS_HOME` 或 `~/.agents`。 */
export function agentsHome(): string {
  return resolve(process.env.DSH_AGENTS_HOME ?? join(homedir(), ".agents"));
}

/** DSH 配置根目录：`$DSH_HOME` 或 `~/.dsh`。 */
export function dshHome(): string {
  return resolve(process.env.DSH_HOME ?? join(homedir(), ".dsh"));
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (errorCode(error) === "ENOENT") return false;
    throw error;
  }
}

/** 与 DSH 相同的项目根：向上找到第一个含 `.git` 的目录，找不到时用 cwd 本身。 */
export async function projectRoot(cwd: string): Promise<string> {
  let current = resolve(cwd);
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- 逐级向上查找，找到即停。
    if (await exists(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

/** 一个会被 DSH 扫描、允许写入的 Skill 根目录。 */
export async function skillRoots(cwd: string | null): Promise<readonly string[]> {
  const roots = [join(agentsHome(), "skills"), join(dshHome(), "skills")];
  if (cwd === null) return roots;
  const root = await projectRoot(cwd);
  return [join(root, ".agents/skills"), join(root, ".dsh/skills"), ...roots];
}

/** 路径必须是某个 Skill 根目录下 `<name>/SKILL.md` 的形式。 */
export function insideRoots(path: string, roots: readonly string[]): boolean {
  const target = resolve(path);
  return roots.some((root) => {
    const base = resolve(root);
    const rest = target.startsWith(`${base}/`) ? target.slice(base.length + 1).split("/") : [];
    return rest.length === 2 && rest[1] === "SKILL.md" && SKILL_NAME.test(rest[0] ?? "");
  });
}

/**
 * 新 Skill 的目标路径。
 * @param scope - project 写进项目的 `.agents/skills`，user 写进 `~/.agents/skills`。
 * @param name - Skill 名称，必须是 kebab-case。
 * @param cwd - 证据会话的工作目录；project 范围需要它。
 */
export async function newSkillPath(
  scope: "project" | "user",
  name: string,
  cwd: string | null,
): Promise<string> {
  if (!SKILL_NAME.test(name)) throw writeError("invalid", `Skill 名称必须是 kebab-case：${name}`);
  if (scope === "project") {
    if (cwd === null) throw writeError("invalid", "证据会话没有工作目录，无法写入项目级 Skill");
    return join(await projectRoot(cwd), ".agents/skills", name, "SKILL.md");
  }
  return join(agentsHome(), "skills", name, "SKILL.md");
}

/** 界面上显示的路径：家目录换成 `~`。 */
export function displayPath(path: string): string {
  const home = resolve(homedir());
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** 内容的 sha256。 */
export function hashOf(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** 先写同目录的临时文件再改名。 */
async function atomicWrite(path: string, content: string): Promise<void> {
  const temp = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temp, content, { encoding: "utf8", flag: "wx" });
  try {
    await rename(temp, path);
  } catch (error) {
    await unlink(temp);
    throw error;
  }
}

/** 读取文件；不存在时返回 null。 */
export async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  }
}

/**
 * 新建一个 Skill 文件；目标已存在时拒绝。
 * @returns 写入记录里与文件有关的字段。
 */
export async function createSkillFile(
  path: string,
  content: string,
  roots: readonly string[],
): Promise<Pick<WriteRecord, "path" | "previous" | "hash" | "createdDir">> {
  if (!insideRoots(path, roots)) throw writeError("outside", `目标不在 Skill 目录里：${path}`);
  if (await exists(path)) throw writeError("exists", `已经存在：${path}`);
  const dir = dirname(path);
  if (await exists(dir)) {
    await atomicWrite(path, content);
    return { path, previous: null, hash: hashOf(content), createdDir: false };
  }
  // 暂存目录放在 Skill 根目录的上一级：DSH 扫描根目录时看不到写到一半的 Skill。
  const root = dirname(dir);
  await mkdir(root, { recursive: true });
  const staging = join(dirname(root), `.skill-scout-${randomBytes(6).toString("hex")}`);
  await mkdir(staging);
  try {
    await writeFile(join(staging, "SKILL.md"), content, { encoding: "utf8", flag: "wx" });
    await rename(staging, dir);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { path, previous: null, hash: hashOf(content), createdDir: true };
}

/**
 * 改写已有 Skill 文件；文件在预览之后被改过时拒绝。
 * @param expected - 预览时读到的内容。
 */
export async function replaceSkillFile(
  path: string,
  expected: string,
  content: string,
  roots: readonly string[],
): Promise<Pick<WriteRecord, "path" | "previous" | "hash" | "createdDir">> {
  if (!insideRoots(path, roots))
    throw writeError("outside", `目标不在可写的 Skill 目录里：${path}`);
  const current = await readOptional(path);
  if (current !== expected) throw writeError("changed", `预览之后文件被改过：${path}`);
  await atomicWrite(path, content);
  return { path, previous: current, hash: hashOf(content), createdDir: false };
}

/**
 * 撤销一次写入：新建的文件删除，改写的文件恢复原内容。
 * @param record - 写入记录。
 * @throws WriteError：写入之后文件被改过。
 */
export async function undoSkillWrite(record: WriteRecord): Promise<void> {
  const current = await readOptional(record.path);
  if (current === null && record.previous === null) return;
  if (current === null || hashOf(current) !== record.hash) {
    throw writeError("changed", `写入之后文件被改过，请手动处理：${record.path}`);
  }
  if (record.previous !== null) {
    await atomicWrite(record.path, record.previous);
    return;
  }
  await unlink(record.path);
  const dir = dirname(record.path);
  if (record.createdDir && (await readdir(dir)).length === 0) await rmdir(dir);
}
