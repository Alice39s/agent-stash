/// <reference types="mdast-util-to-hast" />
import type { Nodes, Root, TableCell } from "mdast";
import { visit } from "unist-util-visit";

/** 仍算短列的最宽单元格：8 个汉字或 16 个拉丁字符。 */
const LABEL_WIDTH = 16;
const WIDE = /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u;

function textOf(node: Nodes): string {
  if ("value" in node) return node.value;
  return "children" in node ? node.children.map((child) => textOf(child)).join("") : "";
}

function widthOf(node: Nodes): number {
  let units = 0;
  for (const char of textOf(node)) units += WIDE.test(char) ? 2 : 1;
  return units;
}

function keepOnOneLine(cell: TableCell): void {
  cell.data = {
    ...cell.data,
    hProperties: { ...cell.data?.hProperties, className: ["whitespace-nowrap"] },
  };
}

/**
 * 表头与短列不换行。自动表格布局把剩余宽度分给文字最长的列，其余列缩到最窄的词；中文在任意两字之间都能断行，
 * 两个字的表头会被挤成一字一行。
 */
export function remarkLabelColumns() {
  return (tree: Root) => {
    visit(tree, "table", (table) => {
      const [head, ...body] = table.children;
      if (!head) return;
      head.children.forEach(keepOnOneLine);
      head.children.forEach((_, column) => {
        const cells = body.flatMap((row) => row.children[column] ?? []);
        if (cells.every((cell) => widthOf(cell) <= LABEL_WIDTH)) cells.forEach(keepOnOneLine);
      });
    });
  };
}
