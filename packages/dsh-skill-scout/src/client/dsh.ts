/**
 * 浏览器插件用到的 DSH 客户端结构类型。插件不 import `@deepseek-ai/*` 的类型，
 * 这里只描述 DSH 0.2.1-rc.3 起提供、插件实际读取的成员。
 */
import type { ComponentType } from "react";

/** 订阅一份不可变快照，`useSyncExternalStore` 只要求这两个函数。 */
export interface Observable<T> {
  readonly getSnapshot: () => T;
  readonly subscribe: (listener: () => void) => () => void;
}

/** 可无损序列化为 JSON 的值。 */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;
export type JsonObject = { readonly [key: string]: JsonValue };

/** 翻译函数：字典键加可选的 `{name}` 模板参数。 */
export type Translate<Key extends string = string> = (
  key: Key,
  params?: Record<string, string | number>,
) => string;

/** `ctx.locale`。 */
export interface Locale {
  register(namespace: string, locale: string, dictionary: Record<string, string>): () => void;
}

/** list 类 Slot 的登记选项；`inject` 返回注入组件的属性，`locale` 让组件收到 `t`。 */
export interface SlotRegistration {
  readonly name: string;
  readonly id?: string;
  readonly key?: string;
  readonly order?: number;
  readonly locale: string;
  readonly inject?: (sessionId: string) => object;
}

/** `ctx.slots`。 */
export interface Slots {
  register<P extends object>(
    registration: SlotRegistration,
    component: ComponentType<P>,
  ): () => void;
  inject(slot: string, callback: () => () => void): () => void;
}

/** 设置服务对一个插件条目配置的写操作。 */
export type ConfigPathOp =
  | { readonly op: "set"; readonly path: readonly string[]; readonly value: JsonValue }
  | { readonly op: "unset"; readonly path: readonly string[] };

/** 一个插件条目配置在浏览器里的同步状态。 */
export interface ConfigFormSnapshotView {
  readonly status: "loading" | "ready" | "unavailable";
  readonly value: unknown;
  readonly user: unknown;
  readonly revision: number | undefined;
  readonly writable: boolean;
}

/** 插件页为条目配置页提供的表单。 */
export interface ConfigPageFormView {
  readonly state: ConfigFormSnapshotView;
  readonly mutate: (ops: readonly ConfigPathOp[], expectedRevision?: number) => Promise<boolean>;
}

/** `plugins.row.config` 槽位传给配置页的属性。 */
export interface RowConfigProps {
  readonly view: "summary" | "page";
  readonly form?: ConfigPageFormView | undefined;
  readonly t: Translate;
}

/** 一个模型的推理强度选项。 */
export interface ModelReasoningEffort {
  readonly id: string;
  readonly name: string;
}

/** `remote.session.modelCatalog()` 里的一个模型。 */
export interface ModelCatalogModel {
  readonly id: string;
  readonly name: string;
  readonly reasoning?: {
    readonly efforts: readonly ModelReasoningEffort[];
    readonly defaultEffort?: string;
  };
}

/** 一个 provider 与它的模型。 */
export interface ModelProviderGroup {
  readonly id: string;
  readonly name: string;
  readonly models: readonly ModelCatalogModel[];
}

/** Host 的模型目录与未单独配置时使用的默认模型。 */
export interface ModelCatalog {
  readonly default: {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
  };
  readonly groups: readonly ModelProviderGroup[];
  readonly failures: readonly {
    readonly id: string;
    readonly name: string;
    readonly message: string;
  }[];
}

/** 远程调用的结果。 */
export type RemoteResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

/** `ctx.remote`。 */
export interface Remote {
  readonly session: { modelCatalog(): Promise<RemoteResult<ModelCatalog>> };
  $on(event: "llm/adapters-updated" | "llm/models-updated", listener: () => void): () => void;
}

/** `ctx.get('uiWorkspace')`，负责打开会话。 */
export interface UiWorkspace {
  openSession(sessionId: string): void;
}

/** 浏览器插件 `apply` 收到的 Cordis Context 里插件用到的部分。 */
export interface ClientContext {
  readonly slots: Slots;
  readonly locale: Locale;
  readonly remote: Remote;
  get(name: "uiWorkspace"): UiWorkspace | undefined;
  on(event: "connection/reset", listener: () => void): () => void;
  effect(execute: () => () => void, label?: string): unknown;
}
