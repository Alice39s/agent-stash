// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { click, mount, press } from "../testing.tsx";
import { driveResize, focus, measureText } from "./charts/testing.tsx";
import { columnWidths, DataTable, type DataColumn } from "./data-table.tsx";

interface Call {
  readonly id: string;
  readonly title: string;
  readonly model: string;
  readonly tokens: number;
}

const CALLS: readonly Call[] = [
  { id: "a", title: "Cut a local patch release", model: "deepseek-pro", tokens: 5200 },
  { id: "b", title: "Migrate the config format", model: "deepseek-flash", tokens: 900 },
];

const COLUMNS: readonly [DataColumn<Call>, ...DataColumn<Call>[]] = [
  { key: "title", header: "Item", cell: (row) => row.title, text: (row) => row.title },
  {
    key: "model",
    header: "Model",
    cell: (row) => row.model,
    text: (row) => row.model,
    optional: true,
  },
  {
    key: "tokens",
    header: "Input",
    cell: (row) => row.tokens.toLocaleString("en"),
    text: (row) => row.tokens.toLocaleString("en"),
    title: (row) => `${String(row.tokens)} input tokens`,
    numeric: true,
  },
];

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function render(node: ReactNode): Promise<HTMLElement> {
  const mounted = await mount(node);
  unmount = mounted.unmount;
  return mounted.container;
}

function headers(root: HTMLElement): (string | null)[] {
  return [...root.querySelectorAll("th")].map((th) => th.textContent);
}

function headerWidths(root: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    [...root.querySelectorAll<HTMLElement>("th")].map((th) => [
      th.getAttribute("data-column") ?? "",
      th.style.width,
    ]),
  );
}

describe("DataTable", () => {
  test("renders one row per record with the full value in each cell title", async () => {
    const root = await render(
      <DataTable
        label="Recent calls"
        columns={COLUMNS}
        rows={CALLS}
        rowKey={(row) => row.id}
        width={800}
      />,
    );
    expect(root.querySelector("table")?.getAttribute("aria-label")).toBe("Recent calls");
    expect(headers(root)).toEqual(["Item", "Model", "Input"]);
    const cells = [...root.querySelectorAll('[data-row="a"] td')];
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "Cut a local patch release",
      "deepseek-pro",
      "5,200",
    ]);
    expect(cells.map((cell) => cell.getAttribute("title"))).toEqual([
      "Cut a local patch release",
      "deepseek-pro",
      "5200 input tokens",
    ]);
    expect(cells[2]?.hasAttribute("data-numeric")).toBe(true);
    expect(root.querySelector("button")).toBeNull();
  });

  test("sizes the other columns to their longest value and leaves the rest to the name", async () => {
    // 每个字符 6px：deepseek-flash 84px，5,200 与 Input 30px，各加 16px 内边距。
    measureText();
    const root = await render(
      <DataTable
        label="Recent calls"
        columns={COLUMNS}
        rows={CALLS}
        rowKey={(row) => row.id}
        width={800}
      />,
    );
    expect(headerWidths(root)).toEqual({ title: "", model: "100px", tokens: "46px" });
  });

  test("caps a free-text column and keeps 30% of the table for the name", () => {
    expect(
      columnWidths(
        [
          { key: "model", text: 100 },
          { key: "result", text: 400, max: 240 },
        ],
        1000,
      ),
    ).toEqual(
      new Map([
        ["model", 116],
        ["result", 240],
      ]),
    );
    // 两列合计 800 超过 70%（700），按比例缩到 350，名称列留 300。
    expect(
      columnWidths(
        [
          { key: "a", text: 384 },
          { key: "b", text: 384 },
        ],
        1000,
      ),
    ).toEqual(
      new Map([
        ["a", 350],
        ["b", 350],
      ]),
    );
  });

  test("hides optional columns when the container is narrower than 620px", async () => {
    measureText();
    const driver = driveResize();
    const root = await render(
      <DataTable label="Recent calls" columns={COLUMNS} rows={CALLS} rowKey={(row) => row.id} />,
    );
    await driver.resize(800);
    expect(headers(root)).toEqual(["Item", "Model", "Input"]);
    await driver.resize(480);
    expect(headers(root)).toEqual(["Item", "Input"]);
    expect(headerWidths(root)).toEqual({ title: "", tokens: "46px" });
    expect(root.querySelectorAll('[data-row="a"] td')).toHaveLength(2);
  });

  test("opens a row from a click anywhere on it or from its name button", async () => {
    const opened: string[] = [];
    const root = await render(
      <DataTable
        label="Recent calls"
        columns={COLUMNS}
        rows={CALLS}
        rowKey={(row) => row.id}
        onOpen={(row) => opened.push(row.id)}
        width={800}
      />,
    );
    const name = root.querySelector<HTMLButtonElement>('[data-row="b"] button');
    expect(name?.textContent).toBe("Migrate the config format");
    expect(root.querySelector('[data-row="b"]')?.hasAttribute("data-open")).toBe(true);
    await click(root.querySelector<HTMLElement>('[data-row="a"] td[data-column="tokens"]'));
    await focus(name);
    expect(document.activeElement).toBe(name);
    await click(name);
    expect(opened).toEqual(["a", "b"]);
    await press(name, "Tab");
    expect(opened).toEqual(["a", "b"]);
  });
});
