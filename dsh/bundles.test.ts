import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
import semver from "semver";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";

/** 独立的 DSH 插件包：目录（相对 `dsh/`）到 npm 包名与插件行 id。 */
const BUNDLES = {
  kit: { packageName: "@agent-stash/dsh-stash-kit", row: "dsh-stash-kit" },
  recall: { packageName: "@agent-stash/dsh-recall", row: "dsh-recall" },
  autosuggest: { packageName: "@agent-stash/dsh-autosuggest", row: "dsh-autosuggest" },
};
/** 以 Agent Stash 框架为前置依赖的插件包。 */
const KIT_CONSUMERS = ["recall", "autosuggest"];
/** 第一个带「发现」页、能从插件索引安装组合包的 DSH 版本。 */
const FIRST_INDEX_DSH = "0.2.1-alpha.4";
/** 插件索引里内联图标的上限。 */
const INLINE_ICON_BYTES = 32 * 1024;

const NonEmptySchema = v.pipe(v.string(), v.regex(/\S/u));

const BundleManifestSchema = v.object({
  name: NonEmptySchema,
  private: v.optional(v.literal(false)),
  type: v.literal("module"),
  icon: v.literal("./icon.svg"),
  engines: v.object({ dsh: NonEmptySchema }),
  exports: v.object({
    ".": v.literal("./dist/index.js"),
    "./client": v.literal("./dist/client.js"),
    "./locale/*.json": v.literal("./locale/*.json"),
  }),
  files: v.array(v.string()),
  publishConfig: v.object({ access: v.literal("public") }),
  dsh: v.object({
    manifestVersion: v.literal(1),
    bundle: v.object({ patch: v.literal("./cordis.patch.yml") }),
    client: v.object({
      platform: v.literal("web"),
      immediately: v.literal(true),
      inject: v.optional(v.array(v.string())),
    }),
  }),
});

const PatchSchema = v.tuple([
  v.object({
    insert: v.tuple([v.object({ id: NonEmptySchema, name: NonEmptySchema, config: v.object({}) })]),
  }),
]);

const LocaleSchema = v.object({
  meta: v.object({ title: NonEmptySchema, description: NonEmptySchema }),
});

describe.each(Object.entries(BUNDLES))("DSH bundle dsh/%s", (bundle, { packageName, row }) => {
  const root = fileURLToPath(new URL(`./${bundle}/`, import.meta.url));
  const read = async (file: string): Promise<unknown> =>
    JSON.parse(await readFile(join(root, file), "utf8"));

  test("declares a public bundle with a Host and a web client half", async () => {
    const manifest = v.parse(BundleManifestSchema, await read("package.json"));
    expect(manifest.name).toBe(packageName);
    expect(manifest.files.toSorted()).toEqual(["cordis.patch.yml", "dist", "icon.svg", "locale"]);
    expect(
      semver.satisfies(FIRST_INDEX_DSH, manifest.engines.dsh, { includePrerelease: true }),
    ).toBe(true);
    const files = await Promise.all(
      ["dist/index.js", "dist/client.js"].map((file) => stat(join(root, file))),
    );
    expect(files.map((file) => file.isFile())).toEqual([true, true]);
  });

  test("inserts one plugin row that loads the package", async () => {
    const patch = v.parse(
      PatchSchema,
      parse(await readFile(join(root, "cordis.patch.yml"), "utf8")),
    );
    expect(patch[0].insert[0]).toEqual({ id: row, name: packageName, config: {} });
  });

  test("ships English and Chinese display metadata", async () => {
    expect((await readdir(join(root, "locale"))).toSorted()).toEqual(["en.json", "zh.json"]);
    const locales = await Promise.all(["locale/en.json", "locale/zh.json"].map(read));
    for (const locale of locales) v.parse(LocaleSchema, locale);
  });

  test("has an SVG icon small enough to inline in a plugin index", async () => {
    const icon = await readFile(join(root, "icon.svg"), "utf8");
    expect(icon.startsWith("<svg")).toBe(true);
    expect(Buffer.byteLength(icon)).toBeLessThanOrEqual(INLINE_ICON_BYTES);
  });

  test("imports only Node built-ins from its Host half", async () => {
    const host = await readFile(join(root, "dist/index.js"), "utf8");
    const specifiers = [...host.matchAll(/^import .* from "([^"]+)";$/gmu)].map(
      (match) => match[1],
    );
    expect(specifiers.filter((specifier) => !specifier?.startsWith("node:"))).toEqual([]);
  });

  test("wraps the client half in the DSH module loader under the package name", async () => {
    const client = await readFile(join(root, "dist/client.js"), "utf8");
    expect(client.startsWith(`window.__ModuleLoader__.load({\n\tid: "${packageName}",`)).toBe(true);
    expect(client).toContain("exports.apply = apply;");
    expect(client).not.toMatch(
      /\bimport\s*[{(]|require\("(?!react(?:\/jsx-runtime)?"|@deepseek-ai\/dsh-client-ui-primitives")/u,
    );
  });
});

describe("Agent Stash Kit", () => {
  const root = fileURLToPath(new URL("./kit/", import.meta.url));

  test("provides the stashKit service and exposes a volatile Config from its Host half", async () => {
    const host = await readFile(join(root, "dist/index.js"), "utf8");
    expect(host).toContain('Symbol.for("schemastery")');
    expect(host).toMatch(/provide\("stashKit"/u);
    const client = await readFile(join(root, "dist/client.js"), "utf8");
    expect(client).toMatch(/provide\("stashKit"/u);
  });

  test.each(KIT_CONSUMERS)(
    "dsh/%s waits for the kit service and installs the kit at startup",
    async (bundle) => {
      const dir = fileURLToPath(new URL(`./${bundle}/`, import.meta.url));
      const manifest = v.parse(
        BundleManifestSchema,
        JSON.parse(await readFile(join(dir, "package.json"), "utf8")),
      );
      expect(manifest.dsh.client.inject).toContain(BUNDLES.kit.packageName);
      const client = await readFile(join(dir, "dist/client.js"), "utf8");
      expect(client).toMatch(/"stashKit"/u);
      expect(client).not.toContain("dsh-stash-panel {");
      const host = await readFile(join(dir, "dist/index.js"), "utf8");
      expect(host).toContain(JSON.stringify(BUNDLES.kit.packageName));
      expect(host).toMatch(/inject\(\["pluginManager"\]/u);
    },
  );
});
