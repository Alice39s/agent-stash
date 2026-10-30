import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { MessageEditState } from "./controller.ts";
import { faceOf, READY, translator, UNANSWERED_TIMELINE } from "./testing.ts";
import { TurnActions } from "./turn-actions.tsx";

const UNANSWERED: MessageEditState = { ...READY, timeline: UNANSWERED_TIMELINE };

/** 回合 `turn` 的 `turn/end` 是 seq 40；`seq` 等于 40 表示回合没有收尾助手消息。 */
function render(state: MessageEditState, turn: number, seq = 40): string {
  return renderToStaticMarkup(
    <TurnActions
      {...faceOf(state)}
      t={translator("en")}
      turn={{ turn, end: { seq: 40 } }}
      seq={seq}
    />,
  );
}

describe("TurnActions", () => {
  test("renders edit message before retry for a turn without a reply", () => {
    const html = render(UNANSWERED, 4);
    expect(html).toMatch(/^<div class="[^"]+">/u);
    expect(html.indexOf('aria-label="Edit message"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Edit message"')).toBeLessThan(
      html.indexOf('aria-label="Retry turn"'),
    );
    expect(html).not.toContain("disabled");
  });

  test("renders nothing for a turn that closes with a saved reply", () => {
    expect(render(UNANSWERED, 4, 37)).toBe("");
  });

  test("renders nothing for turns without user input or outside the timeline", () => {
    expect(render(UNANSWERED, 3)).toBe("");
    expect(render(READY, 4)).toBe("");
  });

  test("offers only retry when the message has no text", () => {
    const imageOnly: MessageEditState = {
      ...UNANSWERED,
      timeline: {
        ...UNANSWERED_TIMELINE,
        messages: UNANSWERED_TIMELINE.messages.filter((item) => item.turn !== 4),
      },
    };
    const html = render(imageOnly, 4);
    expect(html).not.toContain("Edit message");
    expect(html).toContain('aria-label="Retry turn"');
  });

  test("renders disabled buttons and the load failure while the timeline is missing", () => {
    const html = render({ ...READY, status: "error", error: "boom", timeline: null }, 4);
    expect(html.match(/disabled=""/gu)).toHaveLength(2);
    expect(html).toMatch(/role="status"[^>]*>Could not load the timeline: boom</u);
  });

  test("disables both buttons while another operation runs", () => {
    const html = render({ ...UNANSWERED, pending: "edit" }, 4);
    expect(html.match(/disabled=""/gu)).toHaveLength(2);
  });
});
