import { assetPath } from "@/lib/shared";

/**
 * design.md「页头图」：概览页标题上方的装饰图，插件与技能图标排成的方块阵列。浅色、深色两版各一张 SVG，
 * 按 next-themes 在 html 上切换的 dark 类显示其中一张。
 */
export function HeaderArt() {
  const image = "block h-auto w-full select-none";
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-t-(--radius-card)">
      <img
        src={assetPath("/header-light.svg")}
        alt=""
        width={1280}
        height={380}
        className={`${image} dark:hidden`}
        draggable={false}
      />
      <img
        src={assetPath("/header-dark.svg")}
        alt=""
        width={1280}
        height={380}
        className={`${image} hidden dark:block`}
        draggable={false}
      />
    </div>
  );
}
