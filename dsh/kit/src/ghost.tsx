import { useState, type ReactNode } from "react";
import { ghostEffectOf, type GhostEffect } from "./appearance.ts";
import type { AppearanceStore, GhostProps } from "./service.ts";
import { useAppearance } from "./store.ts";
import { EASE_OUT } from "./styles.ts";

/** 把任意文本写成 CSS 字符串字面量；换行与控制字符用十六进制转义。 */
export function cssString(text: string): string {
  let body = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (char === '"' || char === "\\") body += `\\${char}`;
    else if (code < 0x20 || code === 0x7f) body += `\\${code.toString(16)} `;
    else body += char;
  }
  return `"${body}"`;
}

/** 灰字出现动画的关键帧，`a`、`b` 两份内容相同，换名字才能让新建议重新播放。 */
export function ghostKeyframes(k: string): string {
  return ["a", "b"]
    .map(
      (phase) => `
@keyframes ${k}-ghost-wave-${phase} {
  from { opacity: 0.4; filter: blur(1.5px); mask-position: 100% 0; }
  to { mask-position: 0 0; }
}
@keyframes ${k}-ghost-fade-${phase} {
  from { opacity: 0; filter: blur(2px); }
}`,
    )
    .join("");
}

/**
 * 补全灰字的样式：接在指定输入框最后一段文字之后，用说明文字的颜色显示，输入法组字期间隐藏。
 * `wave` 用一道渐隐遮罩从左向右扫过并由模糊变清晰，`fade` 整段淡入。
 */
export function ghostCss(
  k: string,
  props: Pick<GhostProps, "attribute" | "marker" | "suffix">,
  effect: GhostEffect,
  phase: "a" | "b",
): string {
  const card = `[data-composer-card]:has([${props.attribute}=${cssString(props.marker)}])`;
  const paragraph = '[contenteditable="true"]:not([data-composer-composing]) > p:last-child';
  const motion =
    effect === "wave"
      ? `
  mask-image: linear-gradient(90deg, black 0 40%, transparent 60% 100%);
  mask-size: 250% 100%;
  mask-position: 0 0;
  animation: ${k}-ghost-wave-${phase} 280ms ${EASE_OUT} both;`
      : effect === "fade"
        ? `
  animation: ${k}-ghost-fade-${phase} 180ms ${EASE_OUT} both;`
        : "";
  return `${card} ${paragraph}::after {
  content: ${cssString(props.suffix)};
  color: var(--dsw-alias-label-caption);
  pointer-events: none;${motion}
}
@media (prefers-reduced-motion: reduce) {
  ${card} ${paragraph}::after {
    mask-image: none;
    filter: none;
    animation-duration: 1ms;
  }
}`;
}

/** 生成绑定外观订阅源的灰字组件：建议身份变化时重新播放出现动画。 */
export function createGhost(k: string, store: AppearanceStore): (props: GhostProps) => ReactNode {
  return function Ghost(props: GhostProps): ReactNode {
    const appearance = useAppearance(store);
    const [shown, setShown] = useState({ identity: props.identity, phase: "a" as "a" | "b" });
    if (shown.identity !== props.identity) {
      setShown({ identity: props.identity, phase: shown.phase === "a" ? "b" : "a" });
    }
    return <style>{ghostCss(k, props, ghostEffectOf(appearance), shown.phase)}</style>;
  };
}
