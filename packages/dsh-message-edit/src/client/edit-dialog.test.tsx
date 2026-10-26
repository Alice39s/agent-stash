import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { EditableMessageBlock } from "../shared.ts";
import { EditDialog, type EditDialogProps } from "./edit-dialog.tsx";
import { faceOf, READY, TIMELINE, translator } from "./testing.ts";

const FACE = faceOf(READY);

function render(overrides: Partial<EditDialogProps>): string {
  return renderToStaticMarkup(
    <EditDialog
      t={translator("en")}
      store={FACE.store}
      edit={FACE.edit}
      choices={TIMELINE.messages.slice(0, 3)}
      hasLaterTurns
      initialCascade="truncate"
      onClose={() => {}}
      {...overrides}
    />,
  );
}

function reply(): EditableMessageBlock {
  const block = TIMELINE.messages[2];
  if (block === undefined) throw new Error("fixture has no reply block");
  return block;
}

describe("EditDialog", () => {
  test("is a closed native dialog that the host recognizes as modal", () => {
    const html = render({});
    expect(html).toMatch(/^<dialog role="dialog" aria-modal="true" aria-label="Edit turn 1"/u);
    expect(html).not.toMatch(/<dialog[^>]* open/u);
  });

  test("starts with option rows when several blocks can be edited", () => {
    const html = render({});
    expect(html).toContain("Choose the part of this turn to edit.");
    expect(html).toContain(">Message<");
    expect(html).toContain(">Reasoning<");
    expect(html).toContain(">Reply<");
    expect(html).not.toContain("<textarea");
  });

  test("opens the text step directly for a single block", () => {
    const html = render({ choices: [reply()] });
    expect(html).toContain('aria-label="Edit reply"');
    expect(html).toMatch(
      /<textarea[^>]*aria-label="Reply"[^>]*data-modal-autofocus=""[^>]*>Hi there<\/textarea>/u,
    );
    expect(html).toContain("Saving creates a new version that ends at this turn.");
    expect(html).toContain('role="radiogroup"');
    expect(html).not.toContain(">Back<");
    expect(html).toMatch(/disabled=""[^>]*>Save</u);
  });

  test("gives the first option row the initial focus", () => {
    expect(render({})).toMatch(/<button[^>]*data-modal-autofocus="true"[^>]*><span[^>]*>Message</u);
  });

  test("ignores controller errors that no save from this dialog produced", () => {
    const failed = faceOf({ ...READY, error: "conflict" });
    const html = render({ choices: [reply()], store: failed.store });
    expect(html).not.toContain('role="alert"');
    expect(html).toContain("Saving creates a new version");
  });

  test("omits the cascade choice for the last turn", () => {
    const html = render({ choices: [reply()], hasLaterTurns: false });
    expect(html).toContain("Saving creates a new version from this turn.");
    expect(html).not.toContain('role="radiogroup"');
  });
});
