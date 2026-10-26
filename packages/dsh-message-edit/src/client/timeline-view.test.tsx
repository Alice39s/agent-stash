import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { MessageEditState } from "./controller.ts";
import { faceOf, READY, TIMELINE, translator } from "./testing.ts";
import { TimelineView } from "./timeline-view.tsx";

function render(state: MessageEditState, locale: "en" | "zh" = "en"): string {
  return renderToStaticMarkup(<TimelineView {...faceOf(state)} t={translator(locale)} />);
}

describe("TimelineView", () => {
  test("floats the composer over the view root", () => {
    expect(render(READY)).toMatch(/^<div class="[^"]*" data-conversation-composer-overlay="">/u);
  });

  test("lists turn groups with previews, retry actions, and blocks", () => {
    const html = render(READY);
    expect(html).toContain("Turn 1");
    expect(html).toContain("Turn 3");
    expect(html).toContain("Hello");
    expect(html).toContain("No input");
    expect(html).toContain("Hi there");
    expect(html.match(/Retry turn/gu)).toHaveLength(2);
    expect(html.match(/aria-label="Edit"/gu)).toHaveLength(5);
  });

  test("shows the cascade policy as a radiogroup with the default checked", () => {
    const html = render(READY);
    expect(html).toContain('role="radiogroup"');
    expect(html).toMatch(/role="radio" aria-checked="true" tabindex="0"[^>]*>Drop</u);
    expect(html).toMatch(/role="radio" aria-checked="false" tabindex="-1"[^>]*>Replay</u);
  });

  test("renders the version tree with the current row, ids, and before and after text", () => {
    const html = render(READY);
    expect(html).toContain("6 versions");
    expect(html.match(/aria-current="true"/gu)).toHaveLength(1);
    expect(html).toMatch(/aria-current="true">.*Edited message in turn 1.* Current</u);
    expect(html).toContain(" Earlier version");
    expect(html).toContain('title="current-session">current-<');
    expect(html).toContain("Before");
    expect(html).toContain("Filled");
    expect(html).toContain('data-indent="3"');
  });

  test("shows skeleton rows and disabled controls before the first data", () => {
    const html = render({ ...READY, status: "loading", timeline: null });
    expect(html).toContain("Loading timeline");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Turn 1");
    expect(html.match(/disabled=""/gu)?.length).toBeGreaterThanOrEqual(5);
  });

  test("offers a reload when the first load fails", () => {
    const html = render({ ...READY, status: "error", error: "boom", timeline: null });
    expect(html).toContain("Could not load the timeline: boom");
    expect(html).toContain(">Reload<");
  });

  test("states the empty session as a fact", () => {
    const html = render({
      ...READY,
      timeline: { ...TIMELINE, messages: [], retryableTurns: [] },
    });
    expect(html).toContain("This session has no finished turns");
  });

  test("keeps the content while refreshing and notices failures above it", () => {
    const refreshing = render({ ...READY, status: "loading" });
    expect(refreshing).toContain("Refreshing");
    expect(refreshing).toContain("Turn 1");
    const failed = render({ ...READY, error: "conflict" });
    expect(failed).toContain(
      "Could not create a new version; the current version is unchanged: conflict",
    );
    expect(failed).toContain("Turn 1");
  });

  test("marks the acting reroll control and disables other operations", () => {
    const html = render({ ...READY, pending: "reroll" });
    expect(html).toMatch(/aria-busy="true"[^>]*>.*Regenerating</u);
    expect(html).toMatch(/disabled=""[^>]*>.*Retry turn</u);
  });

  test("follows the zh dictionary", () => {
    const html = render(READY, "zh");
    expect(html).toContain("回合 1");
    expect(html).toContain("6 个版本");
    expect(html).toContain("后续回合");
  });
});
