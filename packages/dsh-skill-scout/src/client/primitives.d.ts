/** DSH 0.2.1-rc.3 起浏览器模块表提供的 UI 基础组件里本插件用到的部分。 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type { ButtonHTMLAttributes, CSSProperties, ReactNode, RefObject } from "react";

  /** 线性图标，`size` 为边长（像素）。 */
  export type Icon = (props: { size?: number; className?: string }) => ReactNode;
  export const IconSkillOutlineRegular: Icon;
  export const IconCheckOutlineRegular: Icon;
  export const IconCloseOutlineRegular: Icon;
  export const IconRefreshOutlineRegular: Icon;
  export const IconWarningOutlineRegular: Icon;
  export const IconEditOutlineRegular: Icon;
  export const IconChevronRightOutlineRegular: Icon;

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
