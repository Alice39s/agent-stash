import { readFile } from "node:fs/promises";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { parseInitArgs, renderInitPrompt } from "./prompt.ts";
import { loadInitRegistry, type InitRegistry, type RegistryLocation } from "./registry.ts";

function registryLocation(ctx: ExtensionContext): RegistryLocation {
  return { agentDir: getAgentDir(), projectDir: ctx.isProjectTrusted() ? ctx.cwd : undefined };
}

export default function initExtension(pi: ExtensionAPI): void {
  let completionRegistry: InitRegistry | undefined;

  pi.on("session_start", async (_event, ctx) => {
    completionRegistry = await loadInitRegistry(registryLocation(ctx));
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
      const registry = await loadInitRegistry(registryLocation(ctx));
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
