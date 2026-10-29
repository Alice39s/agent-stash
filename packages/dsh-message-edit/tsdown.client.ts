/**
 * DSH 浏览器插件的打包预设，结构取自 deepseek-harness `packages/client/tsdown.client.ts`（MIT）。
 *
 * 产物是单个 CJS `client.js`：外层调用 `window.__ModuleLoader__.load({ id, factory })`，
 * `factory` 收到的 `require` 只解析 DSH 模块表里的平台模块。CSS Modules 由 lightningcss 编译进
 * bundle，工厂执行时插入一个带 `data-plugin` 的 `<style>`，插件卸载时由加载器移除。
 */
import { readFile } from "node:fs/promises";
import { transform } from "lightningcss";
import { basename, dirname, relative, resolve } from "pathe";
import type { UserConfig } from "tsdown";

/** DSH 0.1.0-rc.3 与 0.2.1-rc.3 的模块表都提供的平台模块；默认 bundle 只能 require 这些。 */
const PLATFORM_MODULES = ["react", "react/jsx-runtime"];

/** 包一层虚拟 id，避开 tsdown 自带的 CSS 流水线；后缀不能以 `.css` 结尾。 */
const CSS_PREFIX = "\0dsh-css:";
const CSS_SUFFIX = ".mjs";

/** 编译 CSS Module，返回在工厂执行时插入样式并导出类名表的模块源码。 */
async function cssModule(id: string, file: string): Promise<string> {
  // 类名哈希取自 filename：用包名加文件名，产物与检出位置无关。
  const tag = `${id}/${basename(file)}`;
  const { code, exports } = transform({
    filename: tag,
    code: await readFile(file),
    cssModules: { pattern: "[hash]_[local]" },
    minify: true,
  });
  // lightningcss 的导出表顺序不固定，按类名排序让产物可复现。
  const classes = Object.fromEntries(
    Object.entries(exports ?? {})
      .map(([local, value]) => [local, value.name] as const)
      .toSorted(([a], [b]) => a.localeCompare(b, "en")),
  );
  return [
    `const css = ${JSON.stringify(code.toString())};`,
    `const tag = ${JSON.stringify(tag)};`,
    "if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tag)}]`) === null) {",
    "  const style = document.createElement('style');",
    `  style.dataset.plugin = ${JSON.stringify(id)};`,
    "  style.dataset.pluginCss = tag;",
    "  style.textContent = css;",
    "  document.head.appendChild(style);",
    "}",
    `export default ${JSON.stringify(classes)};`,
  ].join("\n");
}

/**
 * 一个浏览器插件 bundle 的 tsdown 配置；`id` 是包名，也是模块表里的工厂 id。
 * `platformModules` 是 bundle 从模块表 `require` 的模块：只支持 DSH 0.2.1 及以上的插件可以加上
 * `react-dom` 与 `@deepseek-ai/dsh-client-ui-primitives`，其余 `@deepseek-ai/*` 一律不得在运行时引用。
 */
export function clientBundle(
  id: string,
  entry: string,
  platformModules: readonly string[] = PLATFORM_MODULES,
): UserConfig {
  return {
    name: `${id}/client`,
    entry: { client: entry },
    outDir: "dist",
    format: "cjs",
    platform: "browser",
    target: "es2022",
    dts: false,
    sourcemap: true,
    clean: false,
    fixedExtension: false,
    // 除平台模块外一律打包；包的依赖都写在 devDependencies，tsdown 默认就会打包它们。
    deps: { neverBundle: [...platformModules] },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [
      {
        // 跨插件的值导入会内联出第二份运行时实例，或请求模块表里没有的模块；插件之间只通过 Cordis Service 协作。
        name: "dsh-client-purity",
        resolveId(source: string) {
          if (source.startsWith("@deepseek-ai/") && !platformModules.includes(source)) {
            throw new Error(`${id}: the client bundle must not import ${source} at runtime`);
          }
          return null;
        },
      },
      {
        name: "dsh-css-modules",
        // 虚拟 id 用相对包目录的路径，产物里的 region 注释与检出位置无关。
        resolveId(source: string, importer: string | undefined) {
          if (!source.endsWith(".module.css") || importer === undefined) return null;
          const file = resolve(dirname(importer), source);
          return `${CSS_PREFIX}${relative(process.cwd(), file)}${CSS_SUFFIX}`;
        },
        load(virtualId: string) {
          if (!virtualId.startsWith(CSS_PREFIX)) return null;
          const file = resolve(
            process.cwd(),
            virtualId.slice(CSS_PREFIX.length, -CSS_SUFFIX.length),
          );
          this.addWatchFile(file);
          return cssModule(id, file);
        },
      },
    ],
    outputOptions: {
      entryFileNames: "client.js",
      sourcemapPathTransform: (source: string) => basename(source),
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      intro: "var module = { exports: {} }; var exports = module.exports;",
      footer: "return module.exports; } });",
    },
  };
}
