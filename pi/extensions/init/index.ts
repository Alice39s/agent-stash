import { readFile } from "node:fs/promises";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { join } from "pathe";
import { parseInitArgs, renderInitPrompt } from "../../../src/init/prompt.ts";
import { CONFIG_PATH, loadInitRegistry, type InitRegistry } from "../../../src/init/registry.ts";

export const EXTRA_PROMPT_HINT = "[extra prompt]";

interface CompletionItem {
  value: string;
  label: string;
  description: string;
}

/** 个人配置在前，受信任项目的 `.pi` 配置在后。 */
function configFiles(ctx: ExtensionContext): string[] {
  const files = [join(getAgentDir(), CONFIG_PATH)];
  if (ctx.isProjectTrusted()) {
    files.push(join(ctx.cwd, ".pi", CONFIG_PATH));
  }
  return files;
}

/**
 * `/init` 的参数补全。预设行带上 `[extra prompt]` 提示，选中后插入预设名与空格；
 * 只输入了预设名与空格时，显示一行额外指令的提示。
 */
export function initCompletions(prefix: string, registry: InitRegistry): CompletionItem[] | null {
  const { defaultPreset, presets } = registry;
  const named = /^(\S+) $/.exec(prefix);
  const selected = named ? presets.get(named[1] ?? "") : undefined;
  if (selected) {
    return [
      {
        value: prefix,
        label: EXTRA_PROMPT_HINT,
        description: `Optional. Type extra instructions for the \`${selected.name}\` preset, or press Enter to run it as is.`,
      },
    ];
  }
  if (/\s/.test(prefix)) {
    return null;
  }
  const items = [...presets.values()]
    .filter((preset) => preset.name.startsWith(prefix))
    .map((preset) => ({
      value: `${preset.name} `,
      label: `${preset.name} ${EXTRA_PROMPT_HINT}`,
      description:
        preset.name === defaultPreset ? `(default) ${preset.description}` : preset.description,
    }));
  return items.length > 0 ? items : null;
}

export default function initExtension(pi: ExtensionAPI): void {
  let completionRegistry: InitRegistry | undefined;

  pi.on("session_start", async (_event, ctx) => {
    completionRegistry = await loadInitRegistry(configFiles(ctx));
  });

  pi.registerCommand("init", {
    description: "Write AGENTS.md with an /init prompt preset: /init [preset] [extra prompt]",
    getArgumentCompletions: (prefix) =>
      completionRegistry ? initCompletions(prefix, completionRegistry) : null,
    handler: async (args, ctx) => {
      const registry = await loadInitRegistry(configFiles(ctx));
      completionRegistry = registry;
      const { preset, extra } = parseInitArgs(args, registry);
      const template = await readFile(preset.file, "utf8");
      const prompt = renderInitPrompt(template, extra, ctx.cwd);

      ctx.ui.notify(`/init ${preset.name}: ${preset.description}`, "info");
      pi.sendUserMessage(
        prompt,
        ctx.isIdle()
          ? { expandPromptTemplates: false }
          : { deliverAs: "followUp", expandPromptTemplates: false },
      );
    },
  });
}
