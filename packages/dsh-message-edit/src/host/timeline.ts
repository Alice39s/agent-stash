/**
 * 时间线投影：版本树来自 `sessionQuery.traceSession` 与 header 的 `parentSession`，每个版本的效果
 * 来自版本表；撤销栈沿「有版本记录的版本 → 它的来源版本」往回走，重做是当前版本带记录的直接子版本。
 */
import type { MessageEditTimeline, VersionRecord, VersionSummary } from "../shared.ts";
import { readLineage, readSessionLog } from "./dsh-read.ts";
import type { MessageEditContext } from "./dsh.ts";
import { closedTurns, editableMessages, retryableTurns, type ClosedTurn } from "./history.ts";
import type { LineageNode } from "./model.ts";
import type { VersionTable } from "./version-store.ts";

export interface TimelineInput {
  readonly sessionId: string;
  /** 当前版本所在的整棵可见版本树，深度优先排列。 */
  readonly lineage: readonly LineageNode[];
  /** 版本树里带版本记录的会话。 */
  readonly records: ReadonlyMap<string, VersionRecord>;
  /** 当前版本的已结束回合。 */
  readonly turns: readonly ClosedTurn[];
}

/** 版本记录的来源必须就是会话 header 记录的父会话。 */
function assertRecordMatches(node: LineageNode, record: VersionRecord): void {
  if (record.parentSessionId !== node.parentSessionId) {
    throw new Error(
      `版本 ${node.sessionId} 的记录来源 ${record.parentSessionId} 与会话的父会话 ${node.parentSessionId ?? "（无）"} 不一致`,
    );
  }
}

/** 从当前版本沿 parentSession 往上能到达的版本。 */
function currentPath(
  nodes: ReadonlyMap<string, LineageNode>,
  sessionId: string,
): ReadonlySet<string> {
  const path = new Set<string>();
  for (
    let cursor = nodes.get(sessionId);
    cursor !== undefined && !path.has(cursor.sessionId);
    cursor = cursor.parentSessionId === undefined ? undefined : nodes.get(cursor.parentSessionId)
  ) {
    path.add(cursor.sessionId);
  }
  return path;
}

/** 从当前版本往回、可以逐个撤销到的版本；第一个是直接来源版本。 */
function undoStack(
  nodes: ReadonlyMap<string, LineageNode>,
  records: ReadonlyMap<string, VersionRecord>,
  sessionId: string,
): string[] {
  const stack: string[] = [];
  for (
    let record = records.get(sessionId);
    record !== undefined;
    record = records.get(record.parentSessionId)
  ) {
    const target = record.parentSessionId;
    if (target === sessionId || stack.includes(target)) {
      throw new Error(`会话 ${sessionId} 的撤销链在版本 ${target} 处形成循环`);
    }
    if (!nodes.has(target)) {
      throw new Error(`会话 ${sessionId} 的撤销目标 ${target} 不在可见版本树里`);
    }
    stack.push(target);
  }
  return stack;
}

/** 一个版本的摘要；本插件创建的版本以操作时间为创建时间，并带上效果。 */
function versionSummary(
  node: LineageNode,
  record: VersionRecord | undefined,
  sessionId: string,
  path: ReadonlySet<string>,
): VersionSummary {
  return {
    sessionId: node.sessionId,
    ...(node.parentSessionId === undefined ? {} : { parentSessionId: node.parentSessionId }),
    createdAt: record === undefined ? node.createdAt : record.createdAt,
    depth: node.depth,
    current: node.sessionId === sessionId,
    onCurrentEffectPath: path.has(node.sessionId),
    ...(record === undefined ? {} : { effect: record.effect }),
  };
}

export function projectTimeline(input: TimelineInput): MessageEditTimeline {
  const { sessionId, lineage, records } = input;
  const nodes = new Map(lineage.map((node) => [node.sessionId, node]));
  if (!nodes.has(sessionId)) {
    throw new Error(`会话 ${sessionId} 不在它自己的版本树里`);
  }
  const effectOwners = new Map<string, string>();
  for (const [id, record] of records) {
    const node = nodes.get(id);
    if (node === undefined) throw new Error(`版本记录 ${id} 不在会话 ${sessionId} 的版本树里`);
    assertRecordMatches(node, record);
    const owner = effectOwners.get(record.effect.id);
    if (owner !== undefined) {
      throw new Error(`版本 ${owner} 与 ${id} 记录了同一个效果 ${record.effect.id}`);
    }
    effectOwners.set(record.effect.id, id);
  }
  const path = currentPath(nodes, sessionId);
  const versions = lineage.map((node) =>
    versionSummary(node, records.get(node.sessionId), sessionId, path),
  );
  const redoSessionIds = versions
    .filter((version) => version.parentSessionId === sessionId && version.effect !== undefined)
    .toSorted(
      (left, right) =>
        left.createdAt - right.createdAt || left.sessionId.localeCompare(right.sessionId),
    )
    .map((version) => version.sessionId);
  return {
    sessionId,
    messages: editableMessages(input.turns),
    retryableTurns: retryableTurns(input.turns),
    versions,
    undoStack: undoStack(nodes, records, sessionId),
    redoSessionIds,
  };
}

/** 读取一个会话的时间线。 */
export async function loadTimeline(
  ctx: MessageEditContext,
  versions: VersionTable,
  sessionId: string,
): Promise<MessageEditTimeline> {
  const [lineage, log] = await Promise.all([
    readLineage(ctx.sessionQuery, sessionId),
    readSessionLog(ctx, sessionId),
  ]);
  const records = new Map(
    lineage.flatMap((node) => {
      const record = versions.get(node.sessionId);
      return record === undefined ? [] : [[node.sessionId, record] as const];
    }),
  );
  return projectTimeline({ sessionId, lineage, records, turns: closedTurns(log.view) });
}
