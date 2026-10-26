/**
 * Host 半边的插件值类型。DSH 对象经 `dsh-read.ts` 读取后转换成这些值，纯函数只接收它们。
 */
import type { DshSessionEvent, JsonObject } from "./dsh.ts";

/** 会话格式版本：0 是 DSH 0.1.0-rc.3，4 是 DSH 0.2.1-rc.3。两版的 fork 元数据与助手消息结构不同。 */
export type SessionFormat = 0 | 4;

/** 文本或思考内容块，可以编辑。 */
export type TextualBlock = JsonObject & {
  readonly type: "text" | "reasoning";
  readonly text: string;
};

/** 其他内容块（图片、文件、工具调用等），原样保留。 */
export type OpaqueBlock = JsonObject & { readonly type: string };

export type ContentBlock = TextualBlock | OpaqueBlock;

/** 判断内容块是否可编辑。`dsh-read.ts` 保证 `type` 为 text 或 reasoning 的块一定带字符串 `text`。 */
export function isTextualBlock(block: ContentBlock): block is TextualBlock {
  return block.type === "text" || block.type === "reasoning";
}

/** 日志里的用户消息；`sourceKind` 为 `user` 的才是用户输入，其余是插件注入的上下文。 */
export interface LoggedUserMessage {
  readonly id: string;
  readonly sourceKind: string;
  readonly content: readonly ContentBlock[];
}

/** 日志里的助手消息。 */
export interface LoggedAssistantMessage {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly content: readonly ContentBlock[];
}

/** 会话请求使用的模型路由。 */
export interface ModelRoute {
  readonly provider: string;
  readonly model: string;
  readonly maxTokens?: number;
  readonly reasoningEffort?: string;
}

/** 插件解读的会话事件；其余事件类型不进入这个视图。 */
export type LogEvent =
  | { readonly type: "turn/start"; readonly seq: number; readonly turn: number }
  | { readonly type: "turn/end"; readonly seq: number; readonly turn: number }
  | {
      readonly type: "user/message";
      readonly seq: number;
      readonly time: number;
      readonly message: LoggedUserMessage;
    }
  | {
      readonly type: "assistant/message";
      readonly seq: number;
      readonly time: number;
      readonly turn: number;
      readonly message: LoggedAssistantMessage;
    }
  | { readonly type: "request/header"; readonly seq: number; readonly route: ModelRoute }
  | { readonly type: "agent-preset/selected"; readonly seq: number; readonly agentPreset: string };

export type UserMessageEvent = Extract<LogEvent, { readonly type: "user/message" }>;
export type AssistantMessageEvent = Extract<LogEvent, { readonly type: "assistant/message" }>;

/** 一个会话的完整日志与插件视图。 */
export interface SessionLog {
  readonly id: string;
  readonly format: SessionFormat;
  readonly cwd?: string;
  /** header 记录的创建时预设；之后的切换以日志里的 `agent-preset/selected` 为准。 */
  readonly agentPreset?: string;
  /** 完整原始日志，从 seq 0 连续；fork 时继承前缀原样取自这里。 */
  readonly events: readonly DshSessionEvent[];
  /** 插件解读的事件，按 seq 升序。 */
  readonly view: readonly LogEvent[];
}

/** 版本树里的一个会话，按深度优先排列。 */
export interface LineageNode {
  readonly sessionId: string;
  readonly parentSessionId?: string;
  readonly createdAt: number;
  readonly depth: number;
}
