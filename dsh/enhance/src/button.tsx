import {
  IconCheckOutlineRegular,
  IconCloseOutlineRegular,
  IconLoadingOutlineRegular,
  IconRefreshOutlineRegular,
  IconSettingsOutlineRegular,
  IconSparkleRegular,
  IconStopFillRegular,
  IconWarningOutlineRegular,
  Menu,
  MenuItemButton,
  TextShimmer,
  Tooltip,
} from "@deepseek-ai/dsh-client-ui-primitives";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import * as v from "valibot";
import type { StashKit } from "../../kit/src/service.ts";
import { useComposer } from "../../shared/client/composer.ts";
import type { ModelSelectionView, RightSlotProps } from "./dsh.ts";
import { format, type EnhanceKey } from "./locales.ts";
import { isBuiltin, type Preset } from "./presets.ts";
import { requestContextTurns, requestRewrite } from "./request.ts";
import type { EnhanceSettings } from "./settings-value.ts";
import type { ShortcutBridge } from "./shortcut.ts";
import { followDraft, IDLE, type EnhanceState } from "./state.ts";
import { useValue, type ValueStore } from "./store.ts";
import { BUSY, K, MENU_CLASS } from "./styles.ts";
import { SessionModelSchema, type SessionModel } from "./wire.ts";

/** 增强按钮从插件级共享的部分。 */
export interface ButtonShared {
  readonly settings: ValueStore<EnhanceSettings>;
  readonly shortcut: ShortcutBridge;
  /** 打开插件页里本插件详情的动作；插件页不可用时为 `undefined`。 */
  readonly settingsLink: () => (() => void) | undefined;
}

/** 菜单里前几个预设可以直接按数字键选择。 */
const NUMBERED = 9;
/** 「无需改动」的提示停留的时间。 */
const INFO_MS = 4000;

/** 预设在菜单里的名称与说明：自定义的标题优先，内置预设留空时用本地化的内置名称。 */
export function presetLabel(
  preset: Preset,
  t: (key: EnhanceKey) => string,
): { readonly title: string; readonly hint: string } {
  const builtin = isBuiltin(preset.id) ? preset.id : undefined;
  const custom = preset.title.trim() !== "";
  const title = custom
    ? preset.title
    : builtin === undefined
      ? t("preset.untitled")
      : t(`preset.${builtin}`);
  const hint =
    preset.description.trim() !== ""
      ? preset.description
      : builtin !== undefined && !custom
        ? t(`preset.${builtin}.hint`)
        : "";
  return { title, hint };
}

/** 关联几轮上下文的文案；没有关联时为 `undefined`。 */
export function contextLabel(
  turns: number | undefined,
  t: (key: EnhanceKey) => string,
): string | undefined {
  if (turns === undefined || turns === 0) return undefined;
  return turns === 1 ? t("contextOne") : format(t("context"), { n: turns });
}

/** 会话下一次请求会用的模型，写成字符串以便投影订阅只在它变化时重新渲染。 */
function modelKey(view: ModelSelectionView | undefined): string | undefined {
  const next = view?.next;
  return next === null || next === undefined ? undefined : JSON.stringify(next);
}

function parseModel(key: string | undefined): SessionModel | undefined {
  return key === undefined ? undefined : v.parse(SessionModelSchema, JSON.parse(key));
}

/** 下一次改写会关联几轮对话；`key` 变化时重新读取，`active` 为假时不读取。 */
function useContextTurns(sessionId: string, active: boolean, key: string): number | undefined {
  const [turns, setTurns] = useState<{ readonly key: string; readonly value: number }>();
  const stamp = `${sessionId}:${key}`;
  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    requestContextTurns(sessionId, controller.signal).then(
      (value) => setTurns({ key: stamp, value }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(`[${K}] reading the context of session "${sessionId}" failed:`, error);
      },
    );
    return () => controller.abort();
  }, [sessionId, active, stamp]);
  return active && turns?.key === stamp ? turns.value : undefined;
}

/** 把焦点交回输入框，光标放在草稿末尾。 */
function focusEnd(editable: HTMLElement): void {
  if (!editable.isConnected) return;
  editable.focus();
  const selection = editable.ownerDocument.getSelection();
  selection?.selectAllChildren(editable);
  selection?.collapseToEnd();
}

