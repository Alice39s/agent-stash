/**
 * 「历史回溯提炼」页：侧栏入口与主区域页面（design 3.3）。标题下是三个分区：建议（完整收件箱，
 * 列表与右侧详情栏）、搜索、统计。页面开着时，操作与请求结束的提示显示在分区 Tab 下方。
 */
import {
  IconSkillOutlineRegular,
  SegmentedTabs,
  type SegmentedTab,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useEffect, useId, type ReactNode } from "react";
import type { InboxView, ItemView } from "../shared.ts";
import { Banner, dismissItem, GroupedItems, noticeLinks } from "./cards.tsx";
import { ItemDetail } from "./detail.tsx";
import type { FaceProps, ScoutFace } from "./face.ts";
import { groupItems, resolveItem } from "./format.ts";
import { useNow, useSinglePane, useSnapshot } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { PageTab } from "./navigation.ts";
import { SearchTab } from "./search.tsx";
import { StatsTab } from "./stats.tsx";
import { EmptyState } from "./ui/empty-state.tsx";
import { ErrorNotice, ResultNotice } from "./ui/notice.tsx";
import { SkeletonRows } from "./ui/skeleton.tsx";
import layout from "./layout.module.css";

/** 侧栏入口的图标；宿主传入边长与是否选中。 */
export function PageIcon({
  size,
}: {
  readonly size?: number;
  readonly active?: boolean;
}): ReactNode {
  return <IconSkillOutlineRegular size={size ?? 16} />;
}

/** 「建议」里显示在详情栏的卡片：选中的那张，没有选中时第一张等你决定的。 */
function currentItem(view: InboxView, selected: string | null): ItemView | undefined {
  const groups = groupItems(view.items);
  return resolveItem(view.items, selected) ?? groups.review[0] ?? groups.found[0] ?? view.items[0];
}

/**
 * 「建议」分区的列表：限制条件、按状态分组的行。从标题栏、提示或搜索打开的卡片出现在列表里后滚到可见处
 * 并高亮一次；用户在页面里点选或换分区后不再高亮。
 */
function Suggestions({
  face,
  view,
  current,
  t,
}: {
  readonly face: ScoutFace;
  readonly view: InboxView;
  readonly current: ItemView | undefined;
  readonly t: ScoutTranslate;
}): ReactNode {
  const { page, inbox } = face;
  const { reveal } = useSnapshot(page);
  const now = useNow(60_000);
  const flash = resolveItem(view.items, reveal)?.id ?? null;

  if (view.items.length === 0) {
    const sessions = view.status.analyzed.sessions;
    return (
      <>
        <Banner inbox={view} t={t} />
        <EmptyState
          text={t("panel.empty.title")}
          detail={t(sessions === 1 ? "panel.analyzed.one" : "panel.analyzed.other", { sessions })}
        />
      </>
    );
  }
  return (
    <>
      <Banner inbox={view} t={t} />
      <GroupedItems
        items={view.items}
        now={now}
        t={t}
        size="page"
        selected={current?.id ?? null}
        highlight={flash}
        onOpen={(id) => page.update({ selected: id, reveal: null })}
        onDismiss={(id) => dismissItem(inbox, id)}
      />
    </>
  );
}

export function HistoryPage(props: FaceProps): ReactNode {
  const { inbox, page, t } = props;
  const state = useSnapshot(inbox);
  const nav = useSnapshot(page);
  const baseId = useId();
  const [pageRef, single] = useSinglePane<HTMLDivElement>();

  const view = state.inbox;
  const suggestions = nav.tab === "suggestions" && view !== null;
  const current = suggestions ? currentItem(view, nav.selected) : undefined;
  const currentId = current?.id ?? null;

  // 页面开着时由页面显示提示，标题栏不再弹出。
  useEffect(() => inbox.hostNotices(), [inbox]);
  // 建议分区只有列表在眼前时列出全部卡片；单栏打开详情后列表不显示，眼前的只有详情里的那张。
  const listsAll = nav.tab === "suggestions";
  useEffect(() => {
    if (!listsAll) return undefined;
    return inbox.listing((entry) =>
      single && nav.selected !== null ? entry.id === currentId : true,
    );
  }, [inbox, listsAll, single, nav.selected, currentId]);

  const panelId = `${baseId}-panel`;
  const tab = (value: PageTab, label: string): SegmentedTab<PageTab> => ({
    value,
    label,
    id: `${baseId}-${value}`,
    panelId,
  });
  const notice = state.notice;

  return (
    <div
      ref={pageRef}
      className={layout.page}
      data-view="page"
      data-tab={nav.tab}
      data-open={(suggestions && nav.selected !== null && current !== undefined) || undefined}
    >
      <div className={layout.listPane}>
        <div className={layout.pageScroll}>
          <div className={layout.pageContent}>
            <header className={layout.pageHeading} data-window-drag="">
              <h1 className={layout.pageTitle}>{t("page.title")}</h1>
            </header>
            <SegmentedTabs
              className={layout.pageTabs}
              label={t("page.tabs")}
              items={[
                tab("suggestions", t("page.tab.suggestions")),
                tab("search", t("page.tab.search")),
                tab("stats", t("page.tab.stats")),
              ]}
              value={nav.tab}
              onChange={(next) => page.update({ tab: next, reveal: null })}
            />
            {/* 浮层开着时由浮层底部显示提示，页面不再重复同一条。 */}
            {notice !== null && !state.overlay && (
              <div className={layout.noticeRow}>
                <ResultNotice
                  text={t(notice.key, notice.params)}
                  links={noticeLinks(notice, props, t)}
                  close={{ label: t("notice.close"), onClick: () => inbox.clearNotice() }}
                />
              </div>
            )}
            {state.status === "error" && (
              <div className={layout.noticeRow}>
                <ErrorNotice
                  text={t("panel.error")}
                  retry={{ label: t("panel.retry"), onClick: () => void inbox.refresh() }}
                />
              </div>
            )}
            <div
              className={layout.tabPanel}
              role="tabpanel"
              id={panelId}
              aria-labelledby={`${baseId}-${nav.tab}`}
            >
              {view === null ? (
                state.status !== "error" && <SkeletonRows />
              ) : nav.tab === "suggestions" ? (
                <Suggestions face={props} view={view} current={current} t={t} />
              ) : nav.tab === "search" ? (
                <SearchTab face={props} view={view} t={t} />
              ) : (
                <StatsTab face={props} view={view} t={t} />
              )}
            </div>
          </div>
        </div>
      </div>
      {suggestions && view !== null && (
        <div className={layout.detailPane}>
          {current === undefined ? (
            <EmptyState text={t("detail.none")} />
          ) : (
            <ItemDetail
              face={props}
              view={view}
              item={current}
              t={t}
              size="page"
              onSelect={(id) => page.update({ selected: id })}
              onBack={single ? () => page.update({ selected: null }) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
