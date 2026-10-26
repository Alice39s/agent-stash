/**
 * 浏览器插件用到的 DSH 客户端结构类型。
 *
 * DSH 0.1.0-rc.3 与 0.2.1-rc.3 的客户端包不同（`dsh-client-runtime` 换成了 `dsh-api-session-controller`
 * 等包），插件不 import 任何一版的类型，这里只描述两版共有、插件实际读取的成员；一版独有的成员标成可选，
 * 在使用处做特性检测。
 */
import type { ComponentType } from "react";

/** 订阅一份不可变快照，`useSyncExternalStore` 只要求这两个方法。 */
export interface Observable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}

/** 会话列表里一行会话的摘要。 */
export interface SessionSummary {
  readonly parentId?: string;
}

/** `sessions.list` 的快照；`ids` 是 Host 会话列表的成员。 */
export interface SessionListState {
  readonly ids: readonly string[];
  readonly byId: Readonly<Record<string, SessionSummary | undefined>>;
}

/** 已打开会话的快照里，两版都有、能反映回合进展的字段。 */
export interface SessionSnapshot {
  readonly running: boolean;
  readonly openState: string;
  readonly removed: boolean;
}

/** 已打开会话的绑定。 */
export interface SessionBinding {
  readonly session: Observable<SessionSnapshot>;
}

/** `ctx.sessions`。`open` 只在 0.1.0-rc.3 存在。 */
export interface Sessions {
  readonly list: Observable<SessionListState>;
  binding(sessionId: string): SessionBinding | undefined;
  open?: (sessionId: string) => void;
}

/** 0.2.1 的 `ctx.uiWorkspace`，负责打开会话。 */
export interface UiWorkspace {
  openSession(sessionId: string): void;
}

/** 翻译函数：字典键加可选的 `{name}` 模板参数。 */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** `ctx.locale`；两版都有单语言的 `register(ns, locale, dict)` 与 `bind(ns)`。 */
export interface Locale {
  register(namespace: string, locale: string, dictionary: Record<string, string>): () => void;
  bind(namespace: string): Translate;
}

/** list 类 Slot 的登记选项；`inject` 按会话返回注入面，`locale` 让组件收到 `t`。 */
export interface SlotRegistration {
  readonly name: string;
  readonly id: string;
  readonly order?: number;
  readonly label?: string | (() => string);
  readonly locale?: string;
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

/** 浏览器插件 `apply` 收到的 Cordis Context 里插件用到的部分。 */
export interface ClientContext {
  readonly slots: Slots;
  readonly sessions: Sessions;
  readonly locale: Locale;
  get(name: "uiWorkspace"): UiWorkspace | undefined;
  on(event: "connection/reset", listener: () => void): () => void;
  effect(execute: () => () => void, label?: string): () => Promise<void>;
}
