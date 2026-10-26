import { act, useSyncExternalStore, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { mountKit, type KitHarness } from "../../kit/src/harness.tsx";
import type { DshClientContext, InputStateView, OverlayProps } from "./dsh.ts";

/** 组件测试用的输入框：DOM 结构与 DSH 输入框卡片一致，草稿状态由测试驱动。 */
export interface ComposerHarness {
  readonly card: HTMLElement;
  readonly editable: HTMLElement;
  /** 当前草稿。 */
  draft(): string;
  /** `inputActions.setDraft` 收到的全部文本。 */
  readonly written: string[];
  /** 模拟用户输入：先派发 beforeinput，再改写草稿并把光标放到末尾。 */
  type(text: string): Promise<void>;
  /** 模拟其他程序改写草稿（如历史回溯）：不派发输入事件。 */
  write(text: string): Promise<void>;
  /** 把光标放到草稿开头。 */
  caretToStart(): Promise<void>;
  /** 按下一个键，返回事件是否被插件拦下。 */
  press(key: string, init?: KeyboardEventInit): Promise<boolean>;
  /** 浮层根元素下的 DOM。 */
  overlay(): HTMLElement;
  unmount(): void;
}

function placeCaret(editable: HTMLElement, atEnd: boolean): void {
  const selection = document.getSelection();
  if (selection === null) throw new Error("the test document has no selection");
  const range = document.createRange();
  range.selectNodeContents(editable);
  range.collapse(!atEnd);
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
}

/**
 * 按插件的 `apply` 注册流程挂载 overlay 组件，并接上一个可驱动的输入框。
 * `stashKit` 由真实的框架插件提供，未传入时按默认外观挂载一份；词典取插件注册的英文版本。
 */
export async function mountOverlay(
  apply: (ctx: DshClientContext) => void,
  lastPromptAt: number | null,
  kitHarness?: KitHarness,
): Promise<ComposerHarness> {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  const stash = kitHarness ?? mountKit();
  let component: ComponentType<OverlayProps<string>> | undefined;
  let english: Readonly<Record<string, string>> = {};
  const disposers: (() => void)[] = [];
  const ctx: DshClientContext = {
    slots: {
      inject: (_key, callback) => callback(),
      register(_options, registered) {
        component = registered;
        return () => {};
      },
    },
    locale: {
      register(_ns, locale, dict) {
        if (locale === "en") english = dict;
        return () => {};
      },
    },
    effect(execute) {
      disposers.push(execute());
    },
    stashKit: stash.kit,
  };
  apply(ctx);
  const Overlay = component;
  if (Overlay === undefined) throw new Error("the plugin registered no overlay component");
  const t = (key: string): string => english[key] ?? key;

  const card = document.createElement("div");
  card.dataset["composerCard"] = "";
  const anchor = document.createElement("div");
  anchor.dataset["composerOverlay"] = "";
  const editable = document.createElement("div");
  editable.setAttribute("contenteditable", "true");
  card.append(anchor, editable);
  document.body.append(card);
  // 输入框获得焦点时光标停在空草稿里。
  placeCaret(editable, true);

  let state: InputStateView = { draft: "", phase: "plain", occurrences: [] };
  const listeners = new Set<() => void>();
  const written: string[] = [];
  const setDraft = (text: string): void => {
    editable.replaceChildren(
      ...text.split("\n").map((line) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        return paragraph;
      }),
    );
    state = { ...state, draft: text };
    placeCaret(editable, true);
    for (const listener of listeners) listener();
  };
  const useInput = <S,>(select: (input: InputStateView) => S): S =>
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => select(state),
    );

  const root: Root = createRoot(anchor);
  await act(async () => {
    root.render(
      <Overlay
        sessionId="s1"
        useInput={useInput}
        inputActions={{
          setDraft(text) {
            written.push(text);
            setDraft(text);
          },
        }}
        useProjection={(_key, select) => select({ lastPromptAt })}
        t={t}
      />,
    );
  });

  return {
    card,
    editable,
    written,
    draft: () => state.draft,
    async type(text) {
      await act(async () => {
        editable.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, data: text }));
        setDraft(state.draft + text);
      });
    },
    async write(text) {
      await act(async () => setDraft(text));
    },
    async caretToStart() {
      await act(async () => placeCaret(editable, false));
    },
    async press(key, init = {}) {
      let consumed = false;
      await act(async () => {
        const event = new KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
          ...init,
        });
        editable.dispatchEvent(event);
        consumed = event.defaultPrevented;
      });
      return consumed;
    },
    overlay: () => anchor,
    unmount() {
      act(() => root.unmount());
      for (const dispose of disposers) dispose();
      if (kitHarness === undefined) stash.dispose();
      card.remove();
    },
  };
}
