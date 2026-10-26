import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Appearance } from "./appearance.ts";
import type { AppearanceStore, PanelHint, PanelProps } from "./service.ts";
import { useAppearance } from "./store.ts";

/** 框架样式的类名前缀。 */
export const KIT = "dsh-stash";

/** 面板顶部与对话标题栏之间保留的距离。 */
const TOP_MARGIN = 84;
/** 列表最多占用的高度，约六行。 */
const MAX_LIST_HEIGHT = 228;
/** 退场动画最长的时间；超过后无论动画事件是否到达都卸载面板。 */
const EXIT_LIMIT_MS = 400;
/** 打开后逐行浮现的时间窗口，之后新增的行不再播放浮现动画。 */
const FRESH_MS = 420;
/** 逐行浮现最多错开的行数。 */
const STAGGER_ROWS = 7;
/** 相邻两行浮现的间隔。 */
const STAGGER_MS = 30;

function DocumentIcon(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.25 6h5.5M5.25 8h5.5M5.25 10h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Hint({ hint }: { hint: PanelHint }): ReactNode {
  return (
    <span className={`${KIT}-hint`}>
      <span className={`${KIT}-keys`}>
        {hint.keys.map((key, index) => (
          <Fragment key={key}>
            {index > 0 && <span className={`${KIT}-slash`}>/</span>}
            <kbd className={`${KIT}-kbd`}>{key}</kbd>
          </Fragment>
        ))}
      </span>
      <span>{hint.label}</span>
    </span>
  );
}

/**
 * macOS 桌面版里，页面要在原生窗口的透明效果上模糊，面板下方的页面内容需要一层不透明垫底。
 * 垫底挂在 body 末尾，用 CSS anchor 对齐面板；样式只在 macOS 且开启毛玻璃时显示它。
 * 面板开始退场时垫底立即移除，免得不透明的底块比淡出的面板留得更久。
 */
function useBacking(
  anchor: string,
  surface: { readonly current: HTMLDivElement | null },
  shown: boolean,
  glass: boolean,
): void {
  useLayoutEffect(() => {
    if (!shown) return undefined;
    surface.current?.style.setProperty("--dsh-stash-anchor", anchor);
    const backing = document.createElement("div");
    backing.className = `${KIT}-backing`;
    backing.setAttribute("aria-hidden", "true");
    backing.style.setProperty("--dsh-stash-anchor", anchor);
    if (glass) backing.dataset["glass"] = "";
    document.body.append(backing);
    return () => backing.remove();
  }, [anchor, surface, shown, glass]);
}

/** 面板此刻显示的内容：打开时跟随属性，关闭后保留最后一次的内容直到退场结束。 */
interface PanelView {
  readonly props: PanelProps;
  readonly closing: boolean;
  /** 每次从关闭变为打开时递增，用于只在打开时逐行浮现。 */
  readonly opening: number;
}

/** 行相对列表内容顶端的位置；逐行浮现期间行的包裹层带 transform，会成为 offsetParent。 */
function offsetWithin(listbox: HTMLElement, option: HTMLElement): number {
  let top = 0;
  let node: Element | null = option;
  while (node instanceof HTMLElement && node !== listbox) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}

/** 按列表的可视区域滚动到高亮行，并把滑动高亮块移到它下面。 */
function followActive(listbox: HTMLElement, option: HTMLElement): void {
  const top = offsetWithin(listbox, option);
  const bottom = top + option.offsetHeight;
  if (top < listbox.scrollTop) listbox.scrollTop = top;
  else if (bottom > listbox.scrollTop + listbox.clientHeight) {
    listbox.scrollTop = bottom - listbox.clientHeight;
  }
  const glide = listbox.querySelector<HTMLElement>(`.${KIT}-glide`);
  if (glide === null) return;
  glide.style.transform = `translateY(${top}px)`;
  glide.style.height = `${option.offsetHeight}px`;
  // 第一次定位不播放滑动，之后的移动才有过渡。
  if (glide.dataset["placed"] === undefined) {
    requestAnimationFrame(() => {
      glide.dataset["placed"] = "";
    });
  }
}

/**
 * 生成绑定外观订阅源的面板组件：标题与计数、按日期分组的单行列表、按键提示页脚。
 * 焦点始终留在输入框里，行在 mousedown 时选中，高亮通过 aria-activedescendant 暴露。
 */
export function createPanel(store: AppearanceStore): (props: PanelProps) => ReactNode {
  return function Panel(props: PanelProps): ReactNode {
    const live = useAppearance(store);
    const appearance: Appearance = props.preview ?? live;
    const [view, setView] = useState<PanelView | null>(
      props.open ? { props, closing: false, opening: 0 } : null,
    );
    const [settled, setSettled] = useState(-1);
    if (props.open) {
      if (view === null || view.closing) {
        setView({ props, closing: false, opening: (view?.opening ?? 0) + 1 });
      } else if (view.props !== props) {
        setView({ ...view, props });
      }
    } else if (view !== null && !view.closing) {
      setView(appearance.motion === "off" ? null : { ...view, closing: true });
    }

    const closing = view?.closing === true;
    const opening = view?.opening ?? 0;
    const visible = view !== null && !closing;
    useEffect(() => {
      if (!closing) return undefined;
      const timer = setTimeout(() => setView(null), EXIT_LIMIT_MS);
      return () => clearTimeout(timer);
    }, [closing]);
    useEffect(() => {
      if (!visible) return undefined;
      const timer = setTimeout(() => setSettled(opening), FRESH_MS);
      return () => clearTimeout(timer);
    }, [visible, opening]);

    const surface = useRef<HTMLDivElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const anchor = `--${KIT}-${useId().replaceAll(":", "")}`;
    useBacking(anchor, surface, visible && props.preview === undefined, appearance.glass);
    const shown = view?.props;
    const optionId = (index: number) => `${shown?.owner ?? KIT}-option-${index}`;
    useLayoutEffect(() => {
      const panel = surface.current;
      const listbox = list.current;
      const overlay = panel?.parentElement;
      if (shown === undefined || panel === null || listbox === null) return;
      if (overlay !== null && overlay !== undefined && shown.preview === undefined) {
        // 列表高度跟随输入框上方的剩余空间收缩。
        const chrome = panel.offsetHeight - listbox.offsetHeight;
        const room = overlay.getBoundingClientRect().top - TOP_MARGIN - chrome;
        listbox.style.maxHeight = `${Math.max(72, Math.min(MAX_LIST_HEIGHT, room))}px`;
      }
      const option = listbox.querySelector<HTMLElement>(`#${CSS.escape(optionId(shown.active))}`);
      if (option !== null) followActive(listbox, option);
    });

    if (view === null || shown === undefined) return null;
    const { rows, active } = shown;
    const fresh = settled !== opening && !closing;
    return (
      <div
        ref={surface}
        className={`${KIT}-panel`}
        data-dsh-history-panel={shown.owner}
        data-state={closing ? "closing" : "open"}
        data-fresh={fresh ? "" : undefined}
        data-glass={appearance.glass ? "" : undefined}
        data-motion={appearance.motion}
        data-highlight={appearance.highlight}
        data-density={appearance.density}
        data-preview={shown.preview === undefined ? undefined : ""}
        data-hover-tint={shown.hoverTint === true ? "" : undefined}
        aria-hidden={closing || undefined}
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) setView(null);
        }}
      >
        <div className={`${KIT}-header`}>
          <span className={`${KIT}-title`}>{shown.title}</span>
          <span className={`${KIT}-counter`}>{shown.counter}</span>
        </div>
        <div
          ref={list}
          className={`${KIT}-list`}
          role="listbox"
          aria-label={shown.title}
          aria-activedescendant={optionId(active)}
        >
          {appearance.highlight === "glide" && (
            <div className={`${KIT}-glide`} aria-hidden="true" />
          )}
          {rows.map((row, index) => (
            <div
              key={row.key}
              role="presentation"
              className={`${KIT}-item`}
              style={{
                animationDelay: `${String(Math.min(rows.length - 1 - index, STAGGER_ROWS) * STAGGER_MS)}ms`,
              }}
            >
              {row.section !== undefined && row.section !== rows[index - 1]?.section && (
                <div className={`${KIT}-section`} role="presentation">
                  {row.section}
                </div>
              )}
              <div
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className={`${KIT}-row`}
                data-active={index === active ? "" : undefined}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (!closing) shown.onPick(index);
                }}
                onMouseMove={index === active || closing ? undefined : () => shown.onHover(index)}
              >
                <span className={`${KIT}-icon`}>
                  <DocumentIcon />
                </span>
                <span className={`${KIT}-text`}>{row.text}</span>
                {row.meta !== undefined && <span className={`${KIT}-meta`}>{row.meta}</span>}
              </div>
            </div>
          ))}
        </div>
        {appearance.hints && (
          <div className={`${KIT}-footer`}>
            <span className={`${KIT}-hints`}>
              {shown.hints.map((hint) => (
                <Hint key={hint.label} hint={hint} />
              ))}
            </span>
            <span className={`${KIT}-hints`}>
              {shown.trailingHints.map((hint) => (
                <Hint key={hint.label} hint={hint} />
              ))}
            </span>
          </div>
        )}
      </div>
    );
  };
}
