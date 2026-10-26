import { useRef, useState, type ReactNode } from "react";
import type { PanelRow, StashKit, SwapDirection } from "../../kit/src/service.ts";
import {
  caretEdges,
  triggerMenuOpen,
  useComposer,
  useComposerKeys,
  usePointerOutside,
} from "../../shared/client/composer.ts";
import {
  CLIENT_INJECT,
  type DshClientContext,
  type OverlayProps,
} from "../../shared/client/dsh.ts";
import { fetchSessionPrompts, type SessionItem } from "../../shared/client/fetch.ts";
import { clockTime, counter, dayLabel, useRemoteList } from "../../shared/client/format.ts";
import { installDictionaries } from "../../shared/client/resources.ts";
import { daySections } from "../../shared/prompts.ts";
import { en, zh, type RecallKey } from "./locales.ts";
import { CLOSED, recallKey, type RecallEffect, type RecallState } from "./recall.ts";

/** 插件名，也是条目 id 与词典命名空间。 */
const PLUGIN = "dsh-recall";
/** Host 半部注册的历史路由（文档相对路径）。 */
const ROUTE = "dsh-recall/prompts";

/** 按日期分组的面板行，时间正序，最新一条贴近输入框。 */
function panelRows(
  prompts: readonly SessionItem[],
  now: number,
  words: { today: string; yesterday: string },
): PanelRow[] {
  const rows: PanelRow[] = [];
  for (const section of daySections(prompts, now)) {
    const label = dayLabel(section.day, words);
    for (const { index } of section.items) {
      const prompt = prompts[index];
      if (prompt === undefined) continue;
      rows.push({
        key: String(index),
        text: prompt.text,
        meta: clockTime(prompt.time),
        section: label,
      });
    }
  }
  return rows;
}

/** 新草稿相对旧草稿的翻看方向，决定草稿切换动画从哪边进入。 */
function swapDirection(previous: RecallState, effect: RecallEffect): SwapDirection | undefined {
  if (effect.kind === "restore") return "restore";
  if (effect.kind !== "show") return undefined;
  if (!previous.open) return "older";
  return effect.index < previous.index ? "older" : "newer";
}

/** 输入框里的 ↑↓ 历史回溯：草稿开头按 ↑ 打开面板，在本会话发过的 Prompt 之间切换。 */
function createRecallOverlay(kit: StashKit): (props: OverlayProps<RecallKey>) => ReactNode {
  const { Panel } = kit;
  return function RecallOverlay(props: OverlayProps<RecallKey>): ReactNode {
    const { sessionId, useInput, inputActions, useProjection, t } = props;
    const [anchor, composer] = useComposer();
    // oxlint-disable-next-line react/hooks -- 槽位标准属性里的 Hook 在组件生命周期内不变。
    const draft = useInput((state) => state.draft);
    // oxlint-disable-next-line react/hooks -- 同上。
    const editable = useInput((state) => state.phase === "plain" && state.occurrences.length === 0);
    // oxlint-disable-next-line react/hooks -- 同上。
    const stamp = useProjection("sessionListMetadata", (value) => value?.lastPromptAt ?? null);
    const { items: prompts, loadedAt } = useRemoteList(
      PLUGIN,
      (signal) => fetchSessionPrompts(ROUTE, sessionId, signal),
      `${sessionId}:${String(stamp)}`,
    );
    const [state, setState] = useState<RecallState>(CLOSED);
    // 连续按键之间可能来不及重新渲染，按键处理以这里的值为准。
    const latest = useRef<RecallState>(CLOSED);

    const update = (next: RecallState, effect: RecallEffect): void => {
      const direction = swapDirection(latest.current, effect);
      latest.current = next;
      setState(next);
      if (effect.kind === "show") {
        const prompt = prompts[effect.index];
        if (prompt !== undefined) inputActions.setDraft(prompt.text);
      } else if (effect.kind === "restore") {
        inputActions.setDraft(effect.text);
      }
      if (direction !== undefined && composer !== undefined) {
        kit.swapDraft(composer.card, direction);
      }
    };

    useComposerKeys(composer, (input, elements) => {
      const step = recallKey(latest.current, input, {
        count: prompts.length,
        draft,
        caretAtStart: caretEdges(elements.editable).atStart,
        ready: editable && !triggerMenuOpen(elements.card),
      });
      if (step.state !== latest.current || step.effect.kind !== "none") {
        update(step.state, step.effect);
      }
      return step.consume;
    });
    usePointerOutside(composer, state.open, () => update(CLOSED, { kind: "none" }));

    const words = { today: t("today"), yesterday: t("yesterday") };
    const index = state.open ? state.index : 0;
    return (
      <div ref={anchor} data-dsh-recall="">
        <Panel
          owner={PLUGIN}
          open={state.open}
          title={t("title")}
          counter={counter(prompts.length - index, prompts.length)}
          rows={state.open ? panelRows(prompts, loadedAt, words) : []}
          active={index}
          hoverTint
          hints={[{ keys: ["↑", "↓"], label: t("browse") }]}
          trailingHints={[
            { keys: ["Enter"], label: t("send") },
            { keys: ["Tab"], label: t("edit") },
            { keys: ["Esc"], label: t("restore") },
          ]}
          onPick={(row) => update(CLOSED, { kind: "show", index: row })}
          onHover={() => {}}
        />
      </div>
    );
  };
}

/** 依赖的 Client 服务。 */
export const inject = CLIENT_INJECT;

/** 注册词典与输入框浮层；面板、动画与外观来自 Agent Stash 框架。 */
export function apply(ctx: DshClientContext): void {
  installDictionaries(ctx, PLUGIN, { en, zh });
  const RecallOverlay = createRecallOverlay(ctx.stashKit);
  ctx.slots.inject("conversation.input.overlay", () =>
    ctx.slots.register(
      { name: "conversation.input.overlay", id: PLUGIN, order: 20, locale: PLUGIN },
      RecallOverlay,
    ),
  );
}
