import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Renderer } from "takumi-js/node";

/** 每张预览图使用的字体族；渲染器不带中文字形，中文标题需要 Noto Sans SC。 */
export const ogFontFamily = "Noto Sans SC Variable";

/** 把 Fontsource 包里的全部 woff2 子集注册为同一个字体族，每种文字都能找到字形。 */
async function registerNotoSansSC(renderer: Renderer): Promise<void> {
  // 打包器会把 `require.resolve` 换成模块 id，所以从 `next build` 运行的包目录查找字体文件。
  const dir = join(process.cwd(), "node_modules", "@fontsource-variable", "noto-sans-sc", "files");
  const files = (await readdir(dir))
    .filter((file) => file.endsWith("-wght-normal.woff2"))
    .toSorted();
  if (files.length === 0) throw new Error(`No Noto Sans SC font files in ${dir}`);
  await Promise.all(
    files.map(async (file, rank) =>
      renderer.registerFont({
        name: `${ogFontFamily} ${String(rank)}`,
        data: await readFile(join(dir, file)),
        subsetOf: ogFontFamily,
        subsetRank: rank,
      }),
    ),
  );
}

let shared: Promise<Renderer> | undefined;

export function ogRenderer(): Promise<Renderer> {
  shared ??= (async () => {
    const renderer = new Renderer();
    await registerNotoSansSC(renderer);
    return renderer;
  })();
  return shared;
}
