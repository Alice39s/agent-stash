import { describe, expect, test } from "vitest";
import { judgeRequest, parseVerdict } from "./judge.ts";

const VERDICT = {
  fidelity: 2,
  modality: 1,
  context: null,
  mode: 2,
  restraint: 0,
  issues: ["adds a heading"],
};

describe("judge request", () => {
  test("states the mode contract of the preset and the hard gates", () => {
    const { system } = judgeRequest({
      preset: "concise",
      draft: "d",
      context: [],
      intent: "i",
      text: "d",
      unchanged: true,
    });
    expect(system).toContain("concise: remove filler");
    expect(system).not.toContain("polish: improve");
    expect(system).toContain("never answer the draft");
  });

  test("puts the context, draft, notes, and result in tagged sections", () => {
    const { user } = judgeRequest({
      preset: "polish",
      draft: "do that",
      context: [{ user: "plan?", assistant: "Plan A." }],
      intent: "do plan A",
      text: "Carry out plan A.",
      unchanged: false,
    });
    expect(user).toBe(
      [
        "<mode>polish</mode>",
        "<conversation_context>\n[Turn 1]\nUser: plan?\nAssistant: Plan A.\n</conversation_context>",
        "<draft>\ndo that\n</draft>",
        "<reference_notes>\ndo plan A\n</reference_notes>",
        '<result unchanged="false">\nCarry out plan A.\n</result>',
      ].join("\n\n"),
    );
  });

  test("writes none when there is no context", () => {
    const { user } = judgeRequest({
      preset: "structure",
      draft: "d",
      context: [],
      intent: "i",
      text: "d",
      unchanged: true,
    });
    expect(user).toContain("<conversation_context>\nnone\n</conversation_context>");
  });
});

describe("judge verdict", () => {
  test("reads a JSON verdict, also inside a code fence", () => {
    const json = JSON.stringify(VERDICT);
    expect(parseVerdict(json, false)).toEqual({ ok: true, verdict: VERDICT });
    expect(parseVerdict(`\`\`\`json\n${json}\n\`\`\``, false)).toEqual({
      ok: true,
      verdict: VERDICT,
    });
  });

  test("rejects grades outside 0, 1, and 2", () => {
    const result = parseVerdict(JSON.stringify({ ...VERDICT, fidelity: 3 }), false);
    expect(result.ok).toBe(false);
  });

  test("rejects text that is not JSON", () => {
    expect(parseVerdict("Looks good to me.", false).ok).toBe(false);
  });

  test("requires a context grade exactly when a context was given", () => {
    expect(parseVerdict(JSON.stringify(VERDICT), true)).toEqual({
      ok: false,
      detail: "context is null although a conversation context was given",
    });
    expect(parseVerdict(JSON.stringify({ ...VERDICT, context: 2 }), false)).toEqual({
      ok: false,
      detail: "context is graded although no conversation context was given",
    });
  });
});
