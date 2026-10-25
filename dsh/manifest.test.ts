import { readFile, readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "pathe";
import semver from "semver";
import * as v from "valibot";
import { expect, test } from "vitest";

/** 仓库根目录，即 `agent-stash` 包根。 */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);

/** 第一个带「发现」页、能从插件索引安装组合包的 DSH 版本。 */
const FIRST_INDEX_DSH = "0.2.1-alpha.4";
/** 插件索引里内联图标的上限，超过就得单独托管图标文件。 */
const INLINE_ICON_BYTES = 32 * 1024;

const NonEmptySchema = v.pipe(v.string(), v.regex(/\S/u));

/** 插件索引生成器从 package.json 读取的字段。 */
const ManifestSchema = v.object({
  name: v.literal("agent-stash"),
  private: v.optional(v.literal(false)),
  icon: NonEmptySchema,
  engines: v.object({ dsh: NonEmptySchema }),
  dsh: v.object({
    manifestVersion: v.literal(1),
    bundle: v.object({ patch: NonEmptySchema }),
  }),
});

const LocaleSchema = v.object({
  meta: v.object({ title: NonEmptySchema, description: NonEmptySchema }),
});

async function readManifest(): Promise<v.InferOutput<typeof ManifestSchema>> {
  return v.parse(ManifestSchema, JSON.parse(await readFile(join(ROOT, "package.json"), "utf8")));
}

test("declares a public DSH bundle whose patch file exists", async () => {
  const manifest = await readManifest();
  expect(manifest.private).toBeUndefined();
  await expect(stat(resolve(ROOT, manifest.dsh.bundle.patch))).resolves.toSatisfy((file) =>
    file.isFile(),
  );
});

test("declares an engines.dsh range that accepts every DSH release with plugin indexes", async () => {
  const { dsh } = (await readManifest()).engines;
  expect(semver.validRange(dsh)).not.toBeNull();
  expect(semver.satisfies(FIRST_INDEX_DSH, dsh, { includePrerelease: true })).toBe(true);
});

test("exports bundle locale files from one directory through the package name", async () => {
  const english = require.resolve("agent-stash/locale/en.json");
  const directory = dirname(english);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).toSorted();
  expect(files).toEqual(["en.json", "zh.json"]);
  const resolved = files.map((name) => require.resolve(`agent-stash/locale/${name}`));
  expect(resolved.map((file) => dirname(file))).toEqual(files.map(() => directory));
  const locales = await Promise.all(resolved.map((file) => readFile(file, "utf8")));
  for (const locale of locales) v.parse(LocaleSchema, JSON.parse(locale));
});

test("points the manifest icon at an SVG inside the package small enough to inline", async () => {
  const icon = resolve(ROOT, (await readManifest()).icon);
  expect(relative(ROOT, icon).startsWith("..")).toBe(false);
  expect(icon.endsWith(".svg")).toBe(true);
  expect((await stat(icon)).size).toBeLessThanOrEqual(INLINE_ICON_BYTES);
});
