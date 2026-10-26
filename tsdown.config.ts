import { defineConfig, type UserConfig } from "tsdown";

/** DSH、Cline 与命令行直接加载 dist，运行时依赖全部打包进去。 */
const BUNDLED = [
  "pathe",
  "unist-util-stringify-position",
  "valibot",
  "vfile",
  "vfile-matter",
  "vfile-message",
  "yaml",
];

/** 每个入口单独打包：共享 chunk 会改变 `import.meta.url` 所在目录，找不到 `vendor/` 与 `prompts/`。 */
const ENTRIES = {
  "cli/agent-stash": "cli/agent-stash.ts",
  "cline/init": "cline/init/index.ts",
  "dsh/init": "dsh/init/index.ts",
};

/** 自带 `package.json` 的 DSH 插件包（目录名到包名）：Host 半部与浏览器半部都输出到包内 `dist/`。 */
const DSH_PACKAGES = {
  kit: "@agent-stash/dsh-stash-kit",
  recall: "@agent-stash/dsh-recall",
  autosuggest: "@agent-stash/dsh-autosuggest",
};

/** DSH 插件包 Host 半部打包进去的依赖：插件包不带 node_modules。 */
const DSH_HOST_BUNDLED = [
  "@deepseek-ai/schemastery",
  "@deepseek-ai/cosmokit",
  "@standard-schema/spec",
  "pathe",
  "valibot",
];

/** DSH 浏览器模块表提供的模块，浏览器半部从注入的 `require` 取得。 */
const CLIENT_EXTERNALS = ["react", "react/jsx-runtime", "@deepseek-ai/dsh-client-ui-primitives"];

function nodeEntry(
  name: string,
  source: string,
  outDir: string,
  bundled: readonly string[],
): UserConfig {
  return {
    entry: { [name]: source },
    outDir,
    clean: false,
    format: "esm",
    platform: "node",
    target: "node24",
    fixedExtension: false,
    dts: false,
    deps: { alwaysBundle: [...bundled], onlyBundle: [...bundled] },
    // Cline 加载插件时会把 JSDoc 里的 `import('unist')` 当成依赖去解析。
    outputOptions: { comments: { jsdoc: false } },
  };
}

/**
 * DSH 浏览器半部：CommonJS 产物外包一层 `window.__ModuleLoader__.load`，
 * 工厂收到模块表的 `require`，返回的 `exports` 即插件的 `inject` 与 `apply`。
 */
function clientEntry(packageName: string, source: string, outDir: string): UserConfig {
  return {
    entry: { client: source },
    outDir,
    clean: false,
    format: "cjs",
    platform: "browser",
    target: "es2022",
    outExtensions: () => ({ js: ".js" }),
    dts: false,
    deps: { neverBundle: CLIENT_EXTERNALS, alwaysBundle: ["valibot"], onlyBundle: ["valibot"] },
    outputOptions: {
      comments: { jsdoc: false },
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory(require) {\nconst exports = {};`,
      footer: "return exports;\n} });",
    },
  };
}

export default defineConfig([
  ...Object.entries(ENTRIES).map(([name, source]) => nodeEntry(name, source, "dist", BUNDLED)),
  ...Object.entries(DSH_PACKAGES).flatMap(([dir, packageName]) => [
    nodeEntry("index", `dsh/${dir}/src/index.ts`, `dsh/${dir}/dist`, DSH_HOST_BUNDLED),
    clientEntry(packageName, `dsh/${dir}/src/client.tsx`, `dsh/${dir}/dist`),
  ]),
]);
