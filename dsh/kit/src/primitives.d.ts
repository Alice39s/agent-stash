/** DSH 浏览器模块表提供的 UI 基础组件里 Agent Stash 插件用到的部分。 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type {
    ButtonHTMLAttributes,
    InputHTMLAttributes,
    ReactElement,
    ReactNode,
    Ref,
  } from "react";

  /** 宿主图标：`size` 为边长（像素）。 */
  type Icon = (props: { size?: number }) => ReactNode;

  /** 列表加笔的线性图标。 */
  export const IconListPenOutlineRegular: Icon;
  export const IconSparkleRegular: Icon;
  export const IconLoadingOutlineRegular: Icon;
  export const IconStopFillRegular: Icon;
  export const IconRefreshOutlineRegular: Icon;
  export const IconWarningOutlineRegular: Icon;
  export const IconCheckOutlineRegular: Icon;
  export const IconCloseOutlineRegular: Icon;
  export const IconSettingsOutlineRegular: Icon;
  export const IconChevronUpOutlineRegular: Icon;
  export const IconChevronDownOutlineRegular: Icon;
  export const IconTrashOutlineRegular: Icon;
  export const IconPlusOutlineRegular: Icon;
  export const IconSkillOutlineRegular: Icon;
  /** 增强提示词的预设图标可选的其余图标。 */
  export const IconEnhanceOutlineRegular: Icon;
  export const IconFlatListOutlineRegular: Icon;
  export const IconChecklistOutlineRegular: Icon;
  export const IconCompactOutlineRegular: Icon;
  export const IconWrapLinesOutlineRegular: Icon;
  export const IconEditOutlineRegular: Icon;
  export const IconMicrophoneOutlineRegular: Icon;
  export const IconThinkOutlineRegular: Icon;
  export const IconLightOutlineRegular: Icon;
  export const IconGoalOutlineRegular: Icon;
  export const IconPlanOutlineRegular: Icon;
  export const IconQuestionOutlineRegular: Icon;
  export const IconInfoOutlineRegular: Icon;
  export const IconSearchOutlineRegular: Icon;
  export const IconInspectOutlineRegular: Icon;
  export const IconCompareSplitOutlineRegular: Icon;
  export const IconCodeOutlineRegular: Icon;
  export const IconApiOutlineRegular: Icon;
  export const IconDatabaseOutlineRegular: Icon;
  export const IconBranchOutlineRegular: Icon;
  export const IconWarningTriangleOutlineRegular: Icon;
  export const IconShieldOutlineRegular: Icon;
  export const IconGaugeOutlineRegular: Icon;
  export const IconClockOutlineRegular: Icon;
  export const IconLinkOutlineRegular: Icon;
  export const IconGlobeOutlineRegular: Icon;
  export const IconUserOutlineRegular: Icon;
  export const IconUsersOutlineRegular: Icon;
  export const IconAgentPresetOutlineRegular: Icon;
  export const IconPersonalizationOutlineRegular: Icon;
  export const IconDeliverDocRegular: Icon;
  export const IconFolderOpenOutlineRegular: Icon;
  export const IconPaperPlaneOutlineRegular: Icon;

  /** 悬停或聚焦锚点时显示的提示；`shortcutKeys` 以键帽显示在文字后。 */
  export function Tooltip(props: {
    label: string | (() => string);
    shortcutKeys?: readonly string[] | undefined;
    side?: "top" | "bottom" | "left" | "right";
    align?: "center" | "end";
    delayMs?: number;
    disabled?: boolean;
    portal?: boolean;
    maxWidth?: number;
    children: ReactElement;
  }): ReactNode;

  /** 菜单里的一行；`shortcut` 以键帽显示在行尾。 */
  export interface MenuItem {
    id: string;
    label: ReactNode;
    disabled?: boolean;
    shortcut?: { keys: readonly string[]; aria?: string | undefined };
    icon?: ReactNode;
    danger?: boolean;
  }

  /** 菜单里的分组标题。 */
  export interface MenuLabel {
    type: "label";
    id: string;
    text: string;
  }

  /** 菜单里的分隔线。 */
  export interface MenuSeparator {
    type: "separator";
    id: string;
  }

  export type MenuEntry = MenuItem | MenuSeparator | MenuLabel;

  /**
   * 锚定在 `anchor` 上的下拉菜单，材质、行高与宿主菜单一致。打开时方向键在行间移动，
   * Esc 关闭并把焦点还给锚点；`footer` 固定在可滚动区域下方。
   */
  export function Menu(props: {
    open: boolean;
    anchor: ReactNode;
    items?: readonly MenuEntry[];
    children?: ReactNode;
    footer?: readonly MenuEntry[];
    onSelect?: (id: string) => void;
    onClose: () => void;
    align?: "start" | "end";
    side?: "bottom" | "top" | "right";
    portal?: boolean;
    autoFocus?: boolean;
    className?: string | undefined;
    listClassName?: string | undefined;
  }): ReactNode;

  /** 由组件渲染的一行菜单项，放在 `Menu` 的 `children` 里。 */
  export function MenuItemButton(props: {
    children: ReactNode;
    shortcut?: MenuItem["shortcut"];
    icon?: ReactNode;
    disabled?: boolean;
    onSelect: () => void;
  }): ReactNode;

  /** 打开着的菜单与模态对话框的选择器；快捷键服务据它判断当前的模态层。 */
  export const modalSelector: string;

  /** 进行中的文字：一道高光从左到右扫过，减少动态效果时静止。 */
  export function TextShimmer(props: { children: ReactNode; active?: boolean }): ReactNode;

  /** 宿主样式的单行输入框。 */
  export function Input(
    props: InputHTMLAttributes<HTMLInputElement> & {
      icon?: ReactNode;
      className?: string;
      ref?: Ref<HTMLInputElement>;
    },
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

  /** 等宽分段选择，选中块带滑动指示；每段的 id 为 `<id>-<value>`。 */
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

  /** 插件页配置页的表单外框：只读提示、插件自己的控件与写入全部暂存改动的保存按钮。 */
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
}
