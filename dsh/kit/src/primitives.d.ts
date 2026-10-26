/** DSH 浏览器模块表提供的 UI 基础组件里框架用到的部分。 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type { ButtonHTMLAttributes, ReactNode } from "react";

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
