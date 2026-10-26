import type { ComponentType } from "react";
import type { StashKit } from "./service.ts";

/** 设置服务对一个插件条目配置的写操作。 */
export type ConfigPathOp =
  | { readonly op: "set"; readonly path: readonly string[]; readonly value: boolean | string }
  | { readonly op: "unset"; readonly path: readonly string[] };

/** 一个插件条目配置在浏览器里的同步状态。 */
export interface ConfigFormSnapshotView {
  /** `unavailable` 表示 Host 没有向这个页面开放该条目的配置。 */
  readonly status: "loading" | "ready" | "unavailable";
  /** 最近一次被 Host 接受的配置；首次接受之前为 undefined。 */
  readonly value: unknown;
  /** 用户层里原样存储的配置，字段存在即表示用户改过。 */
  readonly user: unknown;
  /** 下一次写入要携带的版本号。 */
  readonly revision: number | undefined;
  /** 当前 profile 是否接受写入。 */
  readonly writable: boolean;
}

/** 一个插件条目的配置：读取、订阅与按版本号写入。 */
export interface ConfigFormView {
  readonly getSnapshot: () => ConfigFormSnapshotView;
  readonly subscribe: (listener: () => void) => () => void;
  readonly mutate: (ops: readonly ConfigPathOp[], expectedRevision?: number) => Promise<boolean>;
}

/** 插件页为条目配置页提供的表单。 */
export interface ConfigPageFormView {
  readonly state: ConfigFormSnapshotView;
  readonly mutate: ConfigFormView["mutate"];
}

/** `plugins.row.config` 槽位传给配置页的属性。 */
export interface RowConfigProps<Key extends string> {
  /** `summary` 只要一行说明，`page` 渲染带保存按钮的表单。 */
  readonly view: "summary" | "page";
  /** 条目暴露了可编辑配置时由插件页提供。 */
  readonly form?: ConfigPageFormView | undefined;
  readonly t: (key: Key) => string;
}

/** 插件页里一个插件条目的配置页注册选项，`key` 为 `<包名>#<条目 id>`。 */
export interface RowConfigRegistration {
  readonly name: "plugins.row.config";
  readonly key: string;
  readonly locale: string;
}

/** 注入设置服务后的上下文。 */
export interface KitSettingsContext extends KitClientContext {
  readonly configForms: { get(namespace: string): ConfigFormView };
}

/** 框架 Client 根上下文里用到的服务。 */
export interface KitClientContext {
  readonly slots: {
    inject(key: "plugins.row.config", callback: () => () => void): () => void;
    register(
      options: RowConfigRegistration,
      component: ComponentType<RowConfigProps<string>>,
    ): () => void;
  };
  readonly locale: {
    register(ns: string, locale: string, dict: Readonly<Record<string, string>>): () => void;
  };
  effect(execute: () => () => void, label?: string): void;
  /** 依赖的服务全部就绪时运行 `apply`，任一服务离开时撤销它注册的一切。 */
  inject(deps: readonly ["configForms"], apply: (ctx: KitSettingsContext) => void): unknown;
  /** 向其他插件提供服务；本插件卸载时服务随之撤下。 */
  provide(name: "stashKit", value: StashKit): void;
}
