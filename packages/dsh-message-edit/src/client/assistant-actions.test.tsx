import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AssistantActions } from "./assistant-actions.tsx";
import type { MessageEditState } from "./controller.ts";
import { faceOf, READY, translator } from "./testing.ts";

function render(state: MessageEditState, messageId: string): string {
  return renderToStaticMarkup(
    <AssistantActions {...faceOf(state)} t={translator("en")} messageId={messageId} />,
  );
}

describe("AssistantActions", () => {
  test("renders edit before retry for a message in a retryable turn", () => {
    const html = render(READY, "m0");
    expect(html.indexOf('aria-label="Edit"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Edit"')).toBeLessThan(html.indexOf('aria-label="Retry turn"'));
    expect(html).not.toContain("disabled");
    expect(html).not.toContain("<dialog");
  });

  test("renders disabled buttons while the timeline loads", () => {
    const html = render({ ...READY, status: "loading", timeline: null }, "m0");
    expect(html.match(/disabled=""/gu)).toHaveLength(2);
  });

  test("follows disabled buttons with a status line when the first load failed", () => {
    const html = render({ ...READY, status: "error", error: "boom", timeline: null }, "m0");
    expect(html.match(/disabled=""/gu)).toHaveLength(2);
    expect(html).toMatch(/role="status"[^>]*>Could not load the timeline: boom</u);
  });

  test("renders nothing for unknown messages and turns without user input", () => {
    expect(render(READY, "missing")).toBe("");
    expect(render(READY, "m2")).toBe("");
  });

  test("disables retry while another operation runs", () => {
    const html = render({ ...READY, pending: "edit" }, "m1");
    expect(html.match(/disabled=""/gu)).toHaveLength(2);
  });
});
