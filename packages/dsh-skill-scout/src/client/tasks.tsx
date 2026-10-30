/**
 * 任务（Episode）的一行：会话视图里是建议引用的任务记录，一行命令序列；搜索结果在标记列放勾选框、
 * 标题前放结果状态点，代码行是命中的片段并高亮查询词。元信息以结果开头，后面是时间、数量与工作目录。
 */
import {
  Checkbox,
  IconChevronRightOutlineRegular,
  PathLabel,
  StateDot,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import type { TaskView } from "../shared.ts";
import { absolute, ago, counted, taskStatus } from "./format.ts";
import type { ScoutTranslate } from "./locale.ts";
import { CommandSequence, MatchedLines } from "./ui/code-line.tsx";
import { IconButton } from "./ui/icon-button.tsx";
import { ListRow } from "./ui/list-row.tsx";
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
  const status = taskStatus(t, task.outcome);
  const counts = [
    task.commands > 0 ? counted(t, "task.commands", task.commands) : null,
    task.edits > 0 ? counted(t, "task.edits", task.edits) : null,
    task.recoveries > 0 ? counted(t, "task.recoveries", task.recoveries) : null,
  ].filter((entry) => entry !== null);
  const sequence = (
    <CommandSequence
      steps={task.steps}
      more={(count) => t("task.more", { count })}
      label={t("task.sequence", { steps: task.steps.join(", ") })}
    />
  );
  const dot = <StateDot state={status.dot} />;
  return (
    <ListRow
      variant={pick === null ? "record" : "select"}
      size={pick === null ? "pane" : "page"}
      marker={
        pick === null ? (
          dot
        ) : (
          <Checkbox
            className={styles.pick}
            label={t("search.pick", { goal: task.goal })}
            checked={pick.checked}
            disabled={pick.disabled}
            onChange={pick.onChange}
          />
        )
      }
      titleDot={pick === null ? undefined : dot}
      title={<Highlight text={task.goal} terms={terms} />}
      code={
        task.matches.length > 0 ? (
          <MatchedLines
            lines={task.matches.map((line) => (
              <Highlight key={line} text={line} terms={terms} />
            ))}
          />
        ) : (
          sequence
        )
      }
      status={status}
      metadata={[
        <time
          key="time"
          dateTime={new Date(task.at).toISOString()}
          title={absolute(task.at, t("chart.locale"))}
        >
          {ago(t, task.at, now)}
        </time>,
        ...counts,
      ]}
      metaFill={task.cwd === null ? undefined : <PathLabel path={task.cwd} />}
      selected={pick?.checked ?? false}
      rowData={{ "data-outcome": task.outcome, "data-episode": task.episodeId }}
      actions={
        openSession === null ? undefined : (
          <IconButton
            size={24}
            label={t("detail.openSession")}
            onClick={() => openSession(task.sessionId)}
          >
            <IconChevronRightOutlineRegular size={14} />
          </IconButton>
        )
      }
    />
  );
}
