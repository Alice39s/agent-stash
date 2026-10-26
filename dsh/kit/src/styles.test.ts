import { describe, expect, test } from "vitest";
import { EASE_OUT, kitCss } from "./styles.ts";

const css = kitCss("kit");

describe("kitCss", () => {
  test("defines no custom easing variable that rules outside the panel cannot see", () => {
    expect(css).not.toMatch(/var\(--dsh-stash-ease/u);
  });

  test("slides the recalled draft in the composer with the shared curve", () => {
    for (const direction of ["older", "newer", "restore"]) {
      expect(css).toContain(
        `[contenteditable="true"][data-kit-swap="${direction}"] {\n  animation: kit-swap-${direction} 160ms ${EASE_OUT};`,
      );
    }
  });

  test("keeps the reduced-motion variant free of movement", () => {
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).not.toMatch(/translate|blur\(/u);
    expect(reduced).toContain("[data-kit-swap] {\n    animation: none;");
  });

  test("paints an opaque material and adds only the backdrop blur in the frosted state", () => {
    expect(css).toContain(
      "  background:\n    linear-gradient(var(--dsw-alias-menu-group-header-fill), var(--dsw-alias-menu-group-header-fill)),\n    var(--dsw-alias-bg-base);",
    );
    expect(css).toContain(
      ".kit-panel[data-glass]::before {\n  backdrop-filter: var(--dsw-menu-backdrop-filter);\n}",
    );
    expect(css).not.toContain("--dsw-menu-surface-fill");
  });
});
