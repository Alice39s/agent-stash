/**
 * 模态对话框：原生 `<dialog>` 加 `showModal()`，卡片外观取自宿主 `Modal`，宽度适合并排阅读证据与预览。
 * 挂上时进入 top layer，卸载时浏览器把焦点还给打开前的控件。初始焦点给带 `data-autofocus` 的控件。
 * `busy` 期间点遮罩、按 Escape 与关闭按钮都不生效。
 */
import { IconCloseOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import styles from "./dialog.module.css";

export interface DialogProps {
  readonly title: string;
  readonly closeLabel: string;
  /** 标题下的一行说明。 */
  readonly subtitle?: ReactNode;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/** 点击落在卡片矩形之外，即遮罩上。 */
function onBackdrop(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

export function Dialog({
  title,
  closeLabel,
  subtitle,
  busy,
  onClose,
  children,
  footer,
}: DialogProps): ReactNode {
  const element = useRef<HTMLDialogElement | null>(null);
  const pressedOutside = useRef(false);

  const attach = useCallback((node: HTMLDialogElement | null) => {
    if (node === null) {
      element.current?.close();
      element.current = null;
      return;
    }
    element.current = node;
    if (!node.open) node.showModal();
    node.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  const close = (): void => {
    if (!busy) onClose();
  };

  /** Escape 触发的 cancel 一律接管，忙时不关闭。 */
  const onCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    close();
  };

  return (
    <dialog
      ref={attach}
      aria-label={title}
      aria-busy={busy || undefined}
      className={styles.dialog}
      onCancel={onCancel}
      onPointerDown={(event) => {
        pressedOutside.current = onBackdrop(event);
      }}
      onClick={(event) => {
        if (pressedOutside.current && onBackdrop(event)) close();
        pressedOutside.current = false;
      }}
    >
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle !== undefined && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label={closeLabel}
          disabled={busy}
          onClick={close}
        >
          <IconCloseOutlineRegular size={14} />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer !== undefined && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
