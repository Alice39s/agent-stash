/**
 * 模态对话框，结构取自宿主 `Modal.tsx`，键盘行为取自 `useModalLayer.ts`。
 *
 * 对话框是调用方子树里的原生 `<dialog>`：挂上时 `showModal()` 进入 top layer，不受宿主
 * `container-type` 或 transform 祖先影响，也不往 `document.body` 加节点。卸载时 React 先解绑 ref
 * 再移除节点，`close()` 因而在节点仍在文档里时执行，浏览器把焦点还给打开前聚焦的控件。
 * 宿主快捷键据 `role="dialog"` 与 `aria-modal="true"` 判断前台有模态框。
 *
 * 初始焦点给带 `data-modal-autofocus` 的控件，文本框的光标放在末尾；`step` 变化时重新聚焦。
 * `busy` 期间关闭按钮、点击遮罩与 Escape 都不生效。输入法组字期间 Enter 与 Escape 不起作用。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { cx } from "./class-names.ts";
import { createCompositionGuard } from "./composition.ts";
import { GLYPH_SIZE } from "./controls.tsx";
import styles from "./dialog.module.css";
import { IconClose } from "./icons.tsx";
import { outsideBox } from "./placement.ts";
import surface from "./surface.module.css";

export interface DialogProps {
  readonly title: string;
  readonly closeLabel: string;
  readonly description?: string | undefined;
  /** 换步骤时改变它，焦点移到新步骤的初始控件。 */
  readonly step: string;
  /** 操作进行中：所有关闭途径都不生效。 */
  readonly busy: boolean;
  readonly onClose: () => void;
  /** Cmd/Ctrl+Enter 的提交动作。 */
  readonly onSubmit?: (() => void) | undefined;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/** 聚焦初始控件；文本框的光标放到末尾。 */
function focusInitial(dialog: HTMLDialogElement): void {
  const target = dialog.querySelector<HTMLElement>("[data-modal-autofocus]");
  if (target === null) return;
  target.focus();
  if (target instanceof HTMLTextAreaElement) {
    target.setSelectionRange(target.value.length, target.value.length);
  }
}

/** 指针事件是否落在 dialog 的遮罩上：target 是 dialog 自身，且落点在卡片矩形之外。 */
function onBackdrop(event: MouseEvent<HTMLDialogElement>): boolean {
  return (
    event.target === event.currentTarget &&
    outsideBox(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY)
  );
}

export function Dialog({
  title,
  closeLabel,
  description,
  step,
  busy,
  onClose,
  onSubmit,
  children,
  footer,
}: DialogProps): ReactNode {
  const element = useRef<HTMLDialogElement | null>(null);
  const pressedOutside = useRef(false);
  const [composition] = useState(createCompositionGuard);

  const attach = useCallback((node: HTMLDialogElement | null) => {
    if (node === null) {
      element.current?.close();
      element.current = null;
      return;
    }
    element.current = node;
    node.showModal();
    // 子节点先于 dialog 挂上 ref，这里整棵卡片已经在文档里，可以直接把焦点交给初始控件。
    focusInitial(node);
  }, []);

  /** 换步骤后把焦点交给新步骤的初始控件。 */
  useEffect(() => {
    const node = element.current;
    if (node === null) throw new Error(`dialog for step ${step} is not mounted`);
    focusInitial(node);
  }, [step]);

  const close = (): void => {
    if (!busy) onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>): void => {
    const composing = composition.guards(event.nativeEvent);
    if (event.key === "Escape" && composing) {
      event.preventDefault();
      return;
    }
    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      !composing &&
      onSubmit !== undefined
    ) {
      event.preventDefault();
      onSubmit();
    }
  };

  /** Escape 触发的 cancel 一律接管，忙时不关闭。 */
  const onCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    close();
  };

  /** 浏览器强制关闭（连续 Escape 时 cancel 不可取消）后同步状态。 */
  const onNativeClose = (event: SyntheticEvent<HTMLDialogElement>): void => {
    if (!event.currentTarget.open) onClose();
  };

  /**
   * dialog 元素就是卡片，遮罩上的点击也以它为 target；落点在卡片矩形外才算点遮罩。
   * 按下与松开都在遮罩上才关闭，拖选文字越界不算。
   */
  const onPointerDown = (event: PointerEvent<HTMLDialogElement>): void => {
    pressedOutside.current = onBackdrop(event);
  };
  const onClick = (event: MouseEvent<HTMLDialogElement>): void => {
    if (pressedOutside.current && onBackdrop(event)) close();
    pressedOutside.current = false;
  };

  return (
    <dialog
      ref={attach}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-busy={busy || undefined}
      className={cx(surface.root, styles.dialog)}
      onCancel={onCancel}
      onClose={onNativeClose}
      onKeyDown={onKeyDown}
      onKeyUp={() => {
        composition.release();
      }}
      onCompositionStart={() => {
        composition.start();
      }}
      onCompositionEnd={() => {
        composition.end();
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label={closeLabel}
            disabled={busy}
            onClick={close}
          >
            <IconClose size={GLYPH_SIZE} />
          </button>
        </div>
        {description !== undefined && <p className={styles.description}>{description}</p>}
        <div className={styles.body}>{children}</div>
      </div>
      {footer !== undefined && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
