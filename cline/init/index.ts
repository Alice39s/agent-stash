import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "pathe";
import { parseInitArgs, renderInitPrompt } from "../../src/init/prompt.ts";
import { CONFIG_PATH, listPresetNames, loadInitRegistry } from "../../src/init/registry.ts";

/** `@cline/core` 插件接口中用到的部分。 */
interface CommandResult {
  reply?: string;
  submitPrompt?: string;
}

interface PluginApi {
  registerCommand(command: {
    name: string;
    description?: string;
    handler?: (input: string) => Promise<CommandResult>;
  }): void;
}

interface SetupContext {
  workspaceInfo?: { rootPath?: string };
}

/** `$CLINE_DIR/agent-stash/init.json`，未设置 `CLINE_DIR` 时为 `~/.cline/agent-stash/init.json`。 */
export function clineConfigFile(): string {
  return join(process.env.CLINE_DIR ?? join(homedir(), ".cline"), CONFIG_PATH);
}

/** Cline 把 `/init` 后面的文字传给 handler，开头可能带着命令名本身。 */
function argumentsOf(input: string): string {
  return input.replace(/^\s*\/init(?=\s|$)/, "");
}

export default {
  name: "agent-stash-init",
  manifest: { capabilities: ["commands"] },
  async setup(api: PluginApi, ctx: SetupContext): Promise<void> {
    const projectDir = ctx.workspaceInfo?.rootPath ?? process.cwd();
    const registry = await loadInitRegistry([clineConfigFile()]);
    api.registerCommand({
      name: "init",
      description: `Write AGENTS.md with an /init prompt preset. Presets: ${listPresetNames(registry)}`,
      handler: async (input) => {
        const current = await loadInitRegistry([clineConfigFile()]);
        const { preset, extra } = parseInitArgs(argumentsOf(input), current);
        const template = await readFile(preset.file, "utf8");
        return {
          reply: `/init ${preset.name}: ${preset.description}`,
          submitPrompt: renderInitPrompt(template, extra, projectDir),
        };
      },
    });
  },
};
