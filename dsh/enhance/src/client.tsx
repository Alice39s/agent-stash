import { installDictionaries } from "../../shared/client/resources.ts";
import { createEnhanceButton } from "./button.tsx";
import { CLIENT_INJECT, type CatalogGroup, type EnhanceClientContext } from "./dsh.ts";
import { en, zh } from "./locales.ts";
import { createSettingsPage } from "./settings.tsx";
import { DEFAULT_SETTINGS, parseSettings, type EnhanceSettings } from "./settings-value.ts";
import { createShortcutBridge, defaultKeys, registerCommand } from "./shortcut.ts";
import { createValueStore } from "./store.ts";
import { enhanceCss, K } from "./styles.ts";

/** 插件名：条目 id、配置命名空间与词典命名空间。 */
const PLUGIN = K;
/** 本插件的 npm 包名，与条目 id 一起组成插件页配置页的键。 */
const PACKAGE = "@agent-stash/dsh-enhance";

/** 依赖的 Client 服务。 */
export const inject = CLIENT_INJECT;

/** 读取模型目录；失败时抛出带原因的错误。 */
type CatalogLoader = () => Promise<readonly CatalogGroup[]>;

/**
 * 注册样式表、词典、输入框里的增强按钮与插件页里的配置页。配置经设置服务读取，
 * 改动立即生效；设置服务不在时按默认配置工作。快捷键开启时向快捷键服务注册命令。
 */
export function apply(ctx: EnhanceClientContext): void {
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset["plugin"] = PLUGIN;
    tag.textContent = enhanceCss();
    document.head.append(tag);
    return () => tag.remove();
  }, `${PLUGIN}: stylesheet`);
  installDictionaries(ctx, PLUGIN, { en, zh });
  const t = ctx.locale.bind(PLUGIN);

  const settings = createValueStore<EnhanceSettings>(DEFAULT_SETTINGS);
  const shortcut = createShortcutBridge();
  const catalog = createValueStore<CatalogLoader | undefined>(undefined);

  ctx.inject(["configForms"], (inner) => {
    const form = inner.configForms.get(PLUGIN);
    inner.effect(() => {
      const update = (): void => {
        const snapshot = form.getSnapshot();
        if (snapshot.status === "ready") settings.set(parseSettings(snapshot.value));
      };
      update();
      return form.subscribe(update);
    }, `${PLUGIN}: settings`);
  });

  ctx.inject(["shortcuts"], (inner) => {
    inner.effect(() => {
      let dispose: (() => void) | undefined;
      const sync = (): void => {
        const wanted = settings.get().shortcut;
        if (wanted && dispose === undefined) {
          dispose = registerCommand(inner.shortcuts, shortcut, () => t("enhance"));
        } else if (!wanted && dispose !== undefined) {
          dispose();
          dispose = undefined;
        }
      };
      sync();
      const unsubscribe = settings.subscribe(sync);
      return () => {
        unsubscribe();
        dispose?.();
      };
    }, `${PLUGIN}: shortcut`);
  });

  ctx.inject(["remote", "remote.session"], (inner) => {
    inner.effect(() => {
      catalog.set(async () => {
        const response = await inner.remote.session.modelCatalog();
        if (!response.ok) {
          throw new Error(`${response.error.code}: ${response.error.message}`);
        }
        return response.value.groups;
      });
      return () => catalog.set(undefined);
    }, `${PLUGIN}: model catalog`);
  });

  const EnhanceButton = createEnhanceButton(ctx.stashKit, {
    settings,
    shortcut,
    settingsLink: () => {
      const navigation = ctx.get("pluginNavigation");
      return navigation === undefined ? undefined : () => navigation.openBundle(PACKAGE);
    },
  });
  ctx.slots.inject("conversation.input.right", () =>
    ctx.slots.register(
      { name: "conversation.input.right", id: PLUGIN, order: 50, locale: PLUGIN },
      EnhanceButton,
    ),
  );

  const SettingsPage = createSettingsPage({
    catalog,
    keys: shortcut.keys,
    defaultKeys: defaultKeys(navigator.platform),
  });
  ctx.slots.inject("plugins.row.config", () =>
    ctx.slots.register(
      { name: "plugins.row.config", key: `${PACKAGE}#${PLUGIN}`, locale: PLUGIN },
      SettingsPage,
    ),
  );
}