/**
 * 输入框右下角、发送按钮左侧的「增强提示词」按钮。草稿为空时不渲染；点开菜单选一个预设，
 * 改写期间锁住草稿并可停止；完成后左侧出现撤销按钮；失败原因与「无需改动」显示在按钮左侧。
 */
export function createEnhanceButton(
  kit: StashKit,
  shared: ButtonShared,
): (props: RightSlotProps<EnhanceKey>) => ReactNode {
  return function EnhanceButton({ sessionId, useInput, inputActions, useProjection, t }) {
    const [anchor, composer] = useComposer();
    const button = useRef<HTMLButtonElement>(null);
    // oxlint-disable-next-line react/hooks -- 槽位标准属性里的 Hook 在组件生命周期内不变。
    const draft = useInput((state) => state.draft);
    // oxlint-disable-next-line react/hooks -- 同上。
    const plain = useInput((state) => state.phase === "plain");
    // oxlint-disable-next-line react/hooks -- 同上。
    const references = useInput((state) => state.occurrences.length > 0);
    // oxlint-disable-next-line react/hooks -- 同上。
    const stamp = useProjection("sessionListMetadata", (value) => value?.lastPromptAt ?? null);
    // oxlint-disable-next-line react/hooks -- 同上。
    const sessionModel = useProjection("modelSelection", modelKey);
    const settings = useValue(shared.settings);
    const keys = useValue(shared.shortcut.keys);
    const motion = useValue(kit.appearance).motion;

    const [state, setState] = useState<EnhanceState>(IDLE);
    const [owner, setOwner] = useState(sessionId);
    const [open, setOpen] = useState(false);
    // 切换会话或草稿变化时在渲染中同步跟随，避免旧状态多留一帧。
    const moved = owner === sessionId ? undefined : IDLE;
    if (moved !== undefined) setOwner(sessionId);
    const followed = moved ?? followDraft(state, draft);
    if (followed !== undefined) setState(followed);
    const current = followed ?? state;

    const empty = draft.trim() === "";
    const turns = useContextTurns(
      sessionId,
      settings.context && !empty,
      `${String(stamp)}:${String(settings.contextTurns)}`,
    );
    const linked = contextLabel(turns, t);

    // 改写进行中锁住草稿：可编辑区域设为 inert 并变淡，焦点交给按钮，Esc 停止。
    const running = current.kind === "running";
    useLayoutEffect(() => {
      if (!running || composer === undefined) return undefined;
      const { card, editable } = composer;
      editable.inert = true;
      editable.setAttribute("aria-busy", "true");
      card.setAttribute(BUSY, "");
      button.current?.focus();
      const onKeyDown = (event: globalThis.KeyboardEvent): void => {
        if (event.key !== "Escape" || event.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        setState(IDLE);
        requestAnimationFrame(() => focusEnd(editable));
      };
      card.addEventListener("keydown", onKeyDown, true);
      return () => {
        card.removeEventListener("keydown", onKeyDown, true);
        editable.inert = false;
        editable.removeAttribute("aria-busy");
        card.removeAttribute(BUSY);
      };
    }, [running, composer]);

    // 离开 running（完成、停止、草稿被发送或组件卸载）时取消仍在进行的请求。
    const controller = current.kind === "running" ? current.controller : undefined;
    useEffect(
      () => (controller === undefined ? undefined : () => controller.abort()),
      [controller],
    );

    // 「无需改动」的提示过一会儿自己消失。
    const info = current.kind === "note" && current.note.tone === "info";
    useEffect(() => {
      if (!info) return undefined;
      const timer = setTimeout(() => setState(IDLE), INFO_MS);
      return () => clearTimeout(timer);
    }, [info]);

    const focusEditor = (): void => {
      if (composer !== undefined) focusEnd(composer.editable);
    };

    const run = (preset: Preset): void => {
      setOpen(false);
      fromShortcut.current = false;
      const source = draft;
      // 连续增强时，撤销回到最早那份亲手写的草稿。
      const original = current.kind === "done" ? current.original : source;
      const request = new AbortController();
      setState({ kind: "running", source, original, controller: request });
      const model = parseModel(sessionModel);
      const payload = {
        session: sessionId,
        preset: preset.id,
        draft: source,
        ...(model === undefined ? {} : { model }),
      };
      requestRewrite(payload, request.signal).then(
        (response) => {
          if (request.signal.aborted) return;
          if (!response.ok) {
            setState({
              kind: "note",
              draft: source,
              note: { tone: "error", reason: response.reason, detail: response.message },
            });
          } else if (response.value.unchanged) {
            setState({ kind: "note", draft: source, note: { tone: "info", reason: "unchanged" } });
          } else {
            setState({ kind: "done", original, before: source, applied: undefined });
            inputActions.setDraft(response.value.text);
            if (composer !== undefined) kit.swapDraft(composer.card, "restore");
          }
          requestAnimationFrame(focusEditor);
        },
        (error: unknown) => {
          if (request.signal.aborted) return;
          console.error(`[${K}] the rewrite request failed:`, error);
          setState({
            kind: "note",
            draft: source,
            note: { tone: "error", reason: "network", detail: String(error) },
          });
          requestAnimationFrame(focusEditor);
        },
      );
    };

    const undo = (original: string): void => {
      setState(IDLE);
      inputActions.setDraft(original);
      if (composer !== undefined) kit.swapDraft(composer.card, "restore");
      requestAnimationFrame(focusEditor);
    };

    const stop = (): void => {
      setState(IDLE);
      requestAnimationFrame(focusEditor);
    };

    const presets = settings.presets;
    const blocked = references || !plain || presets.length === 0;
    const toggleMenu = (): void => {
      if (current.kind === "running") stop();
      else if (!blocked) setOpen(!open);
    };
    // 快捷键在输入框里按下：打开菜单时把焦点交给按钮，数字键与方向键才落在菜单上；
    // 菜单不选预设就关闭时焦点回到输入框。
    const fromShortcut = useRef(false);
    const closeMenu = (): void => {
      setOpen(false);
      if (!fromShortcut.current) return;
      fromShortcut.current = false;
      requestAnimationFrame(focusEditor);
    };
    // 快捷键：进行中停止，完成后撤销，其余时候打开或关闭菜单。
    const shortcut = (): void => {
      if (current.kind === "done") undo(current.original);
      else if (current.kind === "running") stop();
      else if (open) closeMenu();
      else if (!blocked) {
        fromShortcut.current = true;
        button.current?.focus();
        setOpen(true);
      }
    };

    const latest = useRef(shortcut);
    useLayoutEffect(() => {
      latest.current = shortcut;
    });
    const card = composer?.card;
    const visible = !empty || running;
    useEffect(() => {
      if (card === undefined || !visible) return undefined;
      return shared.shortcut.attach({ card, trigger: () => latest.current() });
    }, [card, visible]);

    if (!visible) return null;

    const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
      if (!open || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number.parseInt(event.key, 10) - 1;
      const preset = index >= 0 && index < NUMBERED ? presets[index] : undefined;
      if (preset === undefined) return;
      event.preventDefault();
      run(preset);
    };

    const tooltip = running
      ? t("cancel")
      : references
        ? t("references")
        : linked === undefined
          ? t("enhance")
          : `${t("enhance")} · ${linked}`;
    const trigger = (
      <Tooltip
        label={tooltip}
        shortcutKeys={
          running ? ["Esc"] : keys.length > 0 && current.kind !== "done" ? keys : undefined
        }
        side="top"
        delayMs={400}
        portal
        disabled={open}
      >
        <button
          ref={button}
          type="button"
          className={`${K}-button`}
          data-state={running ? "running" : "idle"}
          aria-label={running ? t("cancel") : t("enhance")}
          aria-haspopup={running ? undefined : "menu"}
          aria-expanded={open}
          aria-disabled={!running && blocked}
          onClick={toggleMenu}
        >
          {running ? (
            <span key="running" className={`${K}-icon ${K}-running`}>
              <span className={`${K}-spin`}>
                <IconLoadingOutlineRegular size={16} />
              </span>
              <span className={`${K}-stop`}>
                <IconStopFillRegular size={12} />
              </span>
            </span>
          ) : (
            <span key="idle" className={`${K}-icon`}>
              <IconSparkleRegular size={16} />
            </span>
          )}
        </button>
      </Tooltip>
    );

    const manage = open ? shared.settingsLink() : undefined;
    const rows = presets.map((preset, index) => {
      const { title, hint } = presetLabel(preset, t);
      return (
        <MenuItemButton
          key={preset.id}
          {...(index < NUMBERED ? { shortcut: { keys: [String(index + 1)] } } : {})}
          onSelect={() => run(preset)}
        >
          <span className={`${K}-row`}>
            <span className={`${K}-row-title`}>{title}</span>
            {hint !== "" && <span className={`${K}-row-hint`}>{hint}</span>}
          </span>
        </MenuItemButton>
      );
    });

    return (
      <div ref={anchor} className={`${K}-root`} data-motion={motion} onKeyDown={onMenuKeyDown}>
        <Status state={current} timeout={settings.timeout} t={t} onDismiss={() => setState(IDLE)} />
        {current.kind === "done" && (
          <Tooltip
            label={t("undo")}
            shortcutKeys={keys.length > 0 ? keys : undefined}
            side="top"
            delayMs={400}
            portal
          >
            <button
              type="button"
              className={`${K}-button`}
              data-state="done"
              aria-label={t("undo")}
              onClick={() => undo(current.original)}
            >
              <span className={`${K}-icon`}>
                <IconRefreshOutlineRegular size={15} />
              </span>
            </button>
          </Tooltip>
        )}
        <Menu
          open={open}
          anchor={trigger}
          side="top"
          align="end"
          portal
          autoFocus
          listClassName={MENU_CLASS}
          onClose={closeMenu}
          items={linked === undefined ? [] : [{ type: "label", id: "context", text: linked }]}
          footer={
            manage === undefined
              ? []
              : [
                  {
                    id: "manage",
                    label: t("manage"),
                    icon: <IconSettingsOutlineRegular size={14} />,
                  },
                ]
          }
          onSelect={(id) => {
            if (id !== "manage") return;
            fromShortcut.current = false;
            setOpen(false);
            manage?.();
          }}
        >
          {rows}
        </Menu>
      </div>
    );
  };
}

interface StatusProps {
  readonly state: EnhanceState;
  readonly timeout: number;
  readonly t: (key: EnhanceKey) => string;
  readonly onDismiss: () => void;
}

/**
 * 失败说明之外还有具体原因的失败：供应商的报错、被拒绝的检查项、读取会话或连接的错误。
 * 这些原因原样放在提示里；其余失败的说明已经完整，不再加提示。
 */
const DETAILED: ReadonlySet<string> = new Set(["model", "invalid", "context", "network"]);

/** 按钮左侧的一行状态：改写中、失败原因或无需改动。 */
function Status({ state, timeout, t, onDismiss }: StatusProps): ReactNode {
  if (state.kind === "running") {
    return (
      <span className={`${K}-status`} role="status">
        <TextShimmer active>{t("working")}</TextShimmer>
      </span>
    );
  }
  if (state.kind !== "note") return null;
  const { note } = state;
  if (note.tone === "info") {
    return (
      <span className={`${K}-status`} data-tone="info" role="status">
        <IconCheckOutlineRegular size={12} />
        <span className={`${K}-status-text`}>{t("unchanged")}</span>
      </span>
    );
  }
  const label = format(t(`error.${note.reason}`), { n: timeout });
  return (
    <span className={`${K}-status`} data-tone="error" role="alert">
      <IconWarningOutlineRegular size={12} />
      {DETAILED.has(note.reason) ? (
        <Tooltip label={note.detail} side="top" delayMs={300} portal maxWidth={360}>
          <span className={`${K}-status-text`} tabIndex={0}>
            {label}
          </span>
        </Tooltip>
      ) : (
        <span className={`${K}-status-text`}>{label}</span>
      )}
      <button
        type="button"
        className={`${K}-dismiss`}
        aria-label={t("dismiss")}
        onClick={onDismiss}
      >
        <IconCloseOutlineRegular size={10} />
      </button>
    </span>
  );
}
