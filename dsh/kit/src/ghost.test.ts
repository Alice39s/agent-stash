import { describe, expect, test } from "vitest";
import { cssString, ghostCss } from "./ghost.tsx";

describe("cssString", () => {
  test("escapes quotes, backslashes, and line breaks", () => {
    expect(cssString('say "hi" \\ there\nnext')).toBe('"say \\"hi\\" \\\\ there\\a next"');
  });

  test("keeps CJK text and emoji as they are", () => {
    expect(cssString("这个项目的缓存命中率 🚀")).toBe('"这个项目的缓存命中率 🚀"');
  });

  test("cannot close the string or the rule", () => {
    const literal = cssString('"; } body { display: none } p::after { content: "');
    expect(literal.slice(1, -1)).not.toMatch(/(^|[^\\])"/u);
  });
});

const props = { attribute: "data-dsh-autosuggest", marker: "r1", suffix: "这个项目" };
/** 样式表里的第一条规则，也就是灰字本身的规则。 */
const rule = (css: string) => css.slice(0, css.indexOf("}") + 1);

describe("ghostCss", () => {
  test("appends the suffix after the last paragraph of the marked composer only", () => {
    expect(rule(ghostCss("kit", props, "none", "a"))).toBe(
      `[data-composer-card]:has([data-dsh-autosuggest="r1"]) [contenteditable="true"]:not([data-composer-composing]) > p:last-child::after {
  content: "这个项目";
  color: var(--dsw-alias-label-caption);
  pointer-events: none;
}`,
    );
  });

  test("sweeps a fading mask across the wave and names the keyframes by phase", () => {
    const css = rule(ghostCss("kit", props, "wave", "b"));
    expect(css).toContain("mask-image: linear-gradient(90deg, black 0 40%, transparent 60% 100%);");
    expect(css).toContain("animation: kit-ghost-wave-b 280ms cubic-bezier(0.23, 1, 0.32, 1) both;");
  });

  test("fades the whole suffix in for the fade effect", () => {
    const css = rule(ghostCss("kit", props, "fade", "a"));
    expect(css).toContain("animation: kit-ghost-fade-a 180ms");
    expect(css).not.toContain("mask-image");
  });

  test("shows the suffix at once under reduced motion", () => {
    expect(ghostCss("kit", props, "wave", "a")).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*mask-image: none;[\s\S]*animation-duration: 1ms;/u,
    );
  });
});
