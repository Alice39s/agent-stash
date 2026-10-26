import type { ComponentType } from "react";
import type { StashKit } from "../../kit/src/service.ts";

/** 输入框发布的草稿状态里本插件读取的字段。 */
export interface InputStateView {
  /** 草稿的纯文本投影。 */
  readonly draft: string;
  /** `plain` 之外的阶段（命令认领、提交中）不接管按键。 */
  readonly phase: "plain" | "adjudicating" | "claimed" | "submitting";
  /** 草稿里的引用块；含引用块的草稿不做回溯与补全。 */
  readonly occurrences: readonly unknown[];
}

/** 输入框动作里本插件用到的部分。 */
export interface InputActionsView {
  /** 用纯文本替换整个草稿，光标落在末尾。 */
  setDraft(text: string): void;
}

/** 会话投影里本插件读取的列表元数据。 */
export interface SessionListMetadata {
  readonly lastPromptAt: number | null;
}

/** `conversation.input.overlay` 槽位传给组件的标准属性。 */
export interface OverlayProps<Key extends string> {
  readonly sessionId: string;
  readonly useInput: <S>(select: (state: InputStateView) => S) => S;
  readonly inputActions: InputActionsView;
  readonly useProjection: <S>(
    key: "sessionListMetadata",
    select: (value: SessionListMetadata | undefined) => S,
  ) => S;
  readonly t: (key: Key) => string;
}

/** 槽位注册选项里本插件用到的字段。 */
export interface OverlayRegistration {
  readonly name: "conversation.input.overlay";
  readonly id: string;
  readonly order: number;
  readonly locale: string;
}

/** Client 根上下文里本插件用到的服务。 */
export interface DshClientContext {
  readonly slots: {
    inject(key: "conversation.input.overlay", callback: () => () => void): () => void;
    register(
      options: OverlayRegistration,
      component: ComponentType<OverlayProps<string>>,
    ): () => void;
  };
  readonly locale: {
    register(ns: string, locale: string, dict: Readonly<Record<string, string>>): () => void;
  };
  effect(execute: () => () => void, label?: string): void;
  /** Agent Stash 框架提供的共享面板、灰字、动画与外观配置。 */
  readonly stashKit: StashKit;
}

/**
 * Client 半部声明的依赖服务。`stashKit` 来自 Agent Stash 框架插件，
 * 框架没有启用时浮层停在等待依赖，启用后自动加载。
 */
export const CLIENT_INJECT = ["slots", "locale", "stashKit"];
