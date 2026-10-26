/**
 * 控件的说明气泡，行为取自宿主 `Tooltip`（`side="bottom"`）：没有显示延迟；指针移入或键盘聚焦
 * （`:focus-visible`）时出现；悬停与聚焦是两个独立的触发源，两者都结束才消失；点击触发元素立即消失。
 *
 * 宿主标题栏的标题行声明了 `container-type`，会成为 `position: fixed` 的包含块；气泡因此用
 * Popover API（`popover="manual"`）进入 top layer，再按触发元素的 `getBoundingClientRect()` 定位，
 * 窗口尺寸变化时重新定位。气泡节点留在插件自己的子树里，不挂到 `document.body`。
 */
import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "./class-names.ts";
import { placeTooltip, type AnchorBox } from "./placement.ts";
import surface from "./surface.module.css";
import styles from "./tooltip.module.css";

/** `@types/react` 18.3 还没有声明 Popover API 的 `popover` 属性；React 18 会把它原样写到 DOM 上。 */
declare module "react" {
  interface HTMLAttributes<T> {
    popover?: "auto" | "manual" | undefined;
  }
}

/** Tooltip 给触发元素接上的事件；触发元素自己的处理函数先执行。 */
interface AnchorProps {
  readonly onMouseEnter?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  readonly onMouseLeave?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  readonly onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  readonly onFocus?: ((event: FocusEvent<HTMLElement>) => void) | undefined;
  readonly onBlur?: ((event: FocusEvent<HTMLElement>) => void) | undefined;
}

export interface TooltipProps {
  readonly label: string;
  /** 单个触发元素。 */
  readonly children: ReactElement<AnchorProps>;
}

/** 两个触发源各自是否仍在生效。 */
interface Triggers {
  readonly hover: boolean;
  readonly focus: boolean;
}

const IDLE: Triggers = { hover: false, focus: false };

/**
 * 显示中的气泡：挂上后进入 top layer 并按触发元素定位，窗口尺寸变化时重新定位。
 * 文字变化时调用方换 `key` 重新挂载，新尺寸随之重新定位。
 */
function Bubble({
  label,
  anchor,
}: {
  readonly label: string;
  readonly anchor: HTMLElement;
}): ReactNode {
  const bubble = useRef<HTMLSpanElement>(null);

  // 带 `popover` 属性的气泡在 showPopover() 之前不显示，显示与定位在同一个任务里完成。
  useEffect(() => {
    const element = bubble.current;
    if (element === null) throw new Error("tooltip bubble is not mounted");
    const fit = (): void => {
      const { left, right, top, bottom } = anchor.getBoundingClientRect();
      const box: AnchorBox = { left, right, top, bottom };
      const { width, height } = element.getBoundingClientRect();
      const placement = placeTooltip(
        box,
        { width, height },
        { width: window.innerWidth, height: window.innerHeight },
      );
      element.style.left = `${String(placement.left)}px`;
      element.style.top = `${String(placement.top)}px`;
      element.dataset.side = placement.side;
    };
    element.showPopover();
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
    };
  }, [anchor]);

  return (
    <span ref={bubble} popover="manual" role="tooltip" className={cx(surface.root, styles.bubble)}>
      {label}
    </span>
  );
}

export function Tooltip({ label, children }: TooltipProps): ReactNode {
  const [triggers, setTriggers] = useState<Triggers>(IDLE);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = triggers.hover || triggers.focus;

  const own = children.props;
  const set = (patch: Partial<Triggers>): void => {
    setTriggers((current) => ({ ...current, ...patch }));
  };
  return (
    <>
      {cloneElement(children, {
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          own.onMouseEnter?.(event);
          setAnchor(event.currentTarget);
          set({ hover: true });
        },
        onMouseLeave: (event: MouseEvent<HTMLElement>) => {
          own.onMouseLeave?.(event);
          set({ hover: false });
        },
        onClick: (event: MouseEvent<HTMLElement>) => {
          own.onClick?.(event);
          setTriggers(IDLE);
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          own.onFocus?.(event);
          if (!event.currentTarget.matches(":focus-visible")) return;
          setAnchor(event.currentTarget);
          set({ focus: true });
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          own.onBlur?.(event);
          set({ focus: false });
        },
      })}
      {visible && anchor !== null && <Bubble key={label} label={label} anchor={anchor} />}
    </>
  );
}
