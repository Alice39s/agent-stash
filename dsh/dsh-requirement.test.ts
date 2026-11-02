import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
import * as v from "valibot";
import { expect, test } from "vitest";

/** 仓库根目录。 */
const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** 发布到 npm 的 DSH 组合包目录，相对仓库根目录。 */
const BUNDLE_DIRS = [
  ".",
  "dsh/kit",
  "dsh/recall",
  "dsh/autosuggest",
  "dsh/enhance",
  "packages/dsh-message-edit",
  "packages/dsh-skill-scout",
];

/** DSH 运行时本身的包名；插件市场与 DSH 从 peerDependencies 读取对它的版本要求。 */
const DSH_PACKAGE = "@deepseek-ai/dsh";

const RequirementSchema = v.object({
  name: v.string(),
  engines: v.object({ dsh: v.string() }),
  peerDependencies: v.record(v.string(), v.string()),
  peerDependenciesMeta: v.record(v.string(), v.object({ optional: v.boolean() })),
});

test.each(BUNDLE_DIRS)(
  "%s declares its DSH requirement as an optional peer that matches engines.dsh",
  async (dir) => {
    const manifest = v.parse(
      RequirementSchema,
      JSON.parse(await readFile(join(ROOT, dir, "package.json"), "utf8")),
    );
    expect(manifest.peerDependencies[DSH_PACKAGE]).toBe(manifest.engines.dsh);
    expect(manifest.peerDependenciesMeta[DSH_PACKAGE]).toEqual({ optional: true });
  },
);
