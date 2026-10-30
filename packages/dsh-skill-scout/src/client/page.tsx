/**
 * 「历史回溯提炼」页：侧栏入口与主区域页面。页内三个分栏：建议（完整收件箱，左列表右详情）、搜索、统计。
 * 页面开着时，操作与请求结束的提示显示在页头下方。
 */
import {
  IconCloseOutlineRegular,
  IconSkillOutlineRegular,
  SegmentedControl,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useEffect, useId, type ReactNode } from "react";
import type { InboxView } from "../shared.ts";
import { Banner, dismissItem, EmptyInbox, GroupedCards, NoticeBar } from "./cards.tsx";
import { ItemDetail } from "./detail.tsx";
import type { FaceProps, ScoutFace } from "./face.ts";
import { groupItems, resolveItem } from "./format.ts";
import { useNow, useSnapshot } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { PageTab } from "./navigation.ts";
import { SearchTab } from "./search.tsx";
import { StatsTab } from "./stats.tsx";
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

/** 「建议」分栏：分组的卡片与选中卡片的详情；没有选中时显示第一张等你决定的卡片。 */
function Suggestions({
  face,
  view,
  t,
}: {
  readonly face: ScoutFace;
  readonly view: InboxView;
  readonly t: ScoutTranslate;
}): ReactNode {
  const { page, inbox } = face;
  const { selected } = useSnapshot(page);
  const now = useNow(60_000);
  const groups = groupItems(view.items);
  const current =
    resolveItem(view.items, selected) ?? groups.review[0] ?? groups.found[0] ?? view.items[0];
  const select = (id: string): void => page.update({ selected: id });
  return (
    <div className={layout.root} data-view="suggestions">
      <Banner inbox={view} t={t} />
      <div className={layout.columns}>
        <div className={layout.list}>
          {view.items.length === 0 ? (
            <EmptyInbox inbox={view} t={t} />
          ) : (
            <GroupedCards
              items={view.items}
              now={now}
              t={t}
              selected={current?.id ?? null}
              onOpen={select}
              onDismiss={(id) => dismissItem(inbox, id)}
            />
          )}
        </div>
        <div className={layout.detail}>
          {current === undefined ? (
            <p className={layout.placeholder}>{t("detail.none")}</p>
          ) : (
            <ItemDetail face={face} view={view} item={current} t={t} onSelect={select} />
          )}
        </div>
      </div>
    </div>
  );
}

export function HistoryPage(props: FaceProps): ReactNode {
  const { inbox, page, t } = props;
  const state = useSnapshot(inbox);
  const nav = useSnapshot(page);
  const tabsId = useId();

  // 页面开着时由页面显示提示，标题栏不再弹出。
  useEffect(() => inbox.hostNotices(), [inbox]);

  const tabs: { value: PageTab; label: string }[] = [
    { value: "suggestions", label: t("page.tab.suggestions") },
    { value: "search", label: t("page.tab.search") },
    { value: "stats", label: t("page.tab.stats") },
  ];
  const view = state.inbox;
  return (
    <div className={layout.page}>
      <header className={layout.pageHead}>
        <h1 className={layout.pageTitle}>{t("page.title")}</h1>
        <SegmentedControl
          id={tabsId}
          label={t("page.tabs")}
          value={nav.tab}
          options={tabs}
          onChange={(tab) => page.update({ tab })}
        />
      </header>
      {state.notice !== null && (
        <div className={layout.notice} role="status">
          <NoticeBar notice={state.notice} face={props} t={t} />
          <button
            type="button"
            className={layout.noticeClose}
            aria-label={t("notice.close")}
            onClick={() => inbox.clearNotice()}
          >
            <IconCloseOutlineRegular size={12} />
          </button>
        </div>
      )}
      {state.status === "error" && (
        <p className={layout.error} role="alert">
          {t("panel.error")}
        </p>
      )}
      {view === null ? (
        state.status !== "error" && (
          <p className={layout.note} role="status">
            {t("panel.loading")}
          </p>
        )
      ) : (
        <div className={layout.tabPanel} role="tabpanel" aria-labelledby={`${tabsId}-${nav.tab}`}>
          {nav.tab === "suggestions" && <Suggestions face={props} view={view} t={t} />}
          {nav.tab === "search" && <SearchTab face={props} view={view} t={t} />}
          {nav.tab === "stats" && <StatsTab face={props} view={view} t={t} />}
        </div>
      )}
    </div>
  );
}
