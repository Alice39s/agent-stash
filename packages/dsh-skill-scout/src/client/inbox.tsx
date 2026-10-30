/**
 * 会话标题栏里的经验提炼入口（design 3.7）：一个圆形图标按钮，有新建议时右上角带一个小计数；
 * 点开是收件箱浮层，点一行在主区域打开「历史回溯提炼」页并选中这条。入口在第一次读取完成前不渲染，避免标题栏闪动。
 * 计数只算打开收件箱之后出现的、等用户决定的摘要与草稿，看过即清零；详情面板里正显示的那条在眼前，不计入。
 * 页面没开着时，提示从入口下方弹出；浮层开着时它列出全部卡片，后台工作结束由行表达，不出提示（design 4.9）。
 */
import {
  IconSkillOutlineRegular,
  TextShimmer,
  useAnchoredPosition,
  useDismissOnOutsidePointer,
} from "@deepseek-ai/dsh-client-ui-primitives";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { InboxView } from "../shared.ts";
import { Banner, dismissItem, GroupedItems, noticeLinks } from "./cards.tsx";
import { showItem, type FaceProps, type ScoutFace } from "./face.ts";
import { useSnapshot } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { SeenStore } from "./seen.ts";
import { everyItem, type Notice } from "./store.ts";
import { ResultNotice } from "./ui/notice.tsx";
import styles from "./inbox.module.css";

const MEASURE_STYLE: CSSProperties = { visibility: "hidden", left: 0, top: 0 };

/** 面板里可以按 Tab 到的元素；与宿主浮层的选择器一致。 */
const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';

/** 等用户决定的摘要与草稿。 */
function awaiting(inbox: InboxView | null): string[] {
  return (inbox?.items ?? [])
    .filter((item) => item.state === "proposed" || item.state === "ready")
    .map((item) => item.id);
}

/** 新建议数：等用户决定、还没看过，也不在打开的详情里。 */
function unseen(inbox: InboxView | null, seen: SeenStore, viewing: readonly string[]): number {
  return awaiting(inbox).filter((id) => !viewing.includes(id) && !seen.has(id)).length;
}

/** 浮层底部的操作结果；「查看」先关闭浮层，焦点跟着回到入口。 */
function PanelNotice(props: {
  readonly notice: Notice;
  readonly face: Pick<ScoutFace, "inbox" | "page" | "openPage">;
  readonly t: ScoutTranslate;
  readonly onView: () => void;
}): ReactNode {
  return (
    <div className={styles.notice}>
      <ResultNotice
        text={props.t(props.notice.key, props.notice.params)}
        links={noticeLinks(props.notice, props.face, props.t, props.onView)}
      />
    </div>
  );
}

