/**
 * 图表测试共用的工具。happy-dom 不做布局，它的 ResizeObserver 只是空壳、从不回调，文字宽度总是 0；
 * `driveResize` 与 `measureText` 换上同样接口的替身，组件里的测量代码原样运行。
 */
import { act } from "react";
import { vi } from "vitest";

interface Watch {
  readonly callback: ResizeObserverCallback;
  readonly observer: ResizeObserver;
}

export interface ResizeDriver {
  /** 把每个被观察元素的内容宽度设为 `width`，并等待随后的渲染。 */
  readonly resize: (width: number) => Promise<void>;
  /** 正在被观察的元素数。 */
  readonly observed: () => number;
}

function entryOf(target: Element, width: number): ResizeObserverEntry {
  const size = [{ inlineSize: width, blockSize: 0 }];
  return {
    target,
    contentRect: DOMRectReadOnly.fromRect({ width, height: 0 }),
    borderBoxSize: size,
    contentBoxSize: size,
    devicePixelContentBoxSize: size,
  };
}

/** 换上 ResizeObserver 替身；测试结束时用 `vi.unstubAllGlobals()` 换回。 */
export function driveResize(): ResizeDriver {
  const watched = new Map<Element, Watch>();
  vi.stubGlobal(
    "ResizeObserver",
    function ResizeObserverStandIn(callback: ResizeObserverCallback): ResizeObserver {
      const observer: ResizeObserver = {
        observe: (target) => {
          watched.set(target, { callback, observer });
        },
        unobserve: (target) => {
          watched.delete(target);
        },
        disconnect: () => {
          for (const [target, watch] of watched) {
            if (watch.observer === observer) watched.delete(target);
          }
        },
      };
      return observer;
    },
  );
  return {
    resize: async (width) => {
      await act(async () => {
        for (const [target, watch] of watched) {
          watch.callback([entryOf(target, width)], watch.observer);
        }
      });
    },
    observed: () => watched.size,
  };
}

/**
 * happy-dom 不排版，`getComputedTextLength` 总是 0。换成按字符估宽的替身：汉字与全角字符 `wide` 像素，
 * 其余字符 `narrow` 像素；测试结束时用 `vi.restoreAllMocks()` 换回。
 */
export function measureText(narrow = 6, wide = 11): void {
  vi.spyOn(SVGTextElement.prototype, "getComputedTextLength").mockImplementation(
    function textLength(this: SVGTextElement): number {
      const text = this.textContent ?? "";
      const wideCount = text.match(/[\u2E80-\uFFEF]/gu)?.length ?? 0;
      return (text.length - wideCount) * narrow + wideCount * wide;
    },
  );
}

/** 在元素上触发一次指针移动（`clientY` 是指针相对视口的高度），并等待随后的渲染。 */
export async function hover(element: Element | null | undefined, clientY = 0): Promise<void> {
  if (element === null || element === undefined) throw new Error("没有可悬停的元素");
  await act(async () => {
    element.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY }));
  });
}

/** 指针移进元素（React 的 onPointerEnter 由 pointerover 触发），并等待随后的渲染。 */
export async function enter(element: Element | null | undefined): Promise<void> {
  if (element === null || element === undefined) throw new Error("没有可移入的元素");
  await act(async () => {
    element.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
  });
}

/** 指针离开元素，并等待随后的渲染。 */
export async function leave(element: Element | null | undefined): Promise<void> {
  if (element === null || element === undefined) throw new Error("没有可离开的元素");
  await act(async () => {
    element.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
  });
}

/** 让元素获得焦点，并等待随后的渲染。 */
export async function focus(element: Element | null | undefined): Promise<void> {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
    throw new Error("没有可聚焦的元素");
  }
  await act(async () => {
    element.focus();
  });
}

/** 让元素失去焦点，并等待随后的渲染。 */
export async function blur(element: Element | null | undefined): Promise<void> {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
    throw new Error("没有可失焦的元素");
  }
  await act(async () => {
    element.blur();
  });
}

/** 当前显示的提示的文字；没有提示时为 null。 */
export function tooltipText(root: ParentNode): string | null {
  return root.querySelector("[role=tooltip]")?.textContent ?? null;
}
