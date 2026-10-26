import { DEFAULT_APPEARANCE, parseAppearance } from "./appearance.ts";
import type { KitClientContext } from "./dsh.ts";
import { createGhost, ghostKeyframes } from "./ghost.tsx";
import { en, zh } from "./locales.ts";
import { KIT, createPanel } from "./panel.tsx";
import type { AppearanceStore, StashKit } from "./service.ts";
import { createSettingsPage, settingsCss } from "./settings.tsx";
import { createAppearanceStore } from "./store.ts";
import { kitCss } from "./styles.ts";
import { createSwap } from "./swap.ts";

/** 条目 id：也是插件名、配置命名空间与词典命名空间。 */
const PLUGIN = "dsh-stash-kit";
/** 框架的 npm 包名，与条目 id 一起组成插件页配置页的键。 */
const PACKAGE = "@agent-stash/dsh-stash-kit";

/** 依赖的 Client 服务。 */
export const inject = ["slots", "locale"];

/** 用一个外观订阅源组装 `stashKit` 服务。 */
export function createStashKit(appearance: AppearanceStore): StashKit {
  return {
    appearance,
    Panel: createPanel(appearance),
    Ghost: createGhost(KIT, appearance),
    swapDraft: createSwap(KIT, appearance),
  };
}

/** 框架用到的全部样式。 */
export function stashKitCss(): string {
  return kitCss(KIT) + ghostKeyframes(KIT) + settingsCss(KIT);
}

/**
 * 提供 `stashKit` 服务：样式表、跟随设置服务的外观配置、共享组件，
 * 以及插件页里框架条目的配置页。
 */
export function apply(ctx: KitClientContext): void {
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset["plugin"] = PLUGIN;
    tag.textContent = stashKitCss();
    document.head.append(tag);
    return () => tag.remove();
  }, `${PLUGIN}: stylesheet`);
  for (const [locale, dict] of Object.entries({ en, zh })) {
    ctx.effect(() => ctx.locale.register(PLUGIN, locale, dict), `${PLUGIN}: ${locale} dictionary`);
  }

  const appearance = createAppearanceStore(DEFAULT_APPEARANCE);
  // 设置服务不在时按默认外观工作；配置改动经设置服务推送后立即生效。
  ctx.inject(["configForms"], (inner) => {
    const form = inner.configForms.get(PLUGIN);
    inner.effect(() => {
      const update = (): void => {
        const snapshot = form.getSnapshot();
        if (snapshot.status === "ready") appearance.set(parseAppearance(snapshot.value));
      };
      update();
      return form.subscribe(update);
    }, `${PLUGIN}: appearance settings`);
  });

  const kit = createStashKit(appearance);
  ctx.provide("stashKit", kit);
  const Page = createSettingsPage(KIT, kit.Panel);
  ctx.slots.inject("plugins.row.config", () =>
    ctx.slots.register(
      { name: "plugins.row.config", key: `${PACKAGE}#${PLUGIN}`, locale: PLUGIN },
      Page,
    ),
  );
}
