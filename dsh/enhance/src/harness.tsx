import { modalSelector } from "@deepseek-ai/dsh-client-ui-primitives";
import { act, useSyncExternalStore, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { mountKit, type KitHarness } from "../../kit/src/harness.tsx";
import type { InputStateView } from "../../shared/client/dsh.ts";
import { apply } from "./client.tsx";
import type {
  CatalogGroup,
  ConfigFormSnapshotView,
  ConfigFormView,
  ConfigPathOp,
  EnhanceClientContext,
  ModelSelectionView,
  OptionalServices,
  ProjectionValues,
  RemoteView,
  ShortcutCommandView,
  ShortcutsView,
  SlotComponents,
  UseProjection,
} from "./dsh.ts";

/** 组件测试用的设置服务：本插件条目的配置，写入按 `accept` 决定是否被接受。 */
export interface EnhanceSettingsHarness {
  readonly form: ConfigFormView;
  readonly writes: (readonly ConfigPathOp[])[];
  accept: boolean;
  /** 模拟 Host 推送新的配置值。 */
  publish(value: Readonly<Record<string, unknown>>): Promise<void>;
}

export function createEnhanceSettings(
  initial: Readonly<Record<string, unknown>> = {},
): EnhanceSettingsHarness {
  let values = initial;
  let snapshot: ConfigFormSnapshotView = {
    status: "ready",
    value: initial,
    revision: 1,
    writable: true,
  };
  const listeners = new Set<() => void>();
  const replace = (value: Readonly<Record<string, unknown>>): void => {
    values = value;
    snapshot = { ...snapshot, value, revision: (snapshot.revision ?? 0) + 1 };
    for (const listener of listeners) listener();
  };
  const harness: EnhanceSettingsHarness = {
    writes: [],
    accept: true,
    form: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      mutate: async (ops, expectedRevision) => {
        harness.writes.push(ops);
        if (!harness.accept || expectedRevision !== snapshot.revision) return false;
        const next: Record<string, unknown> = { ...values };
        for (const op of ops) {
          const field = op.path.join(".");
          if (op.op === "set") next[field] = op.value;
          else delete next[field];
        }
        replace(next);
        return true;
      },
    },
    async publish(value) {
      await act(async () => replace(value));
    },
  };
  return harness;
}

/** 组件测试用的快捷键服务：记下注册的命令，可模拟按键触发。 */
export interface ShortcutsHarness {
  readonly service: ShortcutsView;
  readonly commands: ShortcutCommandView[];
  /** 下一次带默认按键的注册是否因为与别的命令重叠而被拒绝。 */
  overlap: boolean;
  /**
   * 模拟按下命令的按键，返回服务的处理结果。与 DSH 快捷键服务一样，打开着的菜单与模态对话框
   * 记作模态层 `"other"`，命令没有声明它时按键被拦下。
   */
  press(target: Element | null): Promise<"handled" | "pass" | "blocked" | "unbound">;
}

