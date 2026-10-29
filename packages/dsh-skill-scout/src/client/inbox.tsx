/**
 * 会话标题栏里的经验提炼入口：一个图标按钮，有新建议时带一个小计数；点开是收件箱浮层，
 * 点卡片打开详情对话框。入口在第一次读取完成前不渲染，避免标题栏闪动。
 * 计数只算打开收件箱之后出现的可保存建议，看过即清零。
 */
import {
  IconCloseOutlineRegular,
  IconSkillOutlineRegular,
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
import * as v from "valibot";
import type { DetailView, InboxView, ItemView } from "../shared.ts";
import { Detail } from "./detail.tsx";
import { groupItems, metaOf, titleOf } from "./format.ts";
import { useSnapshot } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { InboxStore } from "./store.ts";
import styles from "./inbox.module.css";

/** 注入到标题栏入口的共享对象。 */
export interface InboxFace {
  readonly inbox: InboxStore;
  readonly seen: SeenStore;
  readonly loadDetail: (id: string, version: string, signal: AbortSignal) => Promise<DetailView>;
  readonly openSession: ((sessionId: string) => void) | null;
}

export type InboxEntryProps = InboxFace & { readonly t: ScoutTranslate };

/** 看过的可保存建议；存在 localStorage 里，跨窗口共享。 */
export interface SeenStore {
  has(id: string): boolean;
  add(ids: readonly string[]): void;
}

const SEEN_KEY = "agent-stash-skill-scout:seen";
const SEEN_LIMIT = 200;

const SeenSchema = v.pipe(v.string(), v.parseJson(), v.array(v.string()));

/**
 * 以 localStorage 保存看过的建议 id，只保留最近的一部分。
 * localStorage 是页面共享的外部存储：内容损坏时当作没有记录，写不进去（无痕模式、配额已满）时只记在内存里，
 * 两种情况都只影响角标计数。
 */
export function createSeenStore(storage: Pick<Storage, "getItem" | "setItem">): SeenStore {
  let memory: readonly string[] = [];
  const read = (): readonly string[] => {
    const raw = storage.getItem(SEEN_KEY);
    if (raw === null) return memory;
    const parsed = v.safeParse(SeenSchema, raw);
    return parsed.success ? [...new Set([...parsed.output, ...memory])] : memory;
  };
  return {
    has: (id) => read().includes(id),
    add(ids) {
      memory = [...new Set([...read(), ...ids])].slice(-SEEN_LIMIT);
      try {
        storage.setItem(SEEN_KEY, JSON.stringify(memory));
      } catch (error) {
        if (!(error instanceof DOMException)) throw error;
      }
    },
  };
}

const MEASURE_STYLE: CSSProperties = { visibility: "hidden", left: 0, top: 0 };

/** 新建议数：可保存且还没看过。 */
function unseen(inbox: InboxView | null, seen: SeenStore): number {
  if (inbox === null) return 0;
  return inbox.items.filter((item) => item.state === "ready" && !seen.has(item.id)).length;
}

interface CardProps {
  readonly item: ItemView;
  readonly now: number;
  readonly t: ScoutTranslate;
  readonly onOpen: (id: string) => void;
  readonly onDismiss?: ((id: string) => void) | undefined;
}

function Card({ item, now, t, onOpen, onDismiss }: CardProps): ReactNode {
  const title = titleOf(item);
  const showState = item.state !== "ready";
  return (
    <li className={styles.card} data-state={item.state}>
      <button
        type="button"
        className={styles.open}
        data-item={item.id}
        onClick={() => onOpen(item.id)}
      >
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.cardMeta}>
          {showState && <span className={styles.state}>{t(`state.${item.state}`)}</span>}
          <span>{metaOf(t, item, now)}</span>
        </span>
      </button>
      {onDismiss !== undefined && (
        <button
          type="button"
          className={styles.dismiss}
          aria-label={`${t("action.dismiss")}: ${title}`}
          title={t("action.dismiss")}
          onClick={() => onDismiss(item.id)}
        >
          <IconCloseOutlineRegular size={12} />
        </button>
      )}
    </li>
  );
}

interface PanelBodyProps {
  readonly inbox: InboxView;
  readonly now: number;
  readonly t: ScoutTranslate;
  readonly onOpen: (id: string) => void;
  readonly onDismiss: (id: string) => void;
}

function Banner({
  inbox,
  t,
}: {
  readonly inbox: InboxView;
  readonly t: ScoutTranslate;
}): ReactNode {
  const { status } = inbox;
  const pending = inbox.items.some((item) => item.state === "detected" || item.state === "failed");
  let key: "banner.noModel" | "banner.discoveryOff" | "banner.secondary" | null = null;
  if (!status.discovery) key = "banner.discoveryOff";
  else if (status.model === null && pending) key = "banner.noModel";
  else if (!status.lead) key = "banner.secondary";
  if (key === null) return null;
  return <p className={styles.banner}>{t(key)}</p>;
}

