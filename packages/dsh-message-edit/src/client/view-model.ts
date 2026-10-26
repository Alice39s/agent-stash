/**
 * 三个界面表面共用的视图模型：把时间线快照整理成回合分组、消息动作目标、版本步进与版本树行。
 * 只做纯计算，组件负责呈现。
 */
import type {
  CascadePolicy,
  EditableBlockKind,
  EditableMessageBlock,
  MessageEditTimeline,
  RetryableTurn,
  VersionSummary,
} from "../shared.ts";
import type { MessageEditState } from "./controller.ts";
import type { MessageEditKey, MessageEditTranslate } from "./locale.ts";

/** 后续回合策略的两个选项，按界面顺序排列。 */
export const CASCADE_POLICIES: readonly CascadePolicy[] = ["truncate", "preserve"];

/** 版本树缩进的最大层数；更深的版本沿用这一层的缩进。 */
export const MAX_TREE_INDENT = 6;

/** 块种类的名称。 */
export const BLOCK_LABEL_KEYS: Readonly<Record<EditableBlockKind, MessageEditKey>> = {
  user: "block.user",
  "assistant.reasoning": "block.assistant.reasoning",
  "assistant.response": "block.assistant.response",
};

/** 编辑对话框在文本步骤的标题。 */
export const DIALOG_TITLE_KEYS: Readonly<Record<EditableBlockKind, MessageEditKey>> = {
  user: "dialog.title.user",
  "assistant.reasoning": "dialog.title.assistant.reasoning",
  "assistant.response": "dialog.title.assistant.response",
};

const CASCADE_LABEL_KEYS: Readonly<Record<CascadePolicy, MessageEditKey>> = {
  truncate: "cascade.truncate",
  preserve: "cascade.preserve",
};

const CASCADE_HINT_KEYS: Readonly<Record<CascadePolicy, MessageEditKey>> = {
  truncate: "cascade.truncate.hint",
  preserve: "cascade.preserve.hint",
};

/** 后续回合策略选项的名称与说明。 */
export function cascadeCopy(
  t: MessageEditTranslate,
  policy: CascadePolicy,
): { readonly label: string; readonly hint: string } {
  return { label: t(CASCADE_LABEL_KEYS[policy]), hint: t(CASCADE_HINT_KEYS[policy]) };
}

/** 选取整个控制器快照；快照不可变，引用只在更新时变化。 */
export function selectState(state: MessageEditState): MessageEditState {
  return state;
}

/** 有操作在进行，或时间线不是就绪状态时，发起操作的控件都不可用；控制器在这两种情况下也会拒绝操作。 */
export function operationsBlocked(state: MessageEditState): boolean {
  return state.pending !== null || state.status !== "ready";
}

/** 主区里的一个回合分组。 */
export interface TurnGroup {
  readonly turn: number;
  /** 由用户消息触发的回合才可以重试与编辑；插件注入的回合只读。 */
  readonly retry: RetryableTurn | undefined;
  readonly blocks: readonly EditableMessageBlock[];
}

/** 按回合号升序分组可编辑块与可重试回合。 */
export function turnGroups(timeline: MessageEditTimeline): TurnGroup[] {
  const turns = new Set([
    ...timeline.messages.map((block) => block.turn),
    ...timeline.retryableTurns.map((retry) => retry.turn),
  ]);
  return [...turns]
    .toSorted((left, right) => left - right)
    .map((turn) => ({
      turn,
      retry: timeline.retryableTurns.find((retry) => retry.turn === turn),
      blocks: timeline.messages.filter((block) => block.turn === turn),
    }));
}

/** 最后一个已结束回合的回合号；没有回合时为 undefined。 */
export function lastTurn(timeline: MessageEditTimeline): number | undefined {
  const turns = [
    ...timeline.messages.map((block) => block.turn),
    ...timeline.retryableTurns.map((retry) => retry.turn),
  ];
  return turns.length === 0 ? undefined : Math.max(...turns);
}

/** 聊天区一条助手消息能做的事：编辑本回合的用户消息或这条消息的块，重试本回合。 */
export interface MessageTarget {
  readonly retry: RetryableTurn;
  /** 用户消息的块在前，这条助手消息的块按块顺序在后。 */
  readonly choices: readonly EditableMessageBlock[];
  /** 这一回合之后还有回合时，编辑需要选择后续回合策略。 */
  readonly hasLaterTurns: boolean;
}

