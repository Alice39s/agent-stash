import { describe, expect, test } from "vitest";
import { extractSubmitPrompt, removeLeadingSentence } from "./extract.ts";

const source = `
export const initCommand = {
  name: "init",
  action: async () => {
    if (missing) return { type: "message", content: \`Missing \${file}\` };
    return {
      type: "submit_prompt",
      content: \`
Create \${contextFileName} and quote \\\`code\\\`.
\`,
    };
  },
};
`;

describe("extractSubmitPrompt", () => {
  test("returns the submit_prompt template with interpolations filled", () => {
    expect(extractSubmitPrompt("init.ts", source, { contextFileName: "AGENTS.md" })).toBe(
      "Create AGENTS.md and quote `code`.\n",
    );
  });

  test("rejects interpolations without a value", () => {
    expect(() => extractSubmitPrompt("init.ts", source, {})).toThrow(/unsupported expression/);
  });

  test("rejects sources without a submit_prompt template", () => {
    expect(() => extractSubmitPrompt("init.ts", "export const x = 1;", {})).toThrow(
      /0 submit_prompt/,
    );
  });
});

describe("removeLeadingSentence", () => {
  const identity = "You are Qwen Code, an interactive CLI agent.";

  test("drops the sentence and the whitespace after it", () => {
    expect(removeLeadingSentence(`${identity} Analyze the current directory.\n`, identity)).toBe(
      "Analyze the current directory.\n",
    );
  });

  test("rejects prompts that start differently", () => {
    expect(() => removeLeadingSentence("Analyze the current directory.\n", identity)).toThrow(
      /no longer starts with/,
    );
  });
});
