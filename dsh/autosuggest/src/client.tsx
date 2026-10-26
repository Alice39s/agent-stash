import { useId, useState, type ReactNode } from "react";
import type { StashKit } from "../../kit/src/service.ts";
import {
  caretEdges,
  useComposer,
  useComposerKeys,
  useEditorSignals,
} from "../../shared/client/composer.ts";
import {
  CLIENT_INJECT,
  type DshClientContext,
  type OverlayProps,
} from "../../shared/client/dsh.ts";
import { fetchGlobalPrompts } from "../../shared/client/fetch.ts";
import { counter, relativeDay, useRemoteList } from "../../shared/client/format.ts";
import { installDictionaries } from "../../shared/client/resources.ts";
import { promptCandidates } from "../../shared/prompts.ts";
import { en, zh, type SuggestKey } from "./locales.ts";
import { suggestKey } from "./suggest.ts";

/** 插件名，也是条目 id 与词典命名空间。 */
const PLUGIN = "dsh-autosuggest";
/** Host 半部注册的历史路由（文档相对路径）。 */
const ROUTE = "dsh-autosuggest/prompts";
/** 标记本浮层所在输入框卡片的属性，补全灰字的样式据此定位。 */
const MARKER = "data-dsh-autosuggest";
/** 面板最多列出的建议数。 */
const MAX_CANDIDATES = 5;

/** 全局历史前缀补全：草稿是某条历史的完整前缀时，在光标后显示剩余部分。 */
function createSuggestOverlay(kit: StashKit): (props: OverlayProps<SuggestKey>) => ReactNode {
  const { Panel, Ghost } = kit;
  return function SuggestOverlay(props: OverlayProps<SuggestKey>): ReactNode {
    const { sessionId, useInput, inputActions, useProjection, t } = props;
    const marker = useId();
    const [anchor, composer] = useComposer();
    const signals = useEditorSignals(composer);
    // oxlint-disable-next-line react/hooks -- 槽位标准属性里的 Hook 在组件生命周期内不变。
    const draft = useInput((state) => state.draft);
    // oxlint-disable-next-line react/hooks -- 同上。
    const editable = useInput((state) => state.phase === "plain" && state.occurrences.length === 0);
    // oxlint-disable-next-line react/hooks -- 同上。
    const stamp = useProjection("sessionListMetadata", (value) => value?.lastPromptAt ?? null);
    const { items: history, loadedAt } = useRemoteList(
      PLUGIN,
      (signal) => fetchGlobalPrompts(ROUTE, signal),
      `${sessionId}:${String(stamp)}`,
    );

    // 只有用户亲手改动的草稿才给建议：回溯与填充都是程序写入，不产生输入事件。
    // 草稿一变就在渲染中同步重算，避免程序写入后残留一帧旧建议。
    const [seen, setSeen] = useState({ draft, inputs: signals.inputCount, typed: false });
    const [index, setIndex] = useState(0);
    const [dismissed, setDismissed] = useState<string>();
    if (seen.draft !== draft) {
      setSeen({ draft, inputs: signals.inputCount, typed: signals.inputCount !== seen.inputs });
      setIndex(0);
      setDismissed(undefined);
    }

    const active =
      seen.draft === draft &&
      seen.typed &&
      editable &&
      signals.caretAtEnd &&
      !signals.composing &&
      !signals.menuOpen &&
      dismissed !== draft;
    const candidates = active ? promptCandidates(history, draft, MAX_CANDIDATES) : [];
    const highlighted = Math.min(index, Math.max(0, candidates.length - 1));
    const suggestion = candidates[highlighted];

    const accept = (pick: number): void => {
      const candidate = candidates[pick];
      if (candidate !== undefined) inputActions.setDraft(candidate.text);
    };

    useComposerKeys(composer, (input, elements) => {
      if (!caretEdges(elements.editable).atEnd) return false;
      const step = suggestKey({ count: candidates.length, index: highlighted }, input);
      const { action } = step;
      if (action.kind === "accept") accept(action.index);
      else if (action.kind === "highlight") setIndex(action.index);
      else if (action.kind === "dismiss") setDismissed(draft);
      return step.consume;
    });

    const words = { today: t("today"), yesterday: t("yesterday") };
    return (
      <div ref={anchor} {...{ [MARKER]: marker }}>
        {suggestion !== undefined && (
          // 同一条建议在沿着它继续输入时保持身份，灰字不重播出现动画。
          <Ghost
            attribute={MARKER}
            marker={marker}
            suffix={suggestion.text.slice(draft.length)}
            identity={`${suggestion.sessionId}:${suggestion.text}`}
          />
        )}
        <Panel
          owner={PLUGIN}
          open={suggestion !== undefined}
          title={t("title")}
          counter={counter(highlighted + 1, candidates.length)}
          rows={candidates.map((candidate, row) => ({
            key: `${candidate.sessionId}:${String(row)}`,
            text: candidate.text,
            meta: `${candidate.title ?? t("untitled")} · ${relativeDay(candidate.time, loadedAt, words)}`,
          }))}
          active={highlighted}
          hints={candidates.length > 1 ? [{ keys: ["↑", "↓"], label: t("switch") }] : []}
          trailingHints={[
            { keys: ["Tab", "→"], label: t("fill") },
            { keys: ["Esc"], label: t("dismiss") },
          ]}
          onPick={accept}
          onHover={setIndex}
        />
      </div>
    );
  };
}

/** 依赖的 Client 服务。 */
export const inject = CLIENT_INJECT;

/** 注册词典与输入框浮层；面板、灰字、动画与外观来自 Agent Stash 框架。 */
export function apply(ctx: DshClientContext): void {
  installDictionaries(ctx, PLUGIN, { en, zh });
  const SuggestOverlay = createSuggestOverlay(ctx.stashKit);
  ctx.slots.inject("conversation.input.overlay", () =>
    ctx.slots.register(
      { name: "conversation.input.overlay", id: PLUGIN, order: 21, locale: PLUGIN },
      SuggestOverlay,
    ),
  );
}
