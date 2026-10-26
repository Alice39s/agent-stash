import { describe, expect, test } from "vitest";
import { parseInitArgs, parsePromptFile, renderInitPrompt } from "./prompt.ts";
import type { InitPreset, InitRegistry } from "./registry.ts";

function preset(name: string): InitPreset {
  return {
    name,
    title: name,
    description: `${name} preset`,
    file: `/presets/${name}.md`,
    custom: false,
  };
}

const registry: InitRegistry = {
  defaultPreset: "codex",
  presets: new Map(["codex", "kimi-code", "opencode"].map((name) => [name, preset(name)])),
};

describe("parseInitArgs", () => {
  test("uses the default preset without arguments", () => {
    expect(parseInitArgs("  ", registry)).toEqual({ preset: preset("codex"), extra: "" });
  });

  test("selects a named preset", () => {
    expect(parseInitArgs("kimi-code", registry)).toEqual({
      preset: preset("kimi-code"),
      extra: "",
    });
  });

  test("keeps the text after a preset name as the extra prompt", () => {
    expect(parseInitArgs("opencode  focus on\n  tests ", registry)).toEqual({
      preset: preset("opencode"),
      extra: "focus on\n  tests",
    });
  });

  test("treats a leading word that names no preset as the extra prompt", () => {
    expect(parseInitArgs("write it in Chinese", registry)).toEqual({
      preset: preset("codex"),
      extra: "write it in Chinese",
    });
  });
});

describe("renderInitPrompt", () => {
  test("fills ${path} and $ARGUMENTS", () => {
    const template = "Focus:\n$ARGUMENTS\n\nIf `AGENTS.md` already exists at `${path}`, update it.";
    expect(renderInitPrompt(template, "monorepo layout", "/repo")).toBe(
      "Focus:\nmonorepo layout\n\nIf `AGENTS.md` already exists at `/repo`, update it.",
    );
  });

  test("appends the extra prompt when the template has no $ARGUMENTS", () => {
    expect(renderInitPrompt("Generate AGENTS.md.\n", "mention pnpm", "/repo")).toBe(
      "Generate AGENTS.md.\n\n## Additional instructions from the user\n\nmention pnpm\n",
    );
  });

  test("returns the template unchanged without an extra prompt", () => {
    expect(renderInitPrompt("Generate AGENTS.md.\n", "", "/repo")).toBe("Generate AGENTS.md.\n");
  });

  test("drops the YAML frontmatter", () => {
    const template =
      "---\nname: init\ndescription: Generate AGENTS.md\n---\n\nExplore the codebase.\n";
    expect(renderInitPrompt(template, "", "/repo")).toBe("Explore the codebase.\n");
  });

  test("names AGENTS.md in the Crush template", () => {
    const template = "Create **{{.Config.Options.InitializeAs}}** for this repository.\n";
    expect(renderInitPrompt(template, "", "/repo")).toBe(
      "Create **AGENTS.md** for this repository.\n",
    );
  });
});

describe("parsePromptFile", () => {
  test("exposes the frontmatter", () => {
    expect(parsePromptFile("---\nversion: v1\n---\nBody\n")).toEqual({
      matter: { version: "v1" },
      body: "Body\n",
    });
  });
});
