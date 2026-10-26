import type { ComponentType } from "react";
import type { Appearance } from "./appearance.ts";

/** 面板里的一行。 */
export interface PanelRow {
  readonly key: string;
  readonly text: string;
  readonly meta?: string;
  /** 与上一行不同时，在本行之前显示分组标题。 */
  readonly section?: string;
}

/** 页脚里的一个按键提示：若干键帽加一段说明。 */
export interface PanelHint {
  readonly keys: readonly string[];
  readonly label: string;
}

export interface PanelProps {
  /** 使用面板的插件名，用作选项 id 前缀与 `data-dsh-history-panel` 的值。 */
  readonly owner: string;
  /** 关闭时面板按配置播放退场动画后卸载。 */
  readonly open: boolean;
  readonly title: string;
  readonly counter: string;
  readonly rows: readonly PanelRow[];
  readonly active: number;
  readonly hints: readonly PanelHint[];
  readonly trailingHints: readonly PanelHint[];
  /** 悬停只着色、不移动高亮；用于高亮会改写草稿的面板。 */
  readonly hoverTint?: boolean;
  readonly onPick: (index: number) => void;
  readonly onHover: (index: number) => void;
  /** 设置页预览用：面板按文档流排版，外观取这里的值。 */
  readonly preview?: Appearance;
}

/** 光标后的补全灰字。 */
export interface GhostProps {
  /** 本插件挂在输入框卡片里的元素属性名。 */
  readonly attribute: string;
  /** 该属性的值，用于定位所在的输入框卡片。 */
  readonly marker: string;
  /** 光标后显示的文字。 */
  readonly suffix: string;
  /** 建议的身份；变化时重新播放出现动画，沿着建议继续输入时保持不变。 */
  readonly identity: string;
}

/** 回溯时草稿切换的方向：更早、更新，或回到原来的草稿。 */
export type SwapDirection = "older" | "newer" | "restore";

/** 外观配置的订阅源。 */
export interface AppearanceStore {
  readonly get: () => Appearance;
  readonly subscribe: (listener: () => void) => () => void;
}

/** 浏览器侧的 `stashKit` 服务：共享外观、面板、补全灰字与草稿切换动画。 */
export interface StashKit {
  readonly appearance: AppearanceStore;
  readonly Panel: ComponentType<PanelProps>;
  readonly Ghost: ComponentType<GhostProps>;
  /** 程序改写草稿后调用，让新草稿按配置的动画出现。 */
  readonly swapDraft: (card: HTMLElement, direction: SwapDirection) => void;
}
