import type { ComponentType } from "react";
import type { InputActionsView, InputStateView } from "../../shared/client/dsh.ts";
import type { StashKit } from "../../kit/src/service.ts";

/** 可写进插件配置的 JSON 值。 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** 设置服务对一个插件条目配置的写操作。 */
export type ConfigPathOp =
  | { readonly op: "set"; readonly path: readonly string[]; readonly value: JsonValue }
  | { readonly op: "unset"; readonly path: readonly string[] };

/** 一个插件条目配置在浏览器里的同步状态。 */
export interface ConfigFormSnapshotView {
  /** `unavailable` 表示 Host 没有向这个页面开放该条目的配置。 */
  readonly status: "loading" | "ready" | "unavailable";
  readonly value: unknown;
  readonly revision: number | undefined;
  readonly writable: boolean;
}

/** 一个插件条目的配置：读取、订阅与按版本号写入。 */
export interface ConfigFormView {
  readonly getSnapshot: () => ConfigFormSnapshotView;
  readonly subscribe: (listener: () => void) => () => void;
  readonly mutate: (ops: readonly ConfigPathOp[], expectedRevision?: number) => Promise<boolean>;
}

/** `plugins.row.config` 槽位传给配置页的属性。 */
export interface RowConfigProps<Key extends string> {
  readonly view: "summary" | "page";
  readonly form?:
    | { readonly state: ConfigFormSnapshotView; readonly mutate: ConfigFormView["mutate"] }
    | undefined;
  readonly t: (key: Key) => string;
}

/** 会话投影里本插件读取的列表元数据。 */
export interface SessionListMetadata {
  readonly lastPromptAt: number | null;
}

/** 会话选中的模型路由。 */
export interface ModelSelectionRoute {
  readonly provider: string;
  readonly model: string;
  readonly reasoningEffort?: string;
}

/** 会话投影 `modelSelection` 的浏览器视图：`next` 是下一次请求会用的模型。 */
export interface ModelSelectionView {
  readonly lastUsed: ModelSelectionRoute | null;
  readonly next: ModelSelectionRoute | null;
}

/** 本插件读取的会话投影：键到浏览器视图。 */
export interface ProjectionValues {
  readonly sessionListMetadata: SessionListMetadata;
  readonly modelSelection: ModelSelectionView;
}

/** 按键读取会话投影，`select` 的结果变化时重新渲染。 */
export type UseProjection = <Key extends keyof ProjectionValues, S>(
  key: Key,
  select: (value: ProjectionValues[Key] | undefined) => S,
) => S;

/** `conversation.input.right` 槽位传给组件的标准属性里本插件用到的部分。 */
export interface RightSlotProps<Key extends string> {
  readonly sessionId: string;
  readonly useInput: <S>(select: (state: InputStateView) => S) => S;
  readonly inputActions: InputActionsView;
  readonly useProjection: UseProjection;
  readonly t: (key: Key) => string;
}

/** 模型目录里的一个模型。 */
export interface CatalogModel {
  readonly id: string;
  readonly name: string;
  readonly reasoning?: {
    readonly efforts: readonly { readonly id: string; readonly name: string }[];
    readonly defaultEffort?: string;
  };
}

/** 模型目录里的一个供应商分组。 */
export interface CatalogGroup {
  readonly id: string;
  readonly name: string;
  readonly models: readonly CatalogModel[];
}

/** Host 远程接口里本插件用到的模型目录。 */
export interface RemoteView {
  readonly session: {
    modelCatalog(): Promise<
      | { readonly ok: true; readonly value: { readonly groups: readonly CatalogGroup[] } }
      | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }
    >;
  };
}

/** 快捷键的一种按键组合，`code` 为物理按键。 */
export interface ShortcutBinding {
  readonly code: string;
  readonly modifiers: readonly ("primary" | "shift" | "alt" | "control" | "meta")[];
}

