/**
 * 输入法组字期间的按键判断，规则取自宿主 `keyboard-composition.ts`：组字中的按键，以及组字结束后
 * 抬键之前的那一次按键（Safari 先发 `compositionend` 再发确认用的 keydown）都不触发保存或关闭。
 */

export interface CompositionGuard {
  start(): void;
  end(): void;
  /** 抬键：组字结束后的确认键已经过去。 */
  release(): void;
  /** 这次 keydown 是否属于组字；每次 keydown 调用一次。 */
  guards(event: { readonly isComposing: boolean }): boolean;
}

export function createCompositionGuard(): CompositionGuard {
  let composing = false;
  let ended = false;
  return {
    start() {
      composing = true;
    },
    end() {
      composing = false;
      ended = true;
    },
    release() {
      ended = false;
    },
    guards(event) {
      const guarded = composing || ended || event.isComposing;
      ended = false;
      return guarded;
    },
  };
}
