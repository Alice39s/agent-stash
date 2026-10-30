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
import { showItem, type FaceProps } from "./face.ts";
import { useSnapshot } from "./hooks.ts";
import type { SeenStore } from "./seen.ts";
import { everyItem } from "./store.ts";
import { ResultNotice } from "./ui/notice.tsx";
import styles from "./inbox.module.css";

const MEASURE_STYLE: CSSProperties = { visibility: "hidden", left: 0, top: 0 };

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

  // 打开时把焦点移进面板：面板本身可聚焦，读屏随即宣告这个对话框，Tab 从面板里的第一项开始而不是走到文档末尾。
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

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
    event.preventDefault();
    close();
  };
  /** 在页面里打开一行；不传 id 时只打开页面。 */
  const openPage = (id: string | null): void => {
    setOpen(false);
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
          aria-label={t("panel.title")}
          tabIndex={-1}
          onKeyDown={onKeyDown}
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
            <div className={styles.notice}>
              <ResultNotice
                text={t(state.notice.key, state.notice.params)}
                links={noticeLinks(state.notice, props, t, () => setOpen(false))}
              />
            </div>
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