/**
 * 快捷键命令被触发时的输入上下文。`modal` 是最上层模态层的名字：打开着的菜单与
 * 没有 `data-shortcut-modal` 的对话框都记作 `"other"`，没有模态层时为 `null`。
 */
export interface ShortcutContextView {
  readonly target: Element | null;
  readonly modal: string | null;
}

export type ShortcutResolution =
  | { readonly status: "handled"; run(): void }
  | { readonly status: "pass" };

/** 注册给 DSH 快捷键服务的一条命令。 */
export interface ShortcutCommandView {
  readonly id: string;
  readonly label: () => string;
  readonly aliases: readonly string[];
  readonly defaults: Readonly<Record<string, ShortcutBinding>>;
  readonly regions: readonly ("page" | "editable" | "terminal")[];
  readonly modals: readonly string[];
  resolve(context: ShortcutContextView): ShortcutResolution;
}

/** 快捷键目录里的一行：当前生效的按键。 */
export interface ShortcutCatalogEntryView {
  readonly id: string;
  readonly keys: readonly string[];
  readonly binding: object | null;
}

/** DSH 快捷键服务里本插件用到的部分。 */
export interface ShortcutsView {
  register(command: ShortcutCommandView): () => void;
  readonly catalog: {
    getSnapshot(): readonly ShortcutCatalogEntryView[];
    subscribe(listener: () => void): () => void;
  };
}

/** 插件页导航：打开某个组合包的详情。 */
export interface PluginNavigationView {
  openBundle(packageName: string): void;
}

/** 可注入的服务名：可选服务与 `remote` 下本插件调用的子服务。 */
export type ServiceName = keyof OptionalServices | "remote.session";

/** 可选服务：插件按需注入，服务不在时对应功能不出现。 */
export interface OptionalServices {
  readonly configForms: { get(namespace: string): ConfigFormView };
  readonly shortcuts: ShortcutsView;
  readonly remote: RemoteView;
}

/** 本插件注册的槽位：槽位名到组件类型。 */
export interface SlotComponents {
  readonly "conversation.input.right": ComponentType<RightSlotProps<string>>;
  readonly "plugins.row.config": ComponentType<RowConfigProps<string>>;
}

/**
 * 槽位注册选项：列表槽位（`conversation.input.right`）用 `id` 与 `order`，
 * 键控槽位（`plugins.row.config`）用 `key`。
 */
export interface SlotOptions<Name extends keyof SlotComponents> {
  readonly name: Name;
  readonly locale: string;
  readonly id?: string;
  readonly order?: number;
  readonly key?: string;
}

/** Client 根上下文里本插件用到的服务。 */
export interface EnhanceClientContext {
  readonly slots: {
    inject(key: keyof SlotComponents, callback: () => () => void): () => void;
    register<Name extends keyof SlotComponents>(
      options: SlotOptions<Name>,
      component: SlotComponents[Name],
    ): () => void;
  };
  readonly locale: {
    register(ns: string, locale: string, dict: Readonly<Record<string, string>>): () => void;
    bind(ns: string): (key: string) => string;
  };
  effect(execute: () => () => void, label?: string): void;
  /**
   * 依赖的服务全部就绪时运行 `apply`，任一服务离开时撤销它注册的一切。`remote` 的子服务
   * 要单独列出，例如读取 `remote.session` 需要同时声明 `"remote"` 与 `"remote.session"`。
   */
  inject<Name extends keyof OptionalServices>(
    deps: readonly [Name, ...ServiceName[]],
    apply: (ctx: EnhanceClientContext & Pick<OptionalServices, Name>) => void,
  ): unknown;
  get(name: "pluginNavigation"): PluginNavigationView | undefined;
  readonly stashKit: StashKit;
}

/** Client 半部声明的依赖服务；`stashKit` 来自 Agent Stash 框架插件。 */
export const CLIENT_INJECT = ["slots", "locale", "stashKit"];
