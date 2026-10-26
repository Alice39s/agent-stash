import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { MessageEditState } from "./controller.ts";
import { HeaderControls } from "./header-controls.tsx";
import { faceOf, READY, TIMELINE, translator } from "./testing.ts";

function render(state: MessageEditState): string {
  return renderToStaticMarkup(<HeaderControls {...faceOf(state)} t={translator("en")} />);
}

describe("HeaderControls", () => {
  test("renders nothing before the first data", () => {
    expect(render({ ...READY, status: "loading", timeline: null })).toBe("");
  });

  test("renders nothing when no control can act", () => {
    const idle = {
      ...TIMELINE,
      undoStack: [],
      redoSessionIds: [],
      retryableTurns: [],
    };
    expect(render({ ...READY, timeline: idle })).toBe("");
  });

  test("steps between versions around the position label", () => {
    const html = render(READY);
    expect(html).toContain('aria-label="Previous version"');
    expect(html).toContain(">2 / 4<");
    expect(html).toContain("Version 2 of 4");
    expect(html).toContain('aria-label="Newest of 2 next versions"');
    expect(html).toContain('aria-label="Regenerate last reply"');
    expect(html).toContain(">Regenerate<");
  });

  test("disables the backward step at the first version", () => {
    const html = render({ ...READY, timeline: { ...TIMELINE, undoStack: [] } });
    expect(html).toMatch(/aria-label="Previous version" disabled=""/u);
    expect(html).toContain(">1 / 3<");
  });

  test("shows only the regenerate action without other versions", () => {
    const html = render({
      ...READY,
      timeline: { ...TIMELINE, undoStack: [], redoSessionIds: [] },
    });
    expect(html).not.toContain(" / ");
    expect(html).toContain(">Regenerate<");
  });

  test("shows progress on the regenerate action while it runs", () => {
    const html = render({ ...READY, pending: "reroll" });
    expect(html).toContain('aria-label="Regenerating"');
    expect(html).toContain('aria-busy="true"');
  });
});
