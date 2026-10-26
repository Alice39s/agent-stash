import { isPlain, type KeyInput } from "../../shared/client/keys.ts";

/** 当前建议列表：`count` 为 0 表示没有建议。 */
export interface SuggestView {
  readonly count: number;
  readonly index: number;
}

export type SuggestAction =
  | { readonly kind: "none" }
  | { readonly kind: "accept"; readonly index: number }
  | { readonly kind: "highlight"; readonly index: number }
  | { readonly kind: "dismiss" };

export interface SuggestStep {
  readonly action: SuggestAction;
  /** 是否拦下这个按键，不再交给输入框。 */
  readonly consume: boolean;
}

const PASS: SuggestStep = { action: { kind: "none" }, consume: false };

/**
 * 补全建议的按键状态机：Tab 或 → 填入高亮建议，多条建议时 ↑↓ 切换，
 * Esc 收起当前草稿的建议，其余按键照常输入。
 */
export function suggestKey(view: SuggestView, input: KeyInput): SuggestStep {
  if (view.count === 0) return PASS;
  if (isPlain(input, "Tab") || isPlain(input, "ArrowRight")) {
    return { action: { kind: "accept", index: view.index }, consume: true };
  }
  if (isPlain(input, "Escape")) return { action: { kind: "dismiss" }, consume: true };
  if (view.count < 2) return PASS;
  const step = isPlain(input, "ArrowDown") ? 1 : isPlain(input, "ArrowUp") ? -1 : 0;
  if (step === 0) return PASS;
  const index = view.index + step;
  if (index < 0 || index >= view.count) return { action: { kind: "none" }, consume: true };
  return { action: { kind: "highlight", index }, consume: true };
}
