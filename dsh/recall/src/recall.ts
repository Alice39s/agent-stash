import { isModifierOnly, isPlain, type KeyInput } from "../../shared/client/keys.ts";

/** 回溯面板状态：打开时记住当前条目与进入前的草稿。 */
export type RecallState =
  | { readonly open: false }
  | { readonly open: true; readonly index: number; readonly original: string };

/** 判断按键时需要的输入框上下文。 */
export interface RecallContext {
  /** 当前会话的 Prompt 条数，按时间正序编号。 */
  readonly count: number;
  readonly draft: string;
  /** 光标折叠在草稿最开头。 */
  readonly caretAtStart: boolean;
  /** 输入框处于可接管的普通编辑状态。 */
  readonly ready: boolean;
}

/** 按键带来的草稿变化。 */
export type RecallEffect =
  | { readonly kind: "none" }
  | { readonly kind: "show"; readonly index: number }
  | { readonly kind: "restore"; readonly text: string };

export interface RecallStep {
  readonly state: RecallState;
  readonly effect: RecallEffect;
  /** 是否拦下这个按键，不再交给输入框。 */
  readonly consume: boolean;
}

export const CLOSED: RecallState = { open: false };

const NONE: RecallEffect = { kind: "none" };

/**
 * 回溯面板的按键状态机。关闭时只有草稿开头的 ↑ 能打开面板；
 * 打开后 ↑↓ 在历史里移动，越过最新一条或按 Esc 还原进入前的草稿，
 * Tab 留下当前条目继续编辑，Enter 交给输入框发送，其余按键关闭面板。
 */
export function recallKey(state: RecallState, input: KeyInput, context: RecallContext): RecallStep {
  if (!state.open) {
    if (isPlain(input, "ArrowUp") && context.ready && context.caretAtStart && context.count > 0) {
      const index = context.count - 1;
      return {
        state: { open: true, index, original: context.draft },
        effect: { kind: "show", index },
        consume: true,
      };
    }
    return { state, effect: NONE, consume: false };
  }
  if (input.composing || isModifierOnly(input)) return { state, effect: NONE, consume: false };
  if (isPlain(input, "ArrowUp")) {
    if (state.index === 0) return { state, effect: NONE, consume: true };
    const index = state.index - 1;
    return { state: { ...state, index }, effect: { kind: "show", index }, consume: true };
  }
  if (isPlain(input, "ArrowDown")) {
    if (state.index >= context.count - 1) {
      return { state: CLOSED, effect: { kind: "restore", text: state.original }, consume: true };
    }
    const index = state.index + 1;
    return { state: { ...state, index }, effect: { kind: "show", index }, consume: true };
  }
  if (isPlain(input, "Escape")) {
    return { state: CLOSED, effect: { kind: "restore", text: state.original }, consume: true };
  }
  if (isPlain(input, "Tab")) return { state: CLOSED, effect: NONE, consume: true };
  return { state: CLOSED, effect: NONE, consume: false };
}
