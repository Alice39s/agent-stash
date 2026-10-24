import { defineConfig } from "tsdown";

/** DSH 直接加载 dist，运行时依赖全部打包进去。 */
const BUNDLED = [
  "pathe",
  "unist-util-stringify-position",
  "valibot",
  "vfile",
  "vfile-matter",
  "vfile-message",
  "yaml",
];

export default defineConfig({
  entry: { "dsh/init": "dsh/init/index.ts" },
  outDir: "dist",
  format: "esm",
  platform: "node",
  target: "node24",
  fixedExtension: false,
  dts: false,
  deps: { alwaysBundle: BUNDLED, onlyBundle: BUNDLED },
});
