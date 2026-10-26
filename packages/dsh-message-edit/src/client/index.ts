/**
 * 浏览器半边入口：给每个会话建一个时间线控制器，向三个 Slot 登记界面。
 *
 * - `conversation.view`：时间线视图，列出回合与版本树。
 * - `conversation.session.header.actions`：标题栏里的版本前后切换与重新生成。
 * - `conversation.chat.assistant-actions`：每条已结束助手消息动作行里的编辑与重试按钮。
 */
import { MESSAGE_EDIT_VIEW_ORDER } from "../shared.ts";
import { AssistantActions } from "./assistant-actions.tsx";
import { createMessageEditController, type MessageEditController } from "./controller.ts";
import type { ClientContext } from "./dsh.ts";
import { HeaderControls } from "./header-controls.tsx";
import { MESSAGE_EDIT_LOCALE, registerLocale } from "./locale.ts";
import { TimelineView } from "./timeline-view.tsx";

/** 宿主后台任务按钮的 order 是 20，标题栏控件排在它后面。 */
const HEADER_ORDER = 25;
/** 宿主反馈按钮的 order 是 10，编辑与重试按钮排在它后面。 */
const ASSISTANT_ACTIONS_ORDER = 15;

/** 两版 DSH 都提供的 Service；打开会话用的 `uiWorkspace` 只在 0.2.1 存在，调用时再取。 */
export const inject = ["slots", "sessions", "locale"];

export function apply(ctx: ClientContext): void {
  ctx.effect(() => registerLocale(ctx.locale), "message-edit: locale");

  const controllers = new Map<string, MessageEditController>();
  const faceOf = (sessionId: string): object => {
    let controller = controllers.get(sessionId);
    if (controller === undefined) {
      controller = createMessageEditController(ctx, sessionId);
      controllers.set(sessionId, controller);
    }
    return controller.face;
  };
  ctx.on("connection/reset", () => {
    for (const controller of controllers.values()) controller.refreshIfLoaded();
  });

  const t = ctx.locale.bind(MESSAGE_EDIT_LOCALE);
  ctx.slots.inject("conversation.view", () =>
    ctx.slots.register(
      {
        name: "conversation.view",
        id: "message-edit-timeline",
        order: MESSAGE_EDIT_VIEW_ORDER,
        label: () => t("view.label"),
        locale: MESSAGE_EDIT_LOCALE,
        inject: faceOf,
      },
      TimelineView,
    ),
  );
  ctx.slots.inject("conversation.session.header.actions", () =>
    ctx.slots.register(
      {
        name: "conversation.session.header.actions",
        id: "message-edit-controls",
        order: HEADER_ORDER,
        locale: MESSAGE_EDIT_LOCALE,
        inject: faceOf,
      },
      HeaderControls,
    ),
  );
  ctx.slots.inject("conversation.chat.assistant-actions", () =>
    ctx.slots.register(
      {
        name: "conversation.chat.assistant-actions",
        id: "message-edit-actions",
        order: ASSISTANT_ACTIONS_ORDER,
        locale: MESSAGE_EDIT_LOCALE,
        inject: faceOf,
      },
      AssistantActions,
    ),
  );
}