/** 标题栏入口、收件箱浮层与弹出提示。 */
export function InboxEntry(props: FaceProps): ReactNode {
  const { inbox, seen, t } = props;
  const state = useSnapshot(inbox);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [, setSeenVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  /** 这一轮打开后是否已经把焦点放进过面板。 */
  const focusedRef = useRef(false);
  const position = useAnchoredPosition({
    open,
    anchorRef: triggerRef,
    panelRef,
    side: "bottom",
    gap: 5,
    margin: 16,
  });
  const toast = !open && !state.hosting ? state.notice : null;
  const toastPosition = useAnchoredPosition({
    open: toast !== null,
    anchorRef: triggerRef,
    panelRef: toastRef,
    side: "bottom",
    gap: 5,
    margin: 16,
  });
  useDismissOnOutsidePointer(rootRef, open, setOpen, panelRef);
  useEffect(() => (open ? inbox.listing(everyItem) : undefined), [inbox, open]);
  // 浮层开着时提示显示在浮层底部，页面与会话视图不再重复同一条提示。
  useEffect(() => (open ? inbox.overlay() : undefined), [inbox, open]);

  // 打开时把焦点移进面板：面板本身可聚焦，读屏随即宣告这个对话框，Tab 从面板里的第一项开始而不是走到文档末尾。
  // 真实宿主首次测量前没有坐标，此时面板是 visibility: hidden，focus() 是空操作，所以等位置到手再聚焦；
  // 只看 placed 而不是坐标本身，滚动或缩放让坐标变化时不会重复抢焦点。
  const placed = position !== null;
  useEffect(() => {
    if (!open) {
      focusedRef.current = false;
      return;
    }
    if (!placed || focusedRef.current) return;
    panelRef.current?.focus();
    focusedRef.current = true;
  }, [open, placed]);

  // 收件箱开着时出现的待决定建议算看过；详情面板里等到的摘要或草稿同样算看过。
  useEffect(() => {
    if (state.inbox === null) return;
    const ids = awaiting(state.inbox).filter((id) => open || state.viewing.includes(id));
    if (ids.some((id) => !seen.has(id))) seen.add(ids);
  }, [open, state.viewing, state.inbox, seen]);

  if (state.inbox === null && state.status !== "error") return null;

  const fresh = unseen(state.inbox, seen, state.viewing);
  const badge = state.inbox?.status.notify === "badge" && fresh > 0;
  const label =
    fresh === 0
      ? t("entry.label")
      : t(fresh === 1 ? "entry.count.one" : "entry.count.other", { count: fresh });
  const asking = (state.inbox?.status.working ?? 0) > 0;
  const working = asking || state.inbox?.status.scanning === true;

  /** 打开收件箱：刷新状态，并把当前的待决定建议记为看过。 */
  const show = (): void => {
    seen.add(awaiting(state.inbox));
    setSeenVersion((version) => version + 1);
    setNow(Date.now());
    setOpen(true);
    void inbox.refresh();
  };
  const close = (): void => {
    setOpen(false);
    setSeenVersion((version) => version + 1);
    triggerRef.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Escape" || !open) return;
    // 面板经 portal 渲染，但仍是这个根元素的 React 子节点，面板里的按键也会冒泡到这里；
    // Escape 由面板那层关闭一次，这里跳过面板内的事件，免得 close() 执行两次。
    if (event.target instanceof Node && panelRef.current?.contains(event.target) === true) return;
    event.preventDefault();
    close();
  };
  /** 面板里的按键：Escape 关闭；Tab 在面板内循环，不把焦点漏到文档末尾。 */
  const onPanelKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (panel === null) return;
    const focusables = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => !element.closest("[inert], [hidden]"),
    );
    const first = focusables[0] ?? panel;
    const last = focusables.at(-1) ?? panel;
    const active = document.activeElement;
    const wrapping =
      active === panel ||
      !panel.contains(active) ||
      (event.shiftKey ? active === first : active === last);
    if (!wrapping) return;
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  };
  /** 在页面里打开一行；不传 id 时只打开页面。与关闭一样把焦点交还入口，键盘用户不会落到 body。 */
  const openPage = (id: string | null): void => {
    close();
    showItem(props, id);
  };

  const view = state.inbox;
  const sessions = view?.status.analyzed.sessions ?? 0;
  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className={styles.panel}
          style={position ?? MEASURE_STYLE}
          role="dialog"
          aria-modal="true"
          aria-label={t("panel.title")}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
        >
          <div className={styles.head}>
            <h2 className={styles.title}>{t("panel.title")}</h2>
            {working && (
              <span className={styles.working} role="status">
                <TextShimmer active>
                  {asking ? t("panel.working") : t("panel.analyzing")}
                </TextShimmer>
              </span>
            )}
            <span className={styles.spacer} />
            <button type="button" className={styles.link} onClick={() => openPage(null)}>
              {t("page.title")}
            </button>
          </div>
          <div className={styles.scroll}>
            {state.status === "error" && (
              <div className={styles.errorRow} role="alert">
                <span>{t("panel.error")}</span>
                <button type="button" className={styles.link} onClick={() => void inbox.refresh()}>
                  {t("panel.retry")}
                </button>
              </div>
            )}
            {view !== null && <Banner inbox={view} t={t} />}
            {view !== null &&
              (view.items.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>{t("panel.empty.title")}</p>
                  <p className={styles.emptyFact}>
                    {t(sessions === 1 ? "panel.analyzed.one" : "panel.analyzed.other", {
                      sessions,
                    })}
                  </p>
                </div>
              ) : (
                <GroupedItems
                  items={view.items}
                  now={now}
                  t={t}
                  size="popover"
                  selected={null}
                  onOpen={openPage}
                  onDismiss={(id) => dismissItem(inbox, id)}
                />
              ))}
          </div>
          {state.notice !== null && (
            <PanelNotice notice={state.notice} face={props} t={t} onView={close} />
          )}
        </div>,
        document.body,
      )
    : null;

  const popup =
    toast === null
      ? null
      : createPortal(
          <div ref={toastRef} className={styles.toast} style={toastPosition ?? MEASURE_STYLE}>
            <ResultNotice
              framed={false}
              text={t(toast.key, toast.params)}
              links={noticeLinks(toast, props, t)}
              close={{ label: t("notice.close"), onClick: () => inbox.clearNotice() }}
            />
          </div>,
          document.body,
        );

  return (
    <div ref={rootRef} className={styles.root} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t("entry.label")}
        onClick={() => (open ? close() : show())}
      >
        <IconSkillOutlineRegular size={16} />
        {badge && (
          <span className={styles.badge} aria-hidden="true">
            {fresh > 9 ? "9+" : fresh}
          </span>
        )}
      </button>
      {panel}
      {popup}
    </div>
  );
}
