import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode } from "react";

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

function icon(name: string): (props: { size?: number }) => ReactNode {
  return function Icon(props) {
    return <svg aria-hidden="true" data-icon={name} width={props.size} height={props.size} />;
  };
}

export const IconListPenOutlineRegular = icon("list-pen");
export const IconSparkleRegular = icon("sparkle");
export const IconLoadingOutlineRegular = icon("loading");
export const IconStopFillRegular = icon("stop");
export const IconRefreshOutlineRegular = icon("refresh");
export const IconWarningOutlineRegular = icon("warning");
export const IconCheckOutlineRegular = icon("check");
export const IconCloseOutlineRegular = icon("close");
export const IconSettingsOutlineRegular = icon("settings");
export const IconChevronUpOutlineRegular = icon("chevron-up");
export const IconChevronDownOutlineRegular = icon("chevron-down");
export const IconTrashOutlineRegular = icon("trash");
export const IconPlusOutlineRegular = icon("plus");

/** 提示文字与按键放在锚点外层的 `data-tooltip` 与 `data-tooltip-keys` 上，测试据此断言。 */
export function Tooltip(props: {
  label: string | (() => string);
  shortcutKeys?: readonly string[] | undefined;
  disabled?: boolean;
  children: ReactElement;
}): ReactNode {
  const label = typeof props.label === "string" ? props.label : props.label();
  return (
    <span
      data-tooltip={props.disabled === true ? undefined : label}
      data-tooltip-keys={props.shortcutKeys?.join(" ")}
    >
      {props.children}
    </span>
  );
}

type Entry =
  | { id: string; label: ReactNode; disabled?: boolean; icon?: ReactNode }
  | { type: "label"; id: string; text: string }
  | { type: "separator"; id: string };

function MenuEntryRow({ entry, onSelect }: { entry: Entry; onSelect?: (id: string) => void }) {
  if ("type" in entry) {
    return entry.type === "label" ? <div role="presentation">{entry.text}</div> : <hr />;
  }
  return (
    <button
      type="button"
      role="menuitem"
      disabled={entry.disabled}
      onClick={() => onSelect?.(entry.id)}
    >
      {entry.icon}
      {entry.label}
    </button>
  );
}

export function Menu(props: {
  open: boolean;
  anchor: ReactNode;
  items?: readonly Entry[];
  children?: ReactNode;
  footer?: readonly Entry[];
  onSelect?: (id: string) => void;
  onClose: () => void;
  listClassName?: string | undefined;
}): ReactNode {
  return (
    <span>
      {props.anchor}
      {props.open && (
        <div
          role="menu"
          className={props.listClassName}
          onKeyDown={(event) => {
            if (event.key === "Escape") props.onClose();
          }}
        >
          {props.items?.map((entry) => (
            <MenuEntryRow key={entry.id} entry={entry} {...pick(props.onSelect)} />
          ))}
          {props.children}
          {props.footer?.map((entry) => (
            <MenuEntryRow key={entry.id} entry={entry} {...pick(props.onSelect)} />
          ))}
        </div>
      )}
    </span>
  );
}

function pick(onSelect: ((id: string) => void) | undefined): { onSelect?: (id: string) => void } {
  return onSelect === undefined ? {} : { onSelect };
}

export function MenuItemButton(props: {
  children: ReactNode;
  shortcut?: { keys: readonly string[] };
  disabled?: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={props.disabled}
      aria-keyshortcuts={props.shortcut?.keys.join("+")}
      onClick={props.onSelect}
    >
      {props.children}
    </button>
  );
}

export const modalSelector = '[role="dialog"][aria-modal="true"], [role="menu"]';

export function TextShimmer(props: { children: ReactNode; active?: boolean }): ReactNode {
  return <span data-shimmer={props.active === true}>{props.children}</span>;
}

export function Input({
  icon: _icon,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }): ReactNode {
  return <input {...rest} />;
}
