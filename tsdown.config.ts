import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { "dsh/init": "dsh/init/index.ts" },
  outDir: "dist",
  format: "esm",
  platform: "node",
  target: "node24",
  fixedExtension: false,
  dts: false,
  deps: { alwaysBundle: ["pathe", "valibot"], onlyBundle: ["pathe", "valibot"] },
});