export function createShortcuts(): ShortcutsHarness {
  const listeners = new Set<() => void>();
  let catalog: readonly { id: string; keys: readonly string[]; binding: object | null }[] = [];
  const publish = (): void => {
    catalog = harness.commands.map((command) => {
      const binding = command.defaults["web:macos"];
      return {
        id: command.id,
        keys: binding === undefined ? [] : ["⇧", "⌘", "E"],
        binding: binding ?? null,
      };
    });
    for (const listener of listeners) listener();
  };
  const harness: ShortcutsHarness = {
    commands: [],
    overlap: false,
    service: {
      register(command) {
        if (harness.overlap && Object.keys(command.defaults).length > 0) {
          harness.overlap = false;
          throw new Error("overlapping default binding");
        }
        harness.commands.push(command);
        publish();
        return () => {
          harness.commands.splice(harness.commands.indexOf(command), 1);
          publish();
        };
      },
      catalog: {
        getSnapshot: () => catalog,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
    },
    async press(target) {
      const command = harness.commands[0];
      if (command === undefined) return "unbound";
      const modal = document.querySelector(modalSelector) === null ? null : "other";
      if (modal !== null && !command.modals.includes(modal)) return "blocked";
      const resolution = command.resolve({ target, modal });
      if (resolution.status === "handled") await act(async () => resolution.run());
      return resolution.status;
    },
  };
  return harness;
}

/** 输入框与按钮。 */
export interface EnhanceHarness {
  readonly card: HTMLElement;
  readonly editable: HTMLElement;
  readonly kit: KitHarness;
  /** 当前草稿。 */
  draft(): string;
  /** 模拟用户输入：替换整个草稿。 */
  type(text: string): Promise<void>;
  /** 设置草稿里的引用块数量。 */
  references(count: number): Promise<void>;
  /** 设置会话下一次请求会用的模型。 */
  selectModel(next: ModelSelectionView["next"]): Promise<void>;
  /** 按钮所在的槽位元素。 */
  slot(): HTMLElement;
  /** 打开插件页里本插件的配置页，返回它的容器。 */
  openSettings(): Promise<HTMLElement>;
  /** `pluginNavigation.openBundle` 收到的包名。 */
  readonly navigated: string[];
  unmount(): void;
}

/** 按插件的 `apply` 挂载增强按钮，接上可驱动的输入框、设置服务与可选的快捷键、模型目录服务。 */
export async function mountEnhance(
  options: {
    readonly settings?: EnhanceSettingsHarness;
    readonly shortcuts?: ShortcutsHarness;
    readonly catalog?: () => Promise<readonly CatalogGroup[]>;
  } = {},
): Promise<EnhanceHarness> {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  const kit = mountKit();
  const registered: { -readonly [Name in keyof SlotComponents]?: SlotComponents[Name] } = {};
  let english: Readonly<Record<string, string>> = {};
  const disposers: (() => void)[] = [];
  const navigated: string[] = [];
  // 测试没有提供的服务不注入，插件里依赖它的功能就不会出现。
  const present: Readonly<Record<keyof OptionalServices, boolean>> = {
    configForms: options.settings !== undefined,
    shortcuts: options.shortcuts !== undefined,
    remote: options.catalog !== undefined,
  };
  const settingsForm = (options.settings ?? createEnhanceSettings()).form;
  const loadCatalog = options.catalog ?? (async () => []);
  const session: RemoteView["session"] = {
    modelCatalog: async () => ({ ok: true, value: { groups: await loadCatalog() } }),
  };
  /** 与 Cordis 一致：没有声明 `remote.session` 时读取它会抛错。 */
  const remoteFor = (deps: readonly string[]): RemoteView => ({
    get session() {
      if (!deps.includes("remote.session")) {
        throw new Error('cannot get property "remote.session" without inject');
      }
      return session;
    },
  });
  const services = (deps: readonly string[]): OptionalServices => ({
    configForms: { get: () => settingsForm },
    shortcuts: (options.shortcuts ?? createShortcuts()).service,
    remote: remoteFor(deps),
  });
  const ctx: EnhanceClientContext = {
    slots: {
      inject: (_key, callback) => callback(),
      register(registration, component) {
        registered[registration.name] = component;
        return () => {};
      },
    },
    locale: {
      register(_ns, locale, dict) {
        if (locale === "en") english = dict;
        return () => {};
      },
      bind: () => (key) => english[key] ?? key,
    },
    effect(execute) {
      disposers.push(execute());
    },
    inject(deps, applyInner) {
      if (present[deps[0]]) applyInner({ ...ctx, ...services(deps) });
      return undefined;
    },
    get: () => ({ openBundle: (name: string) => navigated.push(name) }),
    stashKit: kit.kit,
  };
  apply(ctx);
  const Registered = registered["conversation.input.right"];
  if (Registered === undefined) throw new Error("the plugin registered no button");
  const t = (key: string): string => english[key] ?? key;

  const card = document.createElement("div");
  card.dataset["composerCard"] = "";
  const editable = document.createElement("div");
  editable.setAttribute("contenteditable", "true");
  const slot = document.createElement("div");
  card.append(editable, slot);
  document.body.append(card);

  let state: InputStateView = { draft: "", phase: "plain", occurrences: [] };
  let projections: ProjectionValues = {
    sessionListMetadata: { lastPromptAt: 100 },
    modelSelection: { lastUsed: null, next: null },
  };
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const setDraft = (text: string): void => {
    editable.textContent = text;
    state = { ...state, draft: text };
    notify();
  };
  const useInput = <S,>(select: (input: InputStateView) => S): S =>
    useSyncExternalStore(subscribe, () => select(state));
  const useProjection: UseProjection = (key, select) =>
    useSyncExternalStore(subscribe, () => select(projections[key]));

  const roots: Root[] = [];
  const root = createRoot(slot);
  roots.push(root);
  await act(async () => {
    root.render(
      <Registered
        sessionId="s1"
        useInput={useInput}
        inputActions={{ setDraft }}
        useProjection={useProjection}
        t={t}
      />,
    );
  });

  return {
    card,
    editable,
    kit,
    navigated,
    draft: () => state.draft,
    async type(text) {
      await act(async () => setDraft(text));
    },
    async references(count) {
      await act(async () => {
        state = { ...state, occurrences: Array.from({ length: count }, (_, index) => index) };
        notify();
      });
    },
    async selectModel(next) {
      await act(async () => {
        projections = { ...projections, modelSelection: { lastUsed: null, next } };
        notify();
      });
    },
    slot: () => slot,
    async openSettings() {
      const SettingsPage = registered["plugins.row.config"];
      const form = options.settings?.form;
      if (SettingsPage === undefined || form === undefined) {
        throw new Error("the plugin registered no settings page or the settings service is off");
      }
      const Bound = (): ReactNode => {
        const snapshot = useSyncExternalStore(form.subscribe, form.getSnapshot);
        return <SettingsPage view="page" form={{ state: snapshot, mutate: form.mutate }} t={t} />;
      };
      const host = document.createElement("div");
      document.body.append(host);
      const pageRoot = createRoot(host);
      roots.push(pageRoot);
      await act(async () => pageRoot.render(<Bound />));
      return host;
    },
    unmount() {
      act(() => {
        for (const mounted of roots) mounted.unmount();
      });
      for (const dispose of disposers) dispose();
      kit.dispose();
      card.remove();
      document.body.replaceChildren();
    },
  };
}
