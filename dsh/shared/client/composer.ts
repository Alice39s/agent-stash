import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { keyInput, type KeyInput } from "./keys.ts";

/** 输入框卡片与其中的可编辑区域。 */
export interface ComposerElements {
  readonly card: HTMLElement;
  readonly editable: HTMLElement;
}

/** 光标相对草稿首尾的位置；有选区时两者都为假。 */
export interface CaretEdges {
  readonly atStart: boolean;
  readonly atEnd: boolean;
}

/** 从挂在 overlay 槽位里的元素找到所在的输入框卡片与可编辑区域。 */
export function findComposer(anchor: Element): ComposerElements | undefined {
  const card = anchor.closest<HTMLElement>("[data-composer-card]");
  const editable = card?.querySelector<HTMLElement>('[contenteditable="true"]');
  return card === null || card === undefined || editable === null || editable === undefined
    ? undefined
    : { card, editable };
}

/** 读取光标是否折叠在可编辑区域的开头或末尾。 */
export function caretEdges(editable: HTMLElement): CaretEdges {
  const selection = editable.ownerDocument.getSelection();
  if (selection === null || selection.rangeCount === 0 || !selection.isCollapsed) {
    return { atStart: false, atEnd: false };
  }
  const caret = selection.getRangeAt(0);
  if (!editable.contains(caret.startContainer)) return { atStart: false, atEnd: false };
  const before = editable.ownerDocument.createRange();
  before.selectNodeContents(editable);
  before.setEnd(caret.startContainer, caret.startOffset);
  const after = editable.ownerDocument.createRange();
  after.selectNodeContents(editable);
  after.setStart(caret.startContainer, caret.startOffset);
  return { atStart: before.toString() === "", atEnd: after.toString() === "" };
}

/** 输入框里是否打开着 `/`、`@` 等触发菜单；打开时方向键归它所有。 */
export function triggerMenuOpen(card: HTMLElement): boolean {
  return card.querySelector("[data-trigger-menu]") !== null;
}

/**
 * 定位所在输入框：把返回的 ref 挂到浮层根元素上，挂载后得到卡片与可编辑区域。
 * @returns 根元素的 callback ref 与找到的输入框。
 */
export function useComposer(): readonly [
  (node: HTMLElement | null) => void,
  ComposerElements | undefined,
] {
  const [elements, setElements] = useState<ComposerElements>();
  const ref = useCallback((node: HTMLElement | null) => {
    setElements(node === null ? undefined : findComposer(node));
  }, []);
  return [ref, elements];
}

/** 让事件监听器总能调用最新一次渲染的回调。 */
function useLatest<T>(value: T): { readonly current: T } {
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  return latest;
}

/**
 * 在输入框卡片上以捕获阶段监听可编辑区域的按键，先于编辑器自己的键位处理。
 * `handle` 返回真时拦下事件，编辑器与其他监听者都不会再收到它。
 */
export function useComposerKeys(
  elements: ComposerElements | undefined,
  handle: (input: KeyInput, elements: ComposerElements) => boolean,
): void {
  const latest = useLatest(handle);
  useLayoutEffect(() => {
    if (elements === undefined) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.target instanceof Node) || !elements.editable.contains(event.target)) return;
      if (!latest.current(keyInput(event), elements)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    elements.card.addEventListener("keydown", onKeyDown, true);
    return () => elements.card.removeEventListener("keydown", onKeyDown, true);
  }, [elements, latest]);
}

/** 按下输入框卡片以外的位置时调用 `onOutside`。 */
export function usePointerOutside(
  elements: ComposerElements | undefined,
  active: boolean,
  onOutside: () => void,
): void {
  const latest = useLatest(onOutside);
  useLayoutEffect(() => {
    if (elements === undefined || !active) return undefined;
    const document = elements.card.ownerDocument;
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && elements.card.contains(event.target)) return;
      latest.current();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [elements, active, latest]);
}

/** 输入框的实时编辑状态。 */
export interface EditorSignals {
  /** 光标折叠在草稿末尾。 */
  readonly caretAtEnd: boolean;
  /** 输入法正在组字。 */
  readonly composing: boolean;
  /** `/`、`@` 触发菜单正打开着。 */
  readonly menuOpen: boolean;
  /**
   * 至今发生过的用户输入次数。程序写入草稿（回溯、填充）不产生输入事件，
   * 比较两次草稿变化时的计数即可判断变化是否来自用户输入。
   */
  readonly inputCount: number;
}

const IDLE: EditorSignals = { caretAtEnd: false, composing: false, menuOpen: false, inputCount: 0 };

/** 一个输入框的编辑状态源，供 `useSyncExternalStore` 订阅。 */
function signalStore(elements: ComposerElements): {
  readonly subscribe: (notify: () => void) => () => void;
  readonly snapshot: () => EditorSignals;
} {
  const { card, editable } = elements;
  let composing = false;
  let inputCount = 0;
  let current = IDLE;
  return {
    subscribe: (notify) => {
      const document = card.ownerDocument;
      const onCompositionStart = (): void => {
        composing = true;
        notify();
      };
      const onCompositionEnd = (): void => {
        composing = false;
        notify();
      };
      const onBeforeInput = (): void => {
        inputCount += 1;
        notify();
      };
      const observer = new MutationObserver(notify);
      const overlay = card.querySelector("[data-composer-overlay]");
      if (overlay !== null) observer.observe(overlay, { childList: true, subtree: true });
      document.addEventListener("selectionchange", notify);
      editable.addEventListener("compositionstart", onCompositionStart);
      editable.addEventListener("compositionend", onCompositionEnd);
      editable.addEventListener("beforeinput", onBeforeInput, true);
      return () => {
        observer.disconnect();
        document.removeEventListener("selectionchange", notify);
        editable.removeEventListener("compositionstart", onCompositionStart);
        editable.removeEventListener("compositionend", onCompositionEnd);
        editable.removeEventListener("beforeinput", onBeforeInput, true);
      };
    },
    snapshot: () => {
      const next: EditorSignals = {
        caretAtEnd: caretEdges(editable).atEnd,
        composing,
        menuOpen: triggerMenuOpen(card),
        inputCount,
      };
      if (
        next.caretAtEnd !== current.caretAtEnd ||
        next.composing !== current.composing ||
        next.menuOpen !== current.menuOpen ||
        next.inputCount !== current.inputCount
      ) {
        current = next;
      }
      return current;
    },
  };
}

const IDLE_STORE = { subscribe: () => () => {}, snapshot: () => IDLE };

/** 跟踪光标位置、输入法组字、触发菜单与用户输入次数。 */
export function useEditorSignals(elements: ComposerElements | undefined): EditorSignals {
  const store = useMemo(
    () => (elements === undefined ? IDLE_STORE : signalStore(elements)),
    [elements],
  );
  return useSyncExternalStore(store.subscribe, store.snapshot);
}
