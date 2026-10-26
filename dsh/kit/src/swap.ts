import type { AppearanceStore, SwapDirection } from "./service.ts";

/**
 * 程序改写草稿后，让输入框里的新草稿从翻看的方向滑入。只在灵动档播放；
 * 连续切换时从头重播，动画结束后移除标记。
 */
export function createSwap(
  k: string,
  store: AppearanceStore,
): (card: HTMLElement, direction: SwapDirection) => void {
  const attribute = `data-${k}-swap`;
  return (card, direction) => {
    if (store.get().motion !== "lively") return;
    const editable = card.querySelector<HTMLElement>('[contenteditable="true"]');
    if (editable === null) return;
    editable.removeAttribute(attribute);
    // 读一次布局，让同名动画在属性重新加上时从头播放。
    void editable.offsetWidth;
    editable.setAttribute(attribute, direction);
    editable.addEventListener(
      "animationend",
      (event) => {
        if (event.target === editable) editable.removeAttribute(attribute);
      },
      { once: true },
    );
  };
}
