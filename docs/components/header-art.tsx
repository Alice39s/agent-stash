import { readFileSync } from "node:fs";
import { join } from "pathe";

/**
 * 页头图的 SVG 自带浅色、深色两套配色：图里的样式先跟随系统配色，内联进页面后由 html 上 next-themes 切换的
 * light、dark 类决定。所以这里把 SVG 直接写进页面，而不是用 img 引用。构建时在 docs 目录下读取。
 */
const svg = readFileSync(join(process.cwd(), "components/header-art.svg"), "utf8");

/** design.md「页头图」：概览页标题上方的装饰图，插件与技能图标排成的方块阵列。 */
export function HeaderArt() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-t-(--radius-card) select-none [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      // 内容是仓库里生成的固定 SVG，不含外部输入。
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
