/**
 * 记录表（design.md 4.7）：几何照宿主 `TrajectoryTable.module.css` 的 `.table`。第一列是名称列，从不隐藏；
 * 其他列按这一列里最长的值（含表头）的实测宽度定宽，剩下的宽度给名称列，名称列至少占 30%。
 * 数字列右对齐；容器窄于 620px 时隐藏标为可选的列。传了 `onOpen` 时名称是一个按钮，整行可点，
 * 悬停整行铺底色，按钮获得焦点时整行显示内嵌的着重色焦点环。
 */
import type { ReactNode } from "react";
import { useElementWidth, useTextWidths } from "./charts/primitives.tsx";
import styles from "./data-table.module.css";

/** 表格的一列。 */
export interface DataColumn<R> {
  readonly key: string;
  readonly header: string;
  /** 单元格内容。 */
  readonly cell: (row: R) => ReactNode;
  /** 单元格显示的文字，量列宽用。 */
  readonly text: (row: R) => string;
  /** 放进 `title` 的完整值；不传时与 `text` 相同。 */
  readonly title?: (row: R) => string;
  /** 数字列：右对齐，等宽数字。 */
  readonly numeric?: boolean;
  /** 窄容器里隐藏。 */
  readonly optional?: boolean;
  /** 自由文字列的最大宽度（像素），更长的值省略。 */
  readonly maxWidth?: number;
}

export interface DataTableProps<R> {
  /** 表格名称。 */
  readonly label: string;
  /** 第一列是名称列。 */
  readonly columns: readonly [DataColumn<R>, ...DataColumn<R>[]];
  readonly rows: readonly R[];
  readonly rowKey: (row: R) => string;
  /** 打开一行代表的条目。 */
  readonly onOpen?: (row: R) => void;
  /** 固定宽度；不传时跟随容器宽度。 */
  readonly width?: number;
}

/** 宿主表格的紧凑宽度。 */
const COMPACT_BELOW = 620;
/** 单元格左右内边距之和。 */
const CELL_PADDING = 16;
/** 名称列至少占的比例。 */
const NAME_SHARE = 0.3;

/**
 * 名称列以外各列的宽度：实测的最长值加内边距，不超过列自己的上限；
 * 合计超过表格宽度的 70% 时按比例缩小，把至少 30% 留给名称列。
 */
export function columnWidths(
  measured: readonly { readonly key: string; readonly text: number; readonly max?: number }[],
  tableWidth: number,
): ReadonlyMap<string, number> {
  const natural = measured.map((column) => ({
    key: column.key,
    width: Math.min(Math.ceil(column.text) + CELL_PADDING, column.max ?? Number.POSITIVE_INFINITY),
  }));
  const total = natural.reduce((sum, column) => sum + column.width, 0);
  const room = tableWidth * (1 - NAME_SHARE);
  const scale = total > room ? room / total : 1;
  return new Map(natural.map((column) => [column.key, Math.floor(column.width * scale)]));
}

export function DataTable<R>({
  label,
  columns,
  rows,
  rowKey,
  onOpen,
  width: fixedWidth,
}: DataTableProps<R>): ReactNode {
  const [ref, width] = useElementWidth<HTMLDivElement>(fixedWidth);
  const compact = width > 0 && width < COMPACT_BELOW;
  const [name, ...rest] = columns;
  const others = rest.filter((column) => !(compact && column.optional === true));
  const shown = [name, ...others];
  const cells = others.map((column) => [...new Set(rows.map(column.text))]);
  const [measureRef, measured] = useTextWidths(
    JSON.stringify([others.map((column) => column.header), cells]),
  );
  // 量出文字宽度、也知道表格宽度以后才定列宽；在那之前按浏览器的自动列宽排。
  const widths =
    measured.size === 0 || width === 0
      ? new Map<string, number>()
      : columnWidths(
          others.flatMap((column) => {
            // 量不到宽度（还没排版）的列交给浏览器自动定宽。
            const text = measured.get(column.key);
            if (text === undefined || text === 0) return [];
            return [
              {
                key: column.key,
                text,
                ...(column.maxWidth === undefined ? {} : { max: column.maxWidth }),
              },
            ];
          }),
          width,
        );

  return (
    <div ref={ref} className={styles.root}>
      {/* 量列宽用的隐藏文字：表头与单元格各用自己的字体；表格可见（有宽度）时才挂上去量。 */}
      {width > 0 && (
        <svg ref={measureRef} className={styles.measure} width={0} height={0} aria-hidden="true">
          {others.map((column, index) => (
            <g key={column.key} data-measure={column.key}>
              <text className={styles.measureHead}>{column.header}</text>
              {(cells[index] ?? []).map((text) => (
                <text key={text} className={styles.measureCell}>
                  {text}
                </text>
              ))}
            </g>
          ))}
        </svg>
      )}
      <table className={styles.table} aria-label={label}>
        <thead>
          <tr>
            {shown.map((column) => {
              const columnWidth = widths.get(column.key);
              return (
                <th
                  key={column.key}
                  scope="col"
                  data-column={column.key}
                  data-numeric={column.numeric === true || undefined}
                  style={columnWidth === undefined ? undefined : { width: columnWidth }}
                >
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              data-row={rowKey(row)}
              data-open={onOpen === undefined ? undefined : ""}
              onClick={onOpen === undefined ? undefined : () => onOpen(row)}
            >
              {shown.map((column, index) => (
                <td
                  key={column.key}
                  data-column={column.key}
                  data-numeric={column.numeric === true || undefined}
                  title={(column.title ?? column.text)(row)}
                >
                  {index === 0 && onOpen !== undefined ? (
                    <button type="button" className={styles.open}>
                      {column.cell(row)}
                    </button>
                  ) : (
                    column.cell(row)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
