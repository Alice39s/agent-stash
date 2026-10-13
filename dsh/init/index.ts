import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "pathe";
import { parseInitArgs, renderInitPrompt } from "../../src/init/prompt.ts";
import {
  CONFIG_PATH,
  listPresetNames,
  loadInitRegistry,
  type InitRegistry,
} from "../../src/init/registry.ts";

/** DSH 会话里本插件用到的部分。 */
export interface DshSession {
  readonly header: { readonly cwd?: string };
}

export interface DshUserMessage {
  readonly id: string;
  readonly role: "user";
  readonly content: readonly { readonly type: "text"; readonly text: string }[];
  readonly source: { readonly kind: "user" };
}

export interface DshAgent {
  readonly session: DshSession;
  followup(message: DshUserMessage): void;
}

export type DshCommandResult =
  | { readonly kind: "success"; readonly text?: string }
  | { readonly kind: "error"; readonly text: string };

export interface DshCommandDefinition {
  readonly name: string;
  readonly description: string;
  readonly input?: { readonly hint: string };
  readonly handler: (invocation: {
    readonly agent: DshAgent;
    readonly rawInput: string;
  }) => Promise<DshCommandResult>;
}

export interface DshContext {
  readonly commands: { register(definition: DshCommandDefinition): () => void };
  effect(execute: () => Promise<() => void>, label?: string): void;
  get(name: "workingDirectory"): { get(session: DshSession): string } | undefined;
}

export const name = "agent-stash-init";
export const inject = ["commands"];

/** `$DSH_HOME`（默认 `~/.dsh`）下的 `agent-stash/init.json`。 */
export function dshConfigFile(env: NodeJS.ProcessEnv = process.env): string {
  return join(env["DSH_HOME"] ?? join(homedir(), ".dsh"), CONFIG_PATH);
}

/** 输入提示，如 `[codex|kimi-code|opencode] [extra prompt]`。 */
export function inputHint(registry: InitRegistry): string {
  return `[${[...registry.presets.keys()].join("|")}] [extra prompt]`;
}

/** 会话当前目录：优先 working-directory 服务，旧版 DSH 退回会话创建时的 cwd。 */
function sessionDirectory(ctx: DshContext, session: DshSession): string {
  const directory = ctx.get("workingDirectory")?.get(session) ?? session.header.cwd;
  if (!directory) {
    throw new Error("/init needs a session working directory");
  }
  return directory;
}

function userMessage(text: string): DshUserMessage {
  return Object.freeze({
    id: randomUUID(),
    role: "user",
    content: Object.freeze([Object.freeze({ type: "text", text })]),
    source: Object.freeze({ kind: "user" }),
  });
}

export function apply(ctx: DshContext): void {
  ctx.effect(async () => {
    // 提示里的预设列表在插件加载时生成，执行命令时重新读取配置。
    const registry = await loadInitRegistry([dshConfigFile()]);
    return ctx.commands.register({
      name: "init",
      description: `Write AGENTS.md with an /init prompt preset. Presets: ${listPresetNames(registry)}`,
      input: { hint: inputHint(registry) },
      handler: async ({ agent, rawInput }) => {
        const current = await loadInitRegistry([dshConfigFile()]);
        const { preset, extra } = parseInitArgs(rawInput, current);
        const template = await readFile(preset.file, "utf8");
        const prompt = renderInitPrompt(template, extra, sessionDirectory(ctx, agent.session));
        agent.followup(userMessage(prompt));
        return {
          kind: "success",
          text: `/init ${preset.name}: ${preset.description}\nPresets: ${listPresetNames(current)}`,
        };
      },
    });
  }, "agent-stash /init command");
}
