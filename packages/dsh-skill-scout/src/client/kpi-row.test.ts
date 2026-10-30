/**
 * KPI 行的版式（design.md 4.10、4.11）：happy-dom 不排版，这里用打包时同一个解析器（lightningcss）读样式表，
 * 确认同排磁贴撑满同一行高、底边对齐，磁贴里的标签、数值、上下文从顶部排起。
 */
import { readFileSync } from "node:fs";
import { transform, type Declaration } from "lightningcss";
import { describe, expect, test } from "vitest";

const CLIENT = new URL("./", import.meta.url);

/** 选择器只有一个类 `.name` 的全部规则里的声明，含 @container 里的。 */
function declarationsOf(file: string, name: string): Declaration[] {
  const found: Declaration[] = [];
  transform({
    filename: file,
    code: readFileSync(new URL(file, CLIENT)),
    errorRecovery: false,
    visitor: {
      Rule: {
        style(rule) {
          const own = rule.value.selectors.some(
            (selector) =>
              selector.length === 1 && selector[0]?.type === "class" && selector[0].name === name,
          );
          if (own) found.push(...(rule.value.declarations?.declarations ?? []));
        },
      },
    },
  });
  return found;
}

function valuesOf(declarations: readonly Declaration[], property: string): unknown[] {
  return declarations.flatMap((declaration) =>
    declaration.property === property ? [declaration.value] : [],
  );
}

describe("KPI row", () => {
  const row = declarationsOf("stats.module.css", "kpis");
  const tile = declarationsOf("ui/kpi-tile.module.css", "tile");

  test("stretches the tiles of a row to one height so their bottoms line up", () => {
    expect(valuesOf(row, "display")).toEqual([
      { type: "pair", inside: { type: "grid" }, outside: "block", isListItem: false },
    ]);
    expect(valuesOf(row, "align-items")).toEqual([{ type: "stretch" }]);
    // 磁贴不自己收缩到内容高度，也不限高。
    for (const property of ["align-self", "height", "max-height"]) {
      expect(valuesOf(tile, property)).toEqual([]);
    }
  });

  test("stacks the label, value, and context from the top of each tile", () => {
    expect(valuesOf(tile, "flex-direction")).toEqual(["column"]);
    expect(valuesOf(tile, "justify-content")).toEqual([
      { type: "content-position", overflow: null, value: "flex-start" },
    ]);
  });
});