/**
 * 找到 `messageId` 对应的助手消息。消息不在时间线里，或所在回合没有用户输入
 * （Host 无法重建这样的回合），都返回 undefined。
 */
export function messageTarget(
  timeline: MessageEditTimeline,
  messageId: string,
): MessageTarget | undefined {
  const own = timeline.messages.filter((block) => block.messageId === messageId);
  const turn = own[0]?.turn;
  if (turn === undefined) return undefined;
  const retry = timeline.retryableTurns.find((candidate) => candidate.turn === turn);
  if (retry === undefined) return undefined;
  const users = timeline.messages.filter((block) => block.turn === turn && block.kind === "user");
  return {
    retry,
    choices: [...users, ...own.toSorted((left, right) => left.blockIndex - right.blockIndex)],
    hasLaterTurns: lastTurn(timeline) !== turn,
  };
}

/** Host 只重新生成由用户消息触发、带有助手文本的最后一个回合；没有这样的回合时不提供重新生成。 */
export function canReroll(timeline: MessageEditTimeline): boolean {
  return timeline.retryableTurns.some((retry) =>
    timeline.messages.some((block) => block.turn === retry.turn && block.kind !== "user"),
  );
}

/** 编辑对话框里说明保存后果的一行。 */
export function dialogHintKey(hasLaterTurns: boolean, cascade: CascadePolicy): MessageEditKey {
  if (!hasLaterTurns) return "dialog.hint.last";
  return cascade === "truncate" ? "dialog.hint.truncate" : "dialog.hint.preserve";
}

/** 标题栏与工具栏的版本步进。 */
export interface Stepper {
  readonly previous: string | undefined;
  readonly next: string | undefined;
  /** 当前版本的直接子版本数；多于一个时「下一版本」进入最新的那个。 */
  readonly branches: number;
  /** 当前版本在「撤销栈 + 当前 + 最新子版本链」这条线上的位置，从 1 开始。 */
  readonly position: number;
  readonly total: number;
}

/** 与 Host 计算 `redoSessionIds` 相同的规则：带效果的直接子版本里创建最晚的一个。 */
function newestChild(versions: readonly VersionSummary[], sessionId: string): string | undefined {
  return versions
    .filter((version) => version.parentSessionId === sessionId && version.effect !== undefined)
    .toSorted(
      (left, right) =>
        left.createdAt - right.createdAt || left.sessionId.localeCompare(right.sessionId),
    )
    .at(-1)?.sessionId;
}

export function stepper(timeline: MessageEditTimeline): Stepper {
  const next = timeline.redoSessionIds.at(-1);
  let forward = 0;
  for (let cursor = next; cursor !== undefined; cursor = newestChild(timeline.versions, cursor)) {
    forward += 1;
  }
  const position = timeline.undoStack.length + 1;
  return {
    previous: timeline.undoStack[0],
    next,
    branches: timeline.redoSessionIds.length,
    position,
    total: position + forward,
  };
}

/** 版本树里一行的标记颜色：当前版本、它的上游版本、其他版本。 */
export type VersionTone = "current" | "ancestor" | "other";

export interface VersionRow {
  readonly version: VersionSummary;
  /** 缩进层数，最多 `MAX_TREE_INDENT`。 */
  readonly indent: number;
  readonly tone: VersionTone;
}

export function versionRows(timeline: MessageEditTimeline): VersionRow[] {
  return timeline.versions.map((version) => ({
    version,
    indent: Math.min(version.depth, MAX_TREE_INDENT),
    tone: version.current ? "current" : version.onCurrentEffectPath ? "ancestor" : "other",
  }));
}

/** 版本行的标题：操作与回合；没有效果的版本按是否有父版本称为原始版本或分支。 */
export function versionTitle(version: VersionSummary, t: MessageEditTranslate): string {
  const effect = version.effect;
  if (effect === undefined) {
    return t(version.parentSessionId === undefined ? "version.original" : "version.branch");
  }
  const params = { turn: effect.targetTurn };
  if (effect.operation !== "edit") return t(`version.${effect.operation}`, params);
  return t(
    effect.blockKind === undefined ? "version.edit" : `version.edit.${effect.blockKind}`,
    params,
  );
}

/** radiogroup 的方向键导航：返回新选中项的下标，其他按键返回 undefined。 */
export function nextRadioIndex(index: number, key: string, count: number): number | undefined {
  switch (key) {
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
}
