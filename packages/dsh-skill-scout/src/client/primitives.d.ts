/** DSH 0.2.1-rc.3 起浏览器模块表提供的 UI 基础组件里本插件用到的部分。 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type {
    ButtonHTMLAttributes,
    CSSProperties,
    HTMLAttributes,
    ReactElement,
    ReactNode,
    RefObject,
  } from "react";

  /** 线性图标，`size` 为边长（像素）。 */
  export type Icon = (props: { size?: number; className?: string }) => ReactNode;
  export const IconSkillOutlineRegular: Icon;
  export const IconCheckOutlineRegular: Icon;
  export const IconCloseOutlineRegular: Icon;
  export const IconRefreshOutlineRegular: Icon;
  export const IconWarningOutlineRegular: Icon;
  export const IconEditOutlineRegular: Icon;
  export const IconChevronRightOutlineRegular: Icon;
  export const IconChevronLeftOutlineRegular: Icon;
  export const IconChevronDownOutlineRegular: Icon;
  export const IconEllipsisOutlineRegular: Icon;
  export const IconSearchOutlineRegular: Icon;

  /** 状态点：绿色完成、琥珀色待处理、灰色进行中（转圈）、红色出错、中性灰空闲；`step` 外观是步骤圆圈。 */
  export type StateDotState = "done" | "warning" | "ongoing" | "error" | "idle";
  export function StateDot(props: {
    state: StateDotState;
    size?: number | undefined;
    className?: string | undefined;
    appearance?: "dot" | "step";
  }): ReactNode;

  /** 页面分区的一个 Tab；`panelId` 指向调用方自己渲染的面板。 */
  export interface SegmentedTab<Value extends string = string> {
    value: Value;
    label: ReactNode;
    id: string;
    panelId: string;
  }
  /** 等宽分区 Tab，带滑动的选中指示；只有选中的 Tab 可被 Tab 键聚焦。 */
  export function SegmentedTabs<Value extends string>(props: {
    items: readonly [SegmentedTab<Value>, ...SegmentedTab<Value>[]];
    value: Value;
    onChange: (value: Value) => void;
    label: string;
    className?: string | undefined;
  }): ReactNode;

  /** 菜单的一行。 */
  export interface MenuItem {
    id: string;
    label: ReactNode;
    disabled?: boolean;
    shortcut?: { keys: readonly string[]; aria?: string | undefined };
    icon?: ReactNode;
    danger?: boolean;
  }
  export interface MenuSeparator {
    type: "separator";
    id: string;
  }
  export interface MenuLabel {
    type: "label";
    id: string;
    text: string;
  }
  export type MenuEntry = MenuItem | MenuSeparator | MenuLabel;
  /** 锚点下方的菜单；`selectedId` 的行按 `selection` 标出（默认行尾打勾）。 */
  export function Menu(props: {
    open: boolean;
    anchor: ReactNode;
    items?: readonly MenuEntry[];
    children?: ReactNode;
    footer?: readonly MenuEntry[];
    selectedId?: string | undefined;
    onSelect?: (id: string) => void;
    onClose: () => void;
    align?: "start" | "end";
    side?: "bottom" | "top" | "right";
    portal?: boolean;
    autoFocus?: boolean;
    selection?: "check" | "fill";
    className?: string | undefined;
    listClassName?: string | undefined;
  }): ReactNode;
  /** 放在 `Menu` children 里的一行。 */
  export function MenuItemButton(props: {
    children: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
    danger?: boolean;
    separatorBefore?: boolean;
    onSelect: () => void;
  }): ReactNode;

  /** 悬停或聚焦时在锚点旁显示的提示。 */
  export function Tooltip(props: {
    label: string | (() => string);
    side?: "right" | "bottom" | "top";
    align?: "center" | "end";
    portal?: boolean;
    disabled?: boolean;
    children: ReactElement;
  }): ReactNode;

  /** 带可见标签的原生复选框。 */
  export function Checkbox(props: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    disabled?: boolean;
    title?: string | undefined;
    className?: string | undefined;
  }): ReactNode;

  /** 只读的胶囊标签。 */
  export function Tag(props: {
    tone?: "outline" | "solid" | "neutral" | "quiet" | "success" | "info" | "warning" | "danger";
    className?: string | undefined;
    children?: ReactNode;
  }): ReactNode;

  /** 单行文件路径：目录变淡，文件名始终可见，悬停显示完整路径。 */
  export function PathLabel(
    props: { path: string } & Omit<HTMLAttributes<HTMLSpanElement>, "children" | "title">,
  ): ReactNode;

  /** 两态开关；完全受控，`label` 是无障碍名称。 */
  export function Switch(props: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    disabled?: boolean;
    title?: string | undefined;
    className?: string | undefined;
  }): ReactNode;

  /** 宿主主题的按钮：`sm` 为 28px 高、8px 圆角。 */
  export function Button(
    props: ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: "primary" | "ghost" | "outline" | "toolbar";
      size?: "md" | "sm";
      children?: ReactNode;
    },
  ): ReactNode;

  /** 分段选择的一段。 */
  export interface SegmentedControlOption<Value extends string> {
    value: Value;
    label: string;
    disabled?: boolean;
    title?: string;
  }

  /** 等宽分段选择；每段的 id 为 `<id>-<value>`。 */
  export function SegmentedControl<Value extends string>(props: {
    id: string;
    value: Value;
    options: readonly SegmentedControlOption<Value>[];
    onChange: (next: Value) => void;
    label: string;
    disabled?: boolean;
    className?: string | undefined;
  }): ReactNode;

  /** 设置表单外框需要的状态。 */
  export interface SettingsFormShell {
    available: boolean;
    writable: boolean;
    dirty: boolean;
    invalid: boolean;
    saving: boolean;
    failed: boolean;
  }

  /** 插件页配置页的表单外框：只读提示、插件自己的控件与保存按钮。 */
  export function SettingsForm(props: {
    labels: {
      unavailable: string;
      readOnly: string;
      saveFailed: string;
      save: string;
      saving: string;
    };
    state: SettingsFormShell;
    onSave: () => void;
    onDiscard: () => void;
    children: ReactNode;
  }): ReactNode;

  /** 代码卡片工具栏的文案。 */
  export interface CodeToolbarLabels {
    codeLabel: string;
    wrapLabel: string;
    unwrapLabel: string;
  }

  /** Markdown 渲染；原始 HTML 渲染成文本。 */
  export function MarkdownText(props: {
    text: string;
    labels: {
      code: { copyLabel: string; copiedLabel: string; toolbarLabels?: CodeToolbarLabels };
      footnotes: string;
    };
  }): ReactNode;

  /** 一个文件的前后文本；`oldText` 为 null 表示新建。 */
  export interface DiffHunk {
    path: string;
    oldText: string | null;
    newText: string;
  }

  /** 统一 diff 视图，超过 `maxLines` 时折叠。 */
  export function DiffBlock(props: {
    diffs: DiffHunk[];
    labels: CodeToolbarLabels & {
      copy: string;
      copied: string;
      collapseAria: string;
      expandAria: (hidden: number) => string;
      collapse: string;
      expand: (hidden: number) => string;
    };
    maxLines?: number;
  }): ReactNode;

  /** 进行中的文字：`active` 时文字上有一道扫光，减少动态效果时静止。 */
  export function TextShimmer(props: { children: ReactNode; active?: boolean }): ReactNode;

  /** 浮层相对锚点的 fixed 坐标；首次测量前为 null。 */
  export function useAnchoredPosition(options: {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    panelRef: RefObject<HTMLElement | null>;
    side?: "top" | "bottom";
    gap: number;
    margin: number;
  }): CSSProperties | null;

  /** 指针按在浮层与触发器之外时关闭浮层。 */
  export function useDismissOnOutsidePointer(
    root: RefObject<HTMLElement | null>,
    open: boolean,
    setOpen: (open: boolean) => void,
    portal?: RefObject<HTMLElement | null>,
  ): void;
}