function PanelBody({ inbox, now, t, onOpen, onDismiss }: PanelBodyProps): ReactNode {
  const [history, setHistory] = useState(false);
  const groups = groupItems(inbox.items);
  if (groups.ready.length === 0 && groups.found.length === 0 && groups.history.length === 0) {
    return (
      <div className={styles.empty}>
        <Banner inbox={inbox} t={t} />
        <p className={styles.emptyTitle}>{t("panel.empty.title")}</p>
        <p className={styles.emptyBody}>{t("panel.empty.body")}</p>
        <p className={styles.caption}>
          {t("panel.analyzed", { sessions: inbox.status.analyzed.sessions })}
        </p>
      </div>
    );
  }
  const section = (
    key: "section.ready" | "section.found",
    items: readonly ItemView[],
  ): ReactNode =>
    items.length === 0 ? null : (
      <section className={styles.section} aria-label={t(key)}>
        <h3 className={styles.sectionTitle}>{t(key)}</h3>
        <ul className={styles.list}>
          {items.map((item) => (
            <Card
              key={item.id}
              item={item}
              now={now}
              t={t}
              onOpen={onOpen}
              onDismiss={item.state === "reviewing" ? undefined : onDismiss}
            />
          ))}
        </ul>
      </section>
    );
  return (
    <>
      <Banner inbox={inbox} t={t} />
      {section("section.ready", groups.ready)}
      {section("section.found", groups.found)}
      {groups.history.length > 0 && (
        <section className={styles.section}>
          <button
            type="button"
            className={styles.historyToggle}
            aria-expanded={history}
            onClick={() => setHistory(!history)}
          >
            {history ? t("history.hide") : t("history.show", { count: groups.history.length })}
          </button>
          {history && (
            <ul className={styles.list}>
              {groups.history.map((item) => (
                <Card key={item.id} item={item} now={now} t={t} onOpen={onOpen} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

/** 标题栏入口与收件箱浮层。 */
export function InboxEntry({
  inbox,
  seen,
  loadDetail,
  openSession,
  t,
}: InboxEntryProps): ReactNode {
  const state = useSnapshot(inbox);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [detailId, setDetailId] = useState<string | null>(null);
  /** 详情关闭、收件箱重新打开后要聚焦的卡片。 */
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [, setSeenVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredPosition({
    open,
    anchorRef: triggerRef,
    panelRef,
    side: "bottom",
    gap: 5,
    margin: 16,
  });
  useDismissOnOutsidePointer(rootRef, open && detailId === null, setOpen, panelRef);

  // 从详情回到收件箱时，焦点落回刚才那张卡片；卡片已移走时落在浮层上，Escape 照常可用。
  useEffect(() => {
    if (!open || returnTo === null || position === null) return;
    const panelElement = panelRef.current;
    const card = panelElement?.querySelector<HTMLElement>(`[data-item="${CSS.escape(returnTo)}"]`);
    (card ?? panelElement)?.focus();
  }, [open, returnTo, position]);

  // 收件箱开着时出现的可保存建议也算看过。
  useEffect(() => {
    if (!open || state.inbox === null) return;
    const ready = state.inbox.items.filter((item) => item.state === "ready").map((item) => item.id);
    if (ready.some((id) => !seen.has(id))) seen.add(ready);
  }, [open, state.inbox, seen]);

  if (state.inbox === null && state.status !== "error") return null;

  const fresh = unseen(state.inbox, seen);
  const badge = state.inbox?.status.notify === "badge" && fresh > 0;
  const label =
    fresh === 0
      ? t("entry.label")
      : t(fresh === 1 ? "entry.count.one" : "entry.count.other", { count: fresh });
  const working =
    state.inbox !== null && (state.inbox.status.scanning || state.inbox.status.reviewing !== null);

  /** 打开收件箱：刷新状态，并把当前的可保存建议记为看过。 */
  const show = (): void => {
    const ready =
      state.inbox?.items.filter((item) => item.state === "ready").map((item) => item.id) ?? [];
    seen.add(ready);
    setSeenVersion((version) => version + 1);
    setNow(Date.now());
    setOpen(true);
    void inbox.refresh();
  };
  const close = (): void => {
    setOpen(false);
    setReturnTo(null);
    setSeenVersion((version) => version + 1);
    triggerRef.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Escape" || !open || detailId !== null) return;
    event.preventDefault();
    close();
  };
  const openDetail = (id: string): void => {
    setOpen(false);
    setDetailId(id);
  };
  const closeDetail = (): void => {
    setReturnTo(detailId);
    setDetailId(null);
    show();
  };
  const dismiss = (id: string): void => {
    void inbox.act(
      { action: "dismiss", id, similar: false },
      { key: "notice.dismissed", params: {}, undo: { action: "restore", id } },
    );
  };

  const detailItem =
    detailId === null ? undefined : state.inbox?.items.find((item) => item.id === detailId);
  const notice = state.notice;

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
                {state.inbox?.status.reviewing === null
                  ? t("panel.analyzing")
                  : t("panel.reviewing")}
              </span>
            )}
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
            {state.inbox === null && state.status === "loading" && (
              <p className={styles.caption} role="status">
                {t("panel.loading")}
              </p>
            )}
            {state.inbox !== null && (
              <PanelBody
                inbox={state.inbox}
                now={now}
                t={t}
                onOpen={openDetail}
                onDismiss={dismiss}
              />
            )}
          </div>
          {notice !== null && (
            <div className={styles.notice} role="status">
              <span className={styles.noticeText}>{t(notice.key, notice.params)}</span>
              {notice.undo !== null && (
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    const action = notice.undo;
                    inbox.clearNotice();
                    if (action !== null) void inbox.act(action);
                  }}
                >
                  {t("notice.undo")}
                </button>
              )}
            </div>
          )}
        </div>,
        document.body,
      )
    : null;

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
      {detailId !== null && detailItem !== undefined && (
        <Detail
          id={detailId}
          item={detailItem}
          inbox={inbox}
          loadDetail={loadDetail}
          modelName={state.inbox?.status.model?.model ?? null}
          defaultScope={state.inbox?.status.scope ?? "project"}
          openSession={openSession}
          t={t}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
