import { defineConfig } from "tsdown";
import { clientBundle } from "../dsh-message-edit/tsdown.client.ts";

const PLUGIN_ID = "@agent-stash/dsh-skill-scout";

/** DSH 0.2.1-rc.3 起浏览器模块表提供的模块：React、react-dom 与宿主 UI 基础组件。 */
const PLATFORM_MODULES = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "@deepseek-ai/dsh-client-ui-primitives",
];

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
  clientBundle(PLUGIN_ID, "src/client/index.ts", PLATFORM_MODULES),
]);
