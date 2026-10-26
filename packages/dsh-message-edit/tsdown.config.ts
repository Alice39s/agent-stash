import { defineConfig } from "tsdown";
import { clientBundle } from "./tsdown.client.ts";

const PLUGIN_ID = "@agent-stash/dsh-message-edit";

export default defineConfig([
  {
    name: `${PLUGIN_ID}/host`,
    entry: { index: "src/host/index.ts" },
    outDir: "dist",
    format: "esm",
    platform: "node",
    target: "node22",
    dts: false,
    clean: false,
    fixedExtension: false,
  },
  clientBundle(PLUGIN_ID, "src/client/index.ts"),
]);
