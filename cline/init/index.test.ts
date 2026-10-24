import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadInitRegistry } from "../../src/init/registry.ts";
import plugin from "./index.ts";

interface Command {
  name: string;
  description?: string;
  handler?: (input: string) => Promise<{ reply?: string; submitPrompt?: string }>;
}

async function mount(): Promise<Command> {
  const commands: Command[] = [];
  await plugin.setup(
    { registerCommand: (command) => void commands.push(command) },
    { workspaceInfo: { rootPath: "/repo" } },
  );
  const [command] = commands;
  if (command === undefined) throw new Error("the plugin registered no command");
  return command;
}

test("registers /init with the preset list", async () => {
  const command = await mount();
  expect(command.name).toBe("init");
  expect(command.description).toMatch(
    /^Write AGENTS\.md with an \/init prompt preset\. Presets: codex \(default\), /,
  );
});

test.each([" opencode Mention pnpm.", "/init opencode Mention pnpm."])(
  "submits the rendered preset for %j",
  async (input) => {
    const command = await mount();
    const preset = (await loadInitRegistry([])).presets.get("opencode");
    const template = await readFile(preset?.file ?? "", "utf8");
    const result = await command.handler?.(input);
    expect(result?.reply).toMatch(/^\/init opencode: Use the `OpenCode` prompt preset/);
    expect(result?.submitPrompt).toBe(
      template.replaceAll("$ARGUMENTS", "Mention pnpm.").replaceAll("${path}", "/repo"),
    );
  },
);
