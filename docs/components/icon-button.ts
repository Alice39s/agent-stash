/**
 * 只有图标的 ghost 按钮，用 Fumadocs 的颜色名：muted 图标，悬停与菜单展开时为 accent 底色，768px 以下触控尺寸
 * 至少 44px。键盘焦点使用全局 outline。
 */
export const iconButton =
  "inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-(--radius) text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground aria-expanded:bg-fd-accent max-md:min-h-11 max-md:min-w-11 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0";
