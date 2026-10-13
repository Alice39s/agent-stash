import { readFile } from "node:fs/promises";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { join } from "pathe";
import { parseInitArgs, renderInitPrompt } from "../../../src/init/prompt.ts";
import { CONFIG_PATH, loadInitRegistry, type InitRegistry } from "../../../src/init/registry.ts";

/** 个人配置在前，受信任项目的 `.pi` 配置在后。 */
function configFiles(ctx: ExtensionContext): string[] {
  const files = [join(getAgentDir(), CONFIG_PATH)];
  if (ctx.isProjectTrusted()) {
    files.push(join(ctx.cwd, ".pi", CONFIG_PATH));
  }
  return files;
}

export default function initExtension(pi: ExtensionAPI): void {
  let completionRegistry: InitRegistry | undefined;

  pi.on("session_start", async (_event, ctx) => {
    completionRegistry = await loadInitRegistry(configFiles(ctx));
  });

  pi.registerCommand("init", {
    description: "Write AGENTS.md with an upstream /init prompt: /init [preset] [extra prompt]",
    getArgumentCompletions: (prefix) => {
      if (!completionRegistry || /\s/.test(prefix)) {
        return null;
      }
      const { defaultPreset, presets } = completionRegistry;
      const items = [...presets.values()]
        .filter((preset) => preset.name.startsWith(prefix))
        .map((preset) => ({
          value: preset.name,
          label: preset.name,
          description:
            preset.name === defaultPreset ? `default · ${preset.description}` : preset.description,
        }));
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      const registry = await loadInitRegistry(configFiles(ctx));
      completionRegistry = registry;
      const { preset, extra } = parseInitArgs(args, registry);
      const template = await readFile(preset.file, "utf8");
      const prompt = renderInitPrompt(template, extra, ctx.cwd);

      ctx.ui.notify(`/init ${preset.name} · ${preset.description}`, "info");
      pi.sendUserMessage(
        prompt,
        ctx.isIdle()
          ? { expandPromptTemplates: false }
          : { deliverAs: "followUp", expandPromptTemplates: false },
      );
    },
  });
}
