/**
 * 建议的列表：收件箱浮层、「历史回溯提炼」页与会话视图共用。每行一个 idea，还没有 idea 的线索一行；
 * 按待你决定、本地发现、历史分组，历史默认收起。行的标记列是状态点，元信息行以状态词开头。
 */
import { IconCloseOutlineRegular, StateDot } from "@deepseek-ai/dsh-client-ui-primitives";
import { useState, type ReactNode } from "react";
import type { InboxView, ItemView } from "../shared.ts";
import { showItem, type ScoutFace } from "./face.ts";
import { absolute, groupItems, inFlight, itemStatus, metaItems, titleOf } from "./format.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { InboxStore, Notice } from "./store.ts";
import { Group, GroupHeader } from "./ui/group-header.tsx";
import { IconButton } from "./ui/icon-button.tsx";
import { ListRow, RowList } from "./ui/list-row.tsx";
import { LimitNotice, type ResultLink } from "./ui/notice.tsx";

/** 行的尺寸：主区域列表、窗格、浮层。 */
export type RowSize = "page" | "pane" | "popover";

interface ItemRowProps {
  readonly item: ItemView;
  readonly now: number;
  readonly t: ScoutTranslate;
  readonly size: RowSize;
  readonly selected: boolean;
  readonly highlight: boolean;
  readonly onOpen: (id: string) => void;
  readonly onDismiss?: ((id: string) => void) | undefined;
}

/** 一条建议：状态点、标题、摘要、以状态词开头的元信息，悬停时行尾出现忽略按钮。 */
export function ItemRow({
  item,
  now,
  t,
  size,
  selected,
  highlight,
  onOpen,
  onDismiss,
}: ItemRowProps): ReactNode {
  const title = titleOf(item);
  const status = itemStatus(t, item);
  const [source, ...rest] = metaItems(t, item, now);
  const time = rest.pop() ?? "";
  return (
    <ListRow
      variant={size === "popover" ? "popover" : "item"}
      size={size === "page" ? "page" : "pane"}
      marker={<StateDot state={status.dot} />}
      title={title}
      titleInk={status.title}
      summary={item.description !== null && item.state !== "written" ? item.description : undefined}
      status={status}
      metadata={[
        source,
        ...rest,
        <time
          key="time"
          dateTime={new Date(item.updatedAt).toISOString()}
          title={absolute(item.updatedAt, t("chart.locale"))}
        >
          {time}
        </time>,
      ]}
      selected={selected}
      highlight={highlight}
      itemId={item.id}
      onOpen={() => onOpen(item.id)}
      rowData={{ "data-state": item.state, "data-stage": item.failure?.stage }}
      actions={
        onDismiss === undefined ? undefined : (
          <IconButton
            size={24}
            label={`${t("action.dismiss")}: ${title}`}
            onClick={() => onDismiss(item.id)}
          >
            <IconCloseOutlineRegular size={12} />
          </IconButton>
        )
      }
    />
  );
}

/** 限制当前区域的条件：没有可用模型、分析关闭、由另一个窗口分析。 */
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
  return <LimitNotice text={t(key)} />;
}

export interface ItemListProps {
  readonly items: readonly ItemView[];
  readonly now: number;
  readonly t: ScoutTranslate;
  readonly size: RowSize;
  readonly selected: string | null;
  /** 从别处选中、要高亮一次的行。 */
  readonly highlight?: string | null;
  readonly onOpen: (id: string) => void;
  readonly onDismiss: (id: string) => void;
}

/** 从行上忽略一条，提示里带撤销。 */
export function dismissItem(inbox: InboxStore, id: string): void {
  void inbox.act(
    { action: "dismiss", id, similar: false },
    { key: "notice.dismissed", params: {}, undo: { action: "restore", id }, view: null },
  );
}

/** 可以从行上直接忽略：不在等模型，也还没有结论。 */
function dismissable(item: ItemView): boolean {
  return (
    !inFlight(item) &&
    item.state !== "written" &&
    item.state !== "skipped" &&
    item.state !== "dismissed"
  );
}

/** 一组行，不分组。 */
export function ItemList({
  items,
  now,
  t,
  size,
  selected,
  highlight = null,
  onOpen,
  onDismiss,
}: ItemListProps): ReactNode {
  return (
    <RowList>
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          now={now}
          t={t}
          size={size}
          selected={item.id === selected}
          highlight={item.id === highlight}
          onOpen={onOpen}
          onDismiss={dismissable(item) ? onDismiss : undefined}
        />
      ))}
    </RowList>
  );
}

/** 按状态分组的行；历史默认收起，选中的行在历史里时展开，用户点过之后按用户的选择。 */
export function GroupedItems(props: ItemListProps & { readonly sticky?: boolean }): ReactNode {
  const { items, selected, t, size, sticky = false } = props;
  const groups = groupItems(items);
  /** 用户展开或收起过历史；为 null 时跟随选中的行。 */
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const history = expanded ?? groups.history.some((item) => item.id === selected);
  const group = (
    key: "section.review" | "section.found",
    entries: readonly ItemView[],
  ): ReactNode =>
    entries.length === 0 ? null : (
      <Group title={t(key)} size={size}>
        <GroupHeader title={t(key)} count={entries.length} size={size} sticky={sticky} />
        <ItemList {...props} items={entries} />
      </Group>
    );
  return (
    <>
      {group("section.review", groups.review)}
      {group("section.found", groups.found)}
      {groups.history.length > 0 && (
        <Group title={t("section.history")} size={size}>
          <GroupHeader
            title={t("section.history")}
            count={groups.history.length}
            size={size}
            sticky={sticky}
            toggle={{
              expanded: history,
              label: t(history ? "group.collapse" : "group.expand", {
                group: t("section.history"),
              }),
              onToggle: () => setExpanded(!history),
            }}
          />
          {history && <ItemList {...props} items={groups.history} />}
        </Group>
      )}
    </>
  );
}

/** 一条提示的查看与撤销链接。 */
export function noticeLinks(
  notice: Notice,
  face: Pick<ScoutFace, "inbox" | "page" | "openPage">,
  t: ScoutTranslate,
  onView?: () => void,
): ResultLink[] {
  const { inbox } = face;
  const view = notice.view;
  const undo = notice.undo;
  return [
    ...(view === null
      ? []
      : [
          {
            label: t("notice.view"),
            onClick: () => {
              inbox.clearNotice();
              onView?.();
              showItem(face, view);
            },
          },
        ]),
    ...(undo === null
      ? []
      : [
          {
            label: t("notice.undo"),
            onClick: () => {
              inbox.clearNotice();
              void inbox.act(undo);
            },
          },
        ]),
  ];
}
