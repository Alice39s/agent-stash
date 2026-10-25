import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { parsePromptFile } from "./prompt.ts";
import { gooseRecipes, grokSkills, initCommands } from "./adapters.ts";
import { loadInitRegistry } from "./registry.ts";

const registry = await loadInitRegistry([]);

describe("initCommands", () => {
  test("maps /init to the default preset and adds one command per preset", () => {
    const commands = initCommands(registry);
    expect(commands[0]).toMatchObject({ name: "init", preset: { name: "codex" } });
    expect(commands.map((command) => command.name)).toContain("init-qwen-code");
    expect(commands).toHaveLength(registry.presets.size + 1);
  });
});

describe("grokSkills", () => {
  test("writes slash-only skills that pass the extra prompt through $ARGUMENTS", async () => {
    const files = await grokSkills(registry);
    const skill = files.find((file) => file.path === "init-opencode/SKILL.md");
    const { matter, body } = parsePromptFile(skill?.content ?? "");
    expect(matter).toMatchObject({
      name: "init-opencode",
      "argument-hint": "[extra prompt]",
      "disable-model-invocation": true,
      metadata: { generator: "agent-stash" },
    });
    expect(body).toContain("$ARGUMENTS");
    expect(body).toContain("already exists at `.`");
  });

  test("appends $ARGUMENTS to prompts without the placeholder", async () => {
    const files = await grokSkills(registry);
    const skill = files.find((file) => file.path === "init-codex/SKILL.md");
    expect(skill?.content.trimEnd()).toMatch(
      /## Additional instructions from the user\n\n\$ARGUMENTS$/,
    );
  });
});

describe("gooseRecipes", () => {
  const RecipeSchema = v.object({
    title: v.string(),
    parameters: v.array(v.unknown()),
    prompt: v.string(),
  });

  async function recipe(name: string): Promise<v.InferOutput<typeof RecipeSchema>> {
    const files = await gooseRecipes(registry);
    return v.parse(
      RecipeSchema,
      parse(files.find((file) => file.path === `${name}.yaml`)?.content ?? ""),
    );
  }

  test("adds the extra instructions section only when extra is set", async () => {
    const crush = await recipe("init-crush");
    expect(crush).toMatchObject({
      title: "/init-crush",
      parameters: [{ key: "extra", requirement: "required", default: "" }],
    });
    expect(crush.prompt).toMatch(
      /^\{% raw %\}Analyze this codebase and create\/update \*\*AGENTS\.md\*\*/,
    );
    expect(crush.prompt).toMatch(
      /\{% endraw %\}\{% if extra %\}\n\n## Additional instructions from the user\n\n\{\{ extra \}\}\n\{% endif %\}$/,
    );
  });

  test("puts the extra parameter where the template has $ARGUMENTS", async () => {
    const opencode = await recipe("init-opencode");
    expect(opencode.prompt).toContain("{% endraw %}{{ extra }}{% raw %}");
    expect(opencode.prompt).not.toContain("$ARGUMENTS");
  });
});
