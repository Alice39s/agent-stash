/** 键盘事件里状态机关心的部分。 */
export interface KeyInput {
  readonly key: string;
  readonly shift: boolean;
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
  /** 输入法组字期间的按键。 */
  readonly composing: boolean;
}

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph", "Fn"]);

/** 从 DOM 键盘事件取出状态机输入；keyCode 229 是旧引擎的组字信号。 */
export function keyInput(event: KeyboardEvent): KeyInput {
  return {
    key: event.key,
    shift: event.shiftKey,
    alt: event.altKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    // oxlint-disable-next-line typescript/no-deprecated -- 部分输入法只给出 keyCode 229。
    composing: event.isComposing || event.keyCode === 229,
  };
}

/** 不带任何修饰键、也不在组字中的指定按键。 */
export function isPlain(input: KeyInput, key: string): boolean {
  return (
    input.key === key &&
    !input.shift &&
    !input.alt &&
    !input.ctrl &&
    !input.meta &&
    !input.composing
  );
}

/** 单独按下的修饰键，不代表编辑意图。 */
export function isModifierOnly(input: KeyInput): boolean {
  return MODIFIER_KEYS.has(input.key);
}
