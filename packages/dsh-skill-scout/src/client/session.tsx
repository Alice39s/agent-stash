/**
 * 会话 Tab「经验提炼」：本会话的分析状态与「立即分析」「提炼本会话」，左栏是引用本会话的建议与本会话的任务，
 * 右栏就地显示选中建议的详情。会话的分析情况随收件箱的工作状态重新读取。
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, useState, type ReactNode } from "react";
import type { Action, SessionView } from "../shared.ts";
import { Banner, CardList, dismissItem } from "./cards.tsx";
import { ItemDetail } from "./detail.tsx";
import type { FaceProps } from "./face.ts";
import { ago, citing, resolveItem } from "./format.ts";
import { useAction, useLoaded, useNow, useSnapshot } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import { TaskRow } from "./tasks.tsx";
import layout from "./layout.module.css";

export type SessionTabProps = FaceProps & { readonly sessionId: string };

/** 会话分析状态的一行文案。 */
function stateText(t: ScoutTranslate, view: SessionView, now: number): string {
  switch (view.state) {
    case "analyzed": {
      const count = view.tasks.length;
      const text = t(count === 1 ? "session.state.analyzed.one" : "session.state.analyzed.other", {
        count,
      });
      return view.scannedAt === null ? text : `${text} · ${ago(t, view.scannedAt, now)}`;
    }
    case "failed":
      return t("session.state.failed", { error: view.error ?? "" });
    default:
      return t(`session.state.${view.state}`);
  }
}

export function SessionTab(props: SessionTabProps): ReactNode {
  const { inbox, sessionId, loadSession, t } = props;
  const state = useSnapshot(inbox);
  const [selected, setSelected] = useState<string | null>(null);
  const { busy, error, run } = useAction(inbox, t);
  const now = useNow(60_000);

  // 分析进度、已分析的会话与任务数变化，或本 Tab 发起的操作结束后，重新读取本会话的情况。
  const status = state.inbox?.status;
  const [acted, setActed] = useState(0);
  const revision = [
    status?.scanning,
    status?.waiting,
    status?.analyzed.sessions,
    status?.analyzed.episodes,
    acted,
  ].join(":");
  const load = useCallback(
    (_revision: string, signal: AbortSignal) => loadSession(sessionId, signal),
    [loadSession, sessionId],
  );
  const session = useLoaded(load, revision);

  const view = state.inbox;
  const items = citing(view?.items ?? [], sessionId);
  const current = resolveItem(items, selected) ?? items[0];
  const value = session.status === "ready" ? session.value : null;
  const closed = value === null || value.state === "subagent" || value.state === "missing";

  /** 分析或提炼本会话；提炼成功后选中 Host 返回的线索，它已有 idea 时落到第一个 idea。 */
  const send = async (action: Action): Promise<void> => {
    const result = await run(action);
    setActed((count) => count + 1);
    if (result?.ok === true && result.leadId !== undefined) setSelected(result.leadId);
  };

  // data-conversation-composer-overlay：DSH 据此把视图区固定为可见高度，输入框浮在底部，视图自己留出它的高度。
  return (
    <div className={layout.root} data-view="session" data-conversation-composer-overlay="">
      <div className={layout.bar}>
        <p className={layout.state} data-state={value?.state} role="status">
          {session.status === "error"
            ? t("session.error", { error: session.error })
            : value === null
              ? t("panel.loading")
              : stateText(t, value, now)}
        </p>
        <span className={layout.spacer} />
        <Button
          size="sm"
          variant="outline"
          disabled={closed || busy}
          onClick={() => void send({ action: "analyze-session", sessionId })}
        >
          {t("session.analyze")}
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={closed || value.tasks.length === 0 || status?.models.summary == null || busy}
          onClick={() => void send({ action: "extract-session", sessionId })}
        >
          {t("session.extract")}
        </Button>
      </div>
      {error !== null && (
        <p className={layout.error} role="alert">
          {error}
        </p>
      )}
      {view !== null && <Banner inbox={view} t={t} />}
      <div className={layout.columns}>
        <div className={layout.list}>
          <section className={layout.group} aria-label={t("session.items")}>
            <h3 className={layout.groupTitle}>{t("session.items")}</h3>
            {items.length === 0 ? (
              <p className={layout.note}>{t("session.items.empty")}</p>
            ) : (
              <CardList
                items={items}
                now={now}
                t={t}
                selected={current?.id ?? null}
                onOpen={setSelected}
                onDismiss={(id) => dismissItem(inbox, id)}
              />
            )}
          </section>
          <section className={layout.group} aria-label={t("session.tasks")}>
            <h3 className={layout.groupTitle}>{t("session.tasks")}</h3>
            {value !== null && value.tasks.length === 0 && (
              <p className={layout.note}>{t("session.tasks.empty")}</p>
            )}
            {value !== null && value.tasks.length > 0 && (
              <ul className={layout.tasks}>
                {value.tasks.map((task) => (
                  <TaskRow
                    key={task.episodeId}
                    task={task}
                    now={now}
                    t={t}
                    terms={[]}
                    pick={null}
                    openSession={null}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className={layout.detail}>
          {view !== null && current !== undefined ? (
            <ItemDetail face={props} view={view} item={current} t={t} onSelect={setSelected} />
          ) : (
            <p className={layout.placeholder}>{t("detail.none")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
