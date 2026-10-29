import { modalSelector } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ShortcutBinding, ShortcutCommandView, ShortcutsView } from "./dsh.ts";
import { createValueStore, type ValueStore } from "./store.ts";
import { MENU_CLASS } from "./styles.ts";

/** 快捷键命令 id。 */
export const COMMAND_ID = "dsh-enhance.enhance";

/**
 * 默认按键：⇧⌘E / Ctrl+Shift+E，DSH 自带的命令没有占用它。
 * 浏览器里的 Linux 只放行少数组合，那里不设默认，用户可在快捷键设置页自行指定。
 */
const BINDING: ShortcutBinding = { code: "KeyE", modifiers: ["primary", "shift"] };
export const DEFAULT_BINDINGS: Readonly<Record<string, ShortcutBinding>> = {
  "desktop:macos": BINDING,
  "desktop:windows": BINDING,
  "desktop:linux": BINDING,
  "web:macos": BINDING,
  "web:windows": BINDING,
};

/** 本机默认按键的写法，用于命令还没注册时的说明。 */
export function defaultKeys(platform: string): readonly string[] {
  return /mac|iphone|ipad/iu.test(platform) ? ["⇧", "⌘", "E"] : ["Ctrl", "Shift", "E"];
}

/** 把按键列表写成一段文字：macOS 的符号连写，其余用 `+` 连接。 */
export function keysText(keys: readonly string[]): string {
  if (keys.includes("+")) return keys.join("");
  return keys.every((key) => key.length === 1) ? keys.join("") : keys.join("+");
}

/** 一个输入框里的增强按钮：快捷键触发时调用 `trigger`。 */
export interface ShortcutTarget {
  readonly card: HTMLElement;
  readonly trigger: () => void;
}

/** 插件级的快捷键桥：命令只注册一次，按焦点转给对应输入框里的按钮。 */
export interface ShortcutBridge {
  /** 当前生效的按键；命令没有注册或没有绑定时为空。 */
  readonly keys: ValueStore<readonly string[]>;
  /** 挂上一个按钮，返回撤下它的函数。 */
  attach(target: ShortcutTarget): () => void;
  /** 选出焦点所在输入框的按钮；焦点不在任何输入框里时取最近挂上且可见的那个。 */
  pick(focus: Element | null): ShortcutTarget | undefined;
}

export function createShortcutBridge(): ShortcutBridge {
  const targets: ShortcutTarget[] = [];
  return {
    keys: createValueStore<readonly string[]>(
      [],
      (left, right) => left.join(" ") === right.join(" "),
    ),
    attach(target) {
      targets.push(target);
      return () => {
        const index = targets.indexOf(target);
        if (index >= 0) targets.splice(index, 1);
      };
    },
    pick(focus) {
      const focused = targets.find((target) => focus !== null && target.card.contains(focus));
      if (focused !== undefined) return focused;
      return targets.findLast(
        (target) => target.card.isConnected && target.card.getClientRects().length > 0,
      );
    },
  };
}

/** 最上层的模态层是不是增强按钮的菜单。 */
function ownMenuOnTop(): boolean {
  const layers = document.querySelectorAll(modalSelector);
  return layers[layers.length - 1]?.classList.contains(MENU_CLASS) === true;
}

/**
 * 向 DSH 快捷键服务注册命令并发布它当前生效的按键。默认按键和别的命令重叠时服务会拒绝注册，
 * 此时改为不带默认按键注册，并在控制台说明。返回撤销注册的函数。
 */
export function registerCommand(
  shortcuts: ShortcutsView,
  bridge: ShortcutBridge,
  label: () => string,
): () => void {
  const command = (defaults: ShortcutCommandView["defaults"]): ShortcutCommandView => ({
    id: COMMAND_ID,
    label,
    aliases: ["enhance", "prompt", "增强", "润色"],
    defaults,
    regions: ["page", "editable"],
    // 打开着的菜单也算模态层：本插件自己的菜单在最上层时，快捷键仍然用来关闭它。
    modals: ["other"],
    resolve(context) {
      if (context.modal !== null && !ownMenuOnTop()) return { status: "pass" };
      const target = bridge.pick(context.target);
      return target === undefined ? { status: "pass" } : { status: "handled", run: target.trigger };
    },
  });
  let dispose: () => void;
  try {
    dispose = shortcuts.register(command(DEFAULT_BINDINGS));
  } catch (error) {
    console.warn(
      `[dsh-enhance] the default keys of ${COMMAND_ID} overlap another command; registering it unbound:`,
      error,
    );
    dispose = shortcuts.register(command({}));
  }
  const publish = (): void => {
    const entry = shortcuts.catalog.getSnapshot().find((row) => row.id === COMMAND_ID);
    bridge.keys.set(entry === undefined || entry.binding === null ? [] : entry.keys);
  };
  publish();
  const unsubscribe = shortcuts.catalog.subscribe(publish);
  return () => {
    unsubscribe();
    dispose();
    bridge.keys.set([]);
  };
}
