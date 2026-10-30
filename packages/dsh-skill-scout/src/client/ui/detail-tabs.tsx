/**
 * 详情的内容 Tab（design 4.5）：照宿主 TaskManagerPage 的 `.detailTabsBar`、`.detailTab` 画成下划线条，
 * Tab 之间 36px，选中的 Tab 用强调色与 2px 下划线；主区域 44px 高，会话视图 37px。
 * 太窄时 Tab 条横向滚动、不显示滚动条；尾部放作用于当前 Tab 的图标按钮。
 * 每个 Tab 的 id 是 `<idBase>-<value>`，面板 id 是 `<idBase>-panel`。
 */
import type { KeyboardEvent, ReactNode } from "react";
import styles from "./detail-tabs.module.css";

export interface DetailTabItem<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

export interface DetailTabsProps<Value extends string> {
  readonly size: "page" | "pane";
  readonly items: readonly DetailTabItem<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  readonly label: string;
  readonly idBase: string;
  readonly actions?: ReactNode;
}

export function DetailTabs<Value extends string>({
  size,
  items,
  value,
  onChange,
  label,
  idBase,
  actions,
}: DetailTabsProps<Value>): ReactNode {
  /** 左右键在 Tab 之间移动并选中，Home、End 到两端。 */
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const target =
      event.key === "ArrowRight"
        ? (index + 1) % items.length
        : event.key === "ArrowLeft"
          ? (index + items.length - 1) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : null;
    const next = target === null ? undefined : items[target];
    if (next === undefined) return;
    event.preventDefault();
    onChange(next.value);
    document.getElementById(`${idBase}-${next.value}`)?.focus();
  };
  return (
    <div className={styles.bar} data-size={size}>
      <div className={styles.tabs} role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.value}
            id={`${idBase}-${item.value}`}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={item.value === value}
            aria-controls={`${idBase}-panel`}
            tabIndex={item.value === value ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
