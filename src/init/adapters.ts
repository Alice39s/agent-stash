import { readFile } from "node:fs/promises";
import { stringify } from "yaml";
import { ARGUMENTS, EXTRA_HEADING, fillInitTemplate, renderInitPrompt } from "./prompt.ts";
import type { InitPreset, InitRegistry } from "./registry.ts";

/** 生成的文件，`path` 相对安装目录。 */
export interface GeneratedFile {
  path: string;
  content: string;
}

/** 写进生成文件的标记，重新安装时据此识别并替换旧文件。 */
export const GENERATOR = "agent-stash";

/** 静态生成的 prompt 不知道会在哪个目录运行，`${path}` 统一写成当前目录。 */
const PROJECT_DIR = ".";

interface InitCommand {
  name: string;
  preset: InitPreset;
}

/** `init` 使用默认预设，`init-<preset>` 对应每个预设。 */
export function initCommands(registry: InitRegistry): InitCommand[] {
  const fallback = registry.presets.get(registry.defaultPreset);
  if (fallback === undefined) {
    throw new Error(`/init default preset "${registry.defaultPreset}" is not defined`);
  }
  return [
    { name: "init", preset: fallback },
    ...[...registry.presets.values()].map((preset) => ({ name: `init-${preset.name}`, preset })),
  ];
}

async function render(preset: InitPreset, extra: string): Promise<string> {
  return renderInitPrompt(await readFile(preset.file, "utf8"), extra, PROJECT_DIR);
}

function frontmatter(data: Record<string, unknown>): string {
  return `---\n${stringify(data, { lineWidth: 0 })}---\n\n`;
}

/** Grok Build 的技能：每个命令一个目录，额外指令由 Grok 填进 `$ARGUMENTS`。 */
export async function grokSkills(registry: InitRegistry): Promise<GeneratedFile[]> {
  return Promise.all(
    initCommands(registry).map(async ({ name, preset }) => ({
      path: `${name}/SKILL.md`,
      content:
        frontmatter({
          name,
          description: `Write AGENTS.md with the \`${preset.name}\` /init preset. ${preset.description}`,
          "argument-hint": "[extra prompt]",
          "disable-model-invocation": true,
          metadata: { generator: GENERATOR },
        }) + (await render(preset, ARGUMENTS)),
    })),
  );
}

/**
 * goose 用 MiniJinja 渲染 recipe：prompt 正文放进 raw 块，`$ARGUMENTS` 换成 `{{ extra }}`。
 * 模板没有 `$ARGUMENTS` 时，额外指令小节只在 `extra` 非空时出现。
 */
async function gooseTemplate(preset: InitPreset): Promise<string> {
  const prompt = fillInitTemplate(await readFile(preset.file, "utf8"), PROJECT_DIR);
  if (prompt.includes("{% endraw %}")) {
    throw new Error(
      `The ${preset.name} prompt contains {% endraw %}, which goose recipes cannot quote`,
    );
  }
  if (prompt.includes(ARGUMENTS)) {
    return `{% raw %}${prompt.split(ARGUMENTS).join("{% endraw %}{{ extra }}{% raw %}")}{% endraw %}`;
  }
  return `{% raw %}${prompt.trimEnd()}{% endraw %}{% if extra %}\n\n${EXTRA_HEADING}\n\n{{ extra }}\n{% endif %}`;
}

/**
 * goose 的 recipe：每个命令一个文件，slash command 后面的文字作为 `extra` 参数传入。
 * goose 只把整句文字交给唯一的必填参数，`extra` 因此设为必填，空默认值让它可以省略。
 */
export async function gooseRecipes(registry: InitRegistry): Promise<GeneratedFile[]> {
  return Promise.all(
    initCommands(registry).map(async ({ name, preset }) => ({
      path: `${name}.yaml`,
      content: stringify(
        {
          version: "1.0.0",
          title: `/${name}`,
          description: preset.description,
          parameters: [
            {
              key: "extra",
              input_type: "string",
              requirement: "required",
              default: "",
              description: "Extra instructions for the /init prompt",
            },
          ],
          prompt: await gooseTemplate(preset),
        },
        { lineWidth: 0 },
      ),
    })),
  );
}
