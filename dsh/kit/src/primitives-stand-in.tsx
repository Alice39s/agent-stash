import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * 组件测试里替代 DSH 模块表的 `@deepseek-ai/dsh-client-ui-primitives`：
 * 与宿主组件同样的属性与无障碍语义，不带宿主样式。
 */
export function Switch(props: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  title?: string | undefined;
}): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      title={props.title}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
    />
  );
}

export function Button({
  variant: _variant,
  size: _size,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  size?: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <button type="button" {...rest}>
      {children}
    </button>
  );
}

export function SegmentedControl<Value extends string>(props: {
  id: string;
  value: Value;
  options: readonly { value: Value; label: string; disabled?: boolean }[];
  onChange: (next: Value) => void;
  label: string;
  disabled?: boolean;
}): ReactNode {
  return (
    <div role="tablist" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          key={option.value}
          id={`${props.id}-${option.value}`}
          type="button"
          role="tab"
          aria-selected={option.value === props.value}
          disabled={props.disabled === true || option.disabled === true}
          onClick={() => {
            if (option.value !== props.value) props.onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsForm(props: {
  labels: {
    unavailable: string;
    readOnly: string;
    saveFailed: string;
    save: string;
    saving: string;
  };
  state: {
    available: boolean;
    writable: boolean;
    dirty: boolean;
    invalid: boolean;
    saving: boolean;
    failed: boolean;
  };
  onSave: () => void;
  onDiscard: () => void;
  children: ReactNode;
}): ReactNode {
  const { state, labels } = props;
  if (!state.available) return <p role="status">{labels.unavailable}</p>;
  return (
    <div>
      {!state.writable && <p role="status">{labels.readOnly}</p>}
      {props.children}
      {state.failed && <p role="status">{labels.saveFailed}</p>}
      <button
        type="button"
        disabled={!state.dirty || state.invalid || state.saving}
        onClick={props.onSave}
      >
        {state.saving ? labels.saving : labels.save}
      </button>
    </div>
  );
}

export function IconListPenOutlineRegular(props: { size?: number }): ReactNode {
  return <svg aria-hidden="true" data-icon="list-pen" width={props.size} height={props.size} />;
}
