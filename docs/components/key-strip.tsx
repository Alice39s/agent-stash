import { STRIP_KEYS } from "@/lib/strip-keys";

/**
 * design.md「按键帽条」：插件实际使用的按键排成一行，透明度从左到右由 40% 升到 100%。纯装饰，对辅助技术隐藏。
 */
export function KeyStrip() {
  const last = STRIP_KEYS.length - 1;
  return (
    <div aria-hidden="true" className="flex flex-wrap gap-1.5 overflow-hidden">
      {STRIP_KEYS.map((key, index) => (
        <span
          key={`${String(index)}-${key}`}
          style={{ opacity: 0.4 + (0.6 * index) / last }}
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-(--radius) border border-b-2 bg-fd-muted px-2 font-mono text-xs font-medium text-fd-foreground"
        >
          {key}
        </span>
      ))}
    </div>
  );
}
