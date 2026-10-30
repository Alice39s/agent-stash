/**
 * 卡片列表：收件箱浮层、「历史回溯提炼」页与会话 Tab 共用。卡片以 idea 为单位，还没有 idea 的线索一张卡；
 * 按待你决定、本地发现、历史分组，历史默认收起。
 */
import { IconCloseOutlineRegular, TextShimmer } from "@deepseek-ai/dsh-client-ui-primitives";
import { useState, type ReactNode } from "react";
import type { InboxView, ItemView } from "../shared.ts";
import { showItem, type ScoutFace } from "./face.ts";
import { groupItems, inFlight, metaOf, stateLabel, titleOf } from "./format.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { InboxStore, Notice } from "./store.ts";
import styles from "./cards.module.css";

interface CardProps {
  readonly item: ItemView;
  readonly now: number;
  readonly t: ScoutTranslate;
  readonly selected: boolean;
  readonly onOpen: (id: string) => void;
  readonly onDismiss?: ((id: string) => void) | undefined;
}

export function Card({ item, now, t, selected, onOpen, onDismiss }: CardProps): ReactNode {
  const title = titleOf(item);
  return (
    <li className={styles.card} data-state={item.state} data-stage={item.failure?.stage}>
      <button
        type="button"
        className={styles.open}
        data-item={item.id}
        aria-current={selected || undefined}
        onClick={() => onOpen(item.id)}
      >
        <span className={styles.cardTitle}>{title}</span>
        {item.description !== null && item.state !== "written" && (
          <span className={styles.cardSummary}>{item.description}</span>
        )}
        <span className={styles.cardMeta}>
          <span className={styles.state}>
            <TextShimmer active={inFlight(item)}>{stateLabel(t, item)}</TextShimmer>
          </span>
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

/** 没有可用模型、分析关闭或由另一个窗口分析时的一行说明。 */
export function Banner({
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
  else if (status.models.summary === null && pending) key = "banner.noModel";
  else if (!status.lead) key = "banner.secondary";
  if (key === null) return null;
  return <p className={styles.banner}>{t(key)}</p>;
}

export interface CardListProps {
  readonly items: readonly ItemView[];
  readonly now: number;
  readonly t: ScoutTranslate;
  readonly selected: string | null;
  readonly onOpen: (id: string) => void;
  readonly onDismiss: (id: string) => void;
}

/** 从卡片上忽略一条，提示里带撤销。 */
export function dismissItem(inbox: InboxStore, id: string): void {
  void inbox.act(
    { action: "dismiss", id, similar: false },
    { key: "notice.dismissed", params: {}, undo: { action: "restore", id }, view: null },
  );
}

/** 可以从卡片上直接忽略：不在等模型，也还没有结论。 */
function dismissable(item: ItemView): boolean {
  return (
    !inFlight(item) &&
    item.state !== "written" &&
    item.state !== "skipped" &&
    item.state !== "dismissed"
  );
}

/** 一组卡片，不分组。 */
export function CardList({ items, now, t, selected, onOpen, onDismiss }: CardListProps): ReactNode {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <Card
          key={item.id}
          item={item}
          now={now}
          t={t}
          selected={item.id === selected}
          onOpen={onOpen}
          onDismiss={dismissable(item) ? onDismiss : undefined}
        />
      ))}
    </ul>
  );
}

/** 按状态分组的卡片；历史默认收起，选中的卡片在历史里时展开，用户点过之后按用户的选择。 */
export function GroupedCards(props: CardListProps): ReactNode {
  const { items, selected, t } = props;
  const groups = groupItems(items);
  /** 用户展开或收起过历史；为 null 时跟随选中的卡片。 */
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const history = expanded ?? groups.history.some((item) => item.id === selected);
  const section = (
    key: "section.review" | "section.found",
    entries: readonly ItemView[],
  ): ReactNode =>
    entries.length === 0 ? null : (
      <section className={styles.section} aria-label={t(key)}>
        <h3 className={styles.sectionTitle}>{t(key)}</h3>
        <CardList {...props} items={entries} />
      </section>
    );
  return (
    <>
      {section("section.review", groups.review)}
      {section("section.found", groups.found)}
      {groups.history.length > 0 && (
        <section className={styles.section}>
          <button
            type="button"
            className={styles.historyToggle}
            aria-expanded={history}
            onClick={() => setExpanded(!history)}
          >
            {history ? t("history.hide") : t("history.show", { count: groups.history.length })}
          </button>
          {history && <CardList {...props} items={groups.history} />}
        </section>
      )}
    </>
  );
}

/** 没有任何卡片时的说明。 */
export function EmptyInbox({
  inbox,
  t,
}: {
  readonly inbox: InboxView;
  readonly t: ScoutTranslate;
}): ReactNode {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{t("panel.empty.title")}</p>
      <p className={styles.emptyBody}>{t("panel.empty.body")}</p>
      <p className={styles.caption}>
        {t(inbox.status.analyzed.sessions === 1 ? "panel.analyzed.one" : "panel.analyzed.other", {
          sessions: inbox.status.analyzed.sessions,
        })}
      </p>
    </div>
  );
}

/** 一条提示的正文与按钮：查看、撤销、关闭。 */
export function NoticeBar({
  notice,
  face,
  t,
  onView,
}: {
  readonly notice: Notice;
  readonly face: Pick<ScoutFace, "inbox" | "page" | "openPage">;
  readonly t: ScoutTranslate;
  readonly onView?: () => void;
}): ReactNode {
  const { inbox } = face;
  return (
    <>
      <span className={styles.noticeText}>{t(notice.key, notice.params)}</span>
      <span className={styles.noticeActions}>
        {notice.view !== null && (
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              const target = notice.view;
              inbox.clearNotice();
              onView?.();
              showItem(face, target);
            }}
          >
            {t("notice.view")}
          </button>
        )}
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
      </span>
    </>
  );
}
