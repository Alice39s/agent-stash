/**
 * 版本事务：在源会话的维护阶段创建子版本 Agent，等它落盘，写版本记录，挂进源会话所在的工作区，
 * 最后排队后续用户输入。任何一步失败都逆序撤销已经完成的步骤。
 */
import type { MessageEditOperation, MessageEditOperationResult } from "../shared.ts";
import { liveSessionLog, storedSessionLog } from "./dsh-read.ts";
import type { DshAgent, DshAgentScope, MessageEditContext } from "./dsh.ts";
import { conflictError } from "./errors.ts";
import { agentOptions, forkRequest, userMessage } from "./fork.ts";
import { closedTurns, latestRoute, sessionPreset } from "./history.ts";
import { planOperation } from "./plan.ts";
import type { VersionTable } from "./version-store.ts";

/** 撤销一个已经完成的步骤。 */
type Undo = () => Promise<void>;

/** 在 Agent 的空闲阶段运行任务；Agent 正忙时 `runMaintenance` 同步抛出，翻译成业务冲突。 */
function duringMaintenance<T>(
  agent: DshAgent,
  sessionId: string,
  task: () => Promise<T>,
): Promise<T> {
  try {
    return agent.runMaintenance(task);
  } catch (error) {
    throw conflictError(`会话 ${sessionId} 正在运行或正在创建其他版本，结束后再试`, {
      cause: error,
    });
  }
}

/** 拿到源会话的 Agent：live 的直接用，否则临时恢复一个，任务结束后释放。 */
async function withSourceAgent<T>(
  ctx: MessageEditContext,
  sessionId: string,
  task: (agent: DshAgent) => Promise<T>,
): Promise<T> {
  const live = ctx.agents.get(sessionId);
  if (live !== undefined) return duringMaintenance(live, sessionId, () => task(live));
  const stored = storedSessionLog(await ctx.sessionQuery.readSession(sessionId));
  const handle = await ctx.agents.resume({
    resumeSessionId: sessionId,
    agentOptions: agentOptions(sessionId, stored.format, latestRoute(stored.view), undefined),
  });
  try {
    return await duringMaintenance(handle.agent, sessionId, () => task(handle.agent));
  } finally {
    await handle.dispose();
  }
}

/** 子版本沿用源会话的 Agent 预设；部署没有预设服务或会话没有预设时返回 undefined。 */
async function presetSetup(
  ctx: MessageEditContext,
  presetId: string | undefined,
): Promise<
  { readonly id: string; readonly setup: (scope: DshAgentScope) => Promise<void> } | undefined
> {
  const presets = ctx.get("agentPresets");
  if (presets === undefined || presetId === undefined) return undefined;
  const { id } = await presets.resolve(presetId);
  return {
    id,
    setup: async (scope) => {
      await presets.mount(scope, id);
    },
  };
}

/** 逆序执行撤销步骤，返回失败的步骤抛出的错误。 */
async function rollback(undo: readonly Undo[]): Promise<Error[]> {
  const failures: Error[] = [];
  for (const step of undo.toReversed()) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- 撤销必须按完成顺序的逆序逐个执行
      await step();
    } catch (failure) {
      failures.push(failure instanceof Error ? failure : new Error(String(failure)));
    }
  }
  return failures;
}

async function createVersion(
  ctx: MessageEditContext,
  versions: VersionTable,
  operation: MessageEditOperation,
  source: DshAgent,
): Promise<MessageEditOperationResult> {
  const log = liveSessionLog(source.session);
  const plan = planOperation(operation, closedTurns(log.view));
  const options = agentOptions(log.id, log.format, latestRoute(log.view), source.options);
  const preset = await presetSetup(ctx, sessionPreset(log.view, log.agentPreset));
  const createdAt = Date.now();
  const fork = forkRequest(log, plan, preset?.id, createdAt);
  const childId = `session-${crypto.randomUUID()}`;
  const undo: Undo[] = [];
  try {
    const child = await ctx.agents.create({
      sessionId: childId,
      seed: fork.seed,
      meta: fork.meta,
      ...(fork.inheritedEventCount === undefined
        ? {}
        : { inheritedEventCount: fork.inheritedEventCount }),
      agentOptions: options,
      ...(preset === undefined ? {} : { setup: preset.setup }),
    });
    undo.push(() => child.dispose());
    // 继承前缀停在某个 `turn/start` 之前，含有该回合用户输入入队、尚未出队的记录。0.2.1-rc.3 的
    // inbox 投影折叠整段日志，不清掉的话子版本会先重跑那条原始输入；0.1.0-rc.3 只折叠 seed 之后的
    // 事件，inbox 本来就是空的，`clear()` 不写日志。
    child.agent.inbox.clear();
    await ctx.sessions.flush(child.agent.session);

    await versions.put(childId, { parentSessionId: log.id, createdAt, effect: plan.effect });
    undo.push(async () => {
      await versions.delete(childId);
    });

    const workspace = ctx.workspaceRegistry
      .list()
      .find((candidate) => candidate.sessionIds.includes(log.id));
    if (workspace !== undefined) {
      await workspace.attachSession(childId);
      undo.push(() => workspace.detachSession(childId));
    }

    for (const prompt of plan.queuedPrompts) child.agent.followup(userMessage(prompt));
    return { sessionId: childId, queuedTurns: plan.queuedPrompts.length };
  } catch (error) {
    const failures = await rollback(undo);
    if (failures.length > 0) {
      throw new AggregateError(
        [error, ...failures],
        `会话 ${log.id} 的 ${operation.action} 版本 ${childId} 创建失败，撤销已完成的步骤也失败`,
        { cause: error },
      );
    }
    throw error;
  }
}

/** 执行一次版本操作，返回新版本的会话 id 与排队的回合数。 */
export function runOperation(
  ctx: MessageEditContext,
  versions: VersionTable,
  operation: MessageEditOperation,
): Promise<MessageEditOperationResult> {
  return withSourceAgent(ctx, operation.sessionId, (source) =>
    createVersion(ctx, versions, operation, source),
  );
}
