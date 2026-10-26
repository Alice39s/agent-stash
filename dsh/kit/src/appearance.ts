import * as v from "valibot";

/** 动画强度：`lively` 带位移与模糊，`subtle` 只做短淡入，`off` 不播放动画。 */
export const MOTIONS = ["lively", "subtle", "off"] as const;
/** 补全灰字的出现方式。 */
export const GHOST_EFFECTS = ["wave", "fade", "none"] as const;
/** 面板高亮在行之间移动的方式。 */
export const HIGHLIGHTS = ["glide", "instant"] as const;
/** 面板行高：`comfortable` 与宿主 `/` 菜单同为 34px，`compact` 为 28px。 */
export const DENSITIES = ["comfortable", "compact"] as const;

export type Motion = (typeof MOTIONS)[number];
export type GhostEffect = (typeof GHOST_EFFECTS)[number];
export type Highlight = (typeof HIGHLIGHTS)[number];
export type Density = (typeof DENSITIES)[number];

/** Agent Stash 系列面板共用的外观配置。 */
export interface Appearance {
  /** 面板背景是否模糊后面的对话内容。 */
  readonly glass: boolean;
  readonly motion: Motion;
  readonly ghost: GhostEffect;
  readonly highlight: Highlight;
  readonly density: Density;
  /** 面板底部是否显示按键提示。 */
  readonly hints: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = {
  glass: true,
  motion: "lively",
  ghost: "wave",
  highlight: "glide",
  density: "comfortable",
  hints: true,
};

const AppearanceSchema = v.object({
  glass: v.fallback(v.boolean(), DEFAULT_APPEARANCE.glass),
  motion: v.fallback(v.picklist(MOTIONS), DEFAULT_APPEARANCE.motion),
  ghost: v.fallback(v.picklist(GHOST_EFFECTS), DEFAULT_APPEARANCE.ghost),
  highlight: v.fallback(v.picklist(HIGHLIGHTS), DEFAULT_APPEARANCE.highlight),
  density: v.fallback(v.picklist(DENSITIES), DEFAULT_APPEARANCE.density),
  hints: v.fallback(v.boolean(), DEFAULT_APPEARANCE.hints),
});

/**
 * 读取设置服务给出的配置值。缺失或不认识的字段取默认值，
 * 页面在 Host 没有开放配置时也能按默认外观工作。
 */
export function parseAppearance(value: unknown): Appearance {
  const source = typeof value === "object" && value !== null ? value : {};
  return v.parse(AppearanceSchema, source);
}

/** 两份外观是否完全相同。 */
export function sameAppearance(left: Appearance, right: Appearance): boolean {
  return (
    left.glass === right.glass &&
    left.motion === right.motion &&
    left.ghost === right.ghost &&
    left.highlight === right.highlight &&
    left.density === right.density &&
    left.hints === right.hints
  );
}

/** `next` 相对 `base` 改动过的字段。 */
export function changedFields(base: Appearance, next: Appearance): (keyof Appearance)[] {
  const keys: (keyof Appearance)[] = ["glass", "motion", "ghost", "highlight", "density", "hints"];
  return keys.filter((key) => base[key] !== next[key]);
}

/** 动画关闭时灰字直接显示；其余情况按配置的出现方式。 */
export function ghostEffectOf(appearance: Appearance): GhostEffect {
  return appearance.motion === "off" ? "none" : appearance.ghost;
}
