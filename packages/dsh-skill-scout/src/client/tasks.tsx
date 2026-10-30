/**
 * 任务（Episode）的一行：用户请求、结果、命令与改动数量、前几步或搜索命中的片段。
 * 会话 Tab 列出本会话的任务；搜索结果在前面加一个勾选框，命中的词高亮。
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import type { TaskView } from "../shared.ts";
import { ago, counted, shortPath } from "./format.ts";
import type { ScoutTranslate } from "./locale.ts";
import styles from "./tasks.module.css";

/** 正则里有特殊含义的字符。 */
const SPECIAL = /[.*+?^${}()|[\]\\]/gu;

/** 查询词：按空白切开，去掉空串。 */
export function termsOf(query: string): string[] {
  return query.split(/\s+/u).filter((term) => term !== "");
}

/** 把文本里出现的查询词包进 mark，不区分大小写。 */
export function Highlight({
  text,
  terms,
}: {
  readonly text: string;
  readonly terms: readonly string[];
}): ReactNode {
  if (terms.length === 0) return text;
  const pattern = new RegExp(
    `(${terms.map((term) => term.replaceAll(SPECIAL, "\\$&")).join("|")})`,
    "iu",
  );
  const parts: ReactNode[] = [];
  let rest = text;
  let match = pattern.exec(rest);
  while (match !== null && match[0] !== "") {
    if (match.index > 0) parts.push(rest.slice(0, match.index));
    parts.push(<mark key={parts.length}>{match[0]}</mark>);
    rest = rest.slice(match.index + match[0].length);
    match = pattern.exec(rest);
  }
  if (rest !== "") parts.push(rest);
  return parts;
}

/** 搜索结果的勾选框。 */
export interface TaskPick {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
}

export interface TaskRowProps {
  readonly task: TaskView;
  readonly now: number;
  readonly t: ScoutTranslate;
  readonly terms: readonly string[];
  readonly pick: TaskPick | null;
  readonly openSession: ((sessionId: string) => void) | null;
}

export function TaskRow({ task, now, t, terms, pick, openSession }: TaskRowProps): ReactNode {
  const counts = [
    task.commands > 0 ? counted(t, "task.commands", task.commands) : null,
    task.edits > 0 ? counted(t, "task.edits", task.edits) : null,
    task.recoveries > 0 ? counted(t, "task.recoveries", task.recoveries) : null,
  ].filter((entry) => entry !== null);
  const lines = task.matches.length > 0 ? task.matches : task.steps;
  return (
    <li className={styles.task} data-outcome={task.outcome} data-episode={task.episodeId}>
      {pick !== null && (
        <input
          type="checkbox"
          className={styles.pick}
          aria-label={t("search.pick", { goal: task.goal })}
          checked={pick.checked}
          disabled={pick.disabled}
          onChange={(event) => pick.onChange(event.target.checked)}
        />
      )}
      <div className={styles.body}>
        <p className={styles.goal}>
          <Highlight text={task.goal} terms={terms} />
        </p>
        <p className={styles.meta}>
          <span className={styles.outcome}>{t(`outcome.${task.outcome}`)}</span>
          <span>{ago(t, task.at, now)}</span>
          {counts.map((count) => (
            <span key={count}>{count}</span>
          ))}
          {task.cwd !== null && <span className={styles.path}>{shortPath(task.cwd)}</span>}
        </p>
        {lines.length > 0 && (
          <ul className={styles.lines} data-matches={task.matches.length > 0 || undefined}>
            {lines.map((line, index) => (
              <li key={`${String(index)}:${line}`}>
                <code>
                  <Highlight text={line} terms={terms} />
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>
      {openSession !== null && (
        <Button size="sm" variant="ghost" onClick={() => openSession(task.sessionId)}>
          {t("detail.openSession")}
        </Button>
      )}
    </li>
  );
}
