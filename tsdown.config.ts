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

export default defineConfig(
  Object.entries(ENTRIES).map(([name, source]): UserConfig => ({
    entry: { [name]: source },
    outDir: "dist",
    clean: false,
    format: "esm",
    platform: "node",
    target: "node24",
    fixedExtension: false,
    dts: false,
    deps: { alwaysBundle: BUNDLED, onlyBundle: BUNDLED },
    // Cline 加载插件时会把 JSDoc 里的 `import('unist')` 当成依赖去解析。
    outputOptions: { comments: { jsdoc: false } },
  })),
);
