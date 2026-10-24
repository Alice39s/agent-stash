import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  apply,
  dshConfigFile,
  type DshAgent,
  type DshCommandDefinition,
  type DshContext,
  type DshSession,
  type DshUserMessage,
} from "./index.ts";

/** `DSH_HOME`，其中的 `agent-stash/init.json` 把默认预设设为 kimi-code，并加上 team 预设。 */
const DSH_HOME = fileURLToPath(new URL("../../src/init/fixtures/agent", import.meta.url));
const SESSION_DIR = "/work/original";
const CURRENT_DIR = "/work/current";

interface Harness {
  command: DshCommandDefinition;
  sent: DshUserMessage[];
  agent: DshAgent;
  disposed: () => boolean;
}

async function mount(workingDirectory: string | undefined): Promise<Harness> {
  let registered: DshCommandDefinition | undefined;
  let effect: Promise<() => void> | undefined;
  let disposed = false;
  const ctx: DshContext = {
    commands: {
      register(definition) {
        registered = definition;
        return () => {
          disposed = true;
        };
      },
    },
    effect(execute) {
      effect = execute();
    },
    get: () => (workingDirectory ? { get: () => workingDirectory } : undefined),
  };
  apply(ctx);
  if (!effect) {
    throw new Error("/init was not registered inside an effect");
  }
  const dispose = await effect;
  if (!registered) {
    throw new Error("/init was not registered");
  }
  const sent: DshUserMessage[] = [];
  const session: DshSession = { header: { cwd: SESSION_DIR } };
  return {
    command: registered,
    sent,
    agent: { session, followup: (message) => sent.push(message) },
    disposed: () => {
      dispose();
      return disposed;
    },
  };
}

beforeEach(() => {
  vi.stubEnv("DSH_HOME", DSH_HOME);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("reads the config from $DSH_HOME and falls back to ~/.dsh", () => {
  expect(dshConfigFile()).toBe(join(DSH_HOME, "agent-stash/init.json"));
  expect(dshConfigFile({})).toMatch(/\/\.dsh\/agent-stash\/init\.json$/);
});

test("/init lists the presets in its description and input hint", async () => {
  const { command } = await mount(undefined);
  expect(command).toMatchObject({
    name: "init",
    description:
      "Write AGENTS.md with an /init prompt preset. Presets: kimi-code (default), codex, opencode, crush, copilot, qwen-code, kilo-code, claude-code, claude-code-init-new, team",
    input: {
      hint: "[codex|kimi-code|opencode|crush|copilot|qwen-code|kilo-code|claude-code|claude-code-init-new|team] [extra prompt]",
    },
  });
});

test("/init queues the selected preset as a follow-up user message", async () => {
  const { command, sent, agent } = await mount(undefined);
  const template = await readFile(
    fileURLToPath(new URL("../../vendor/init-prompts/codex/prompt.md", import.meta.url)),
    "utf8",
  );
  const result = await command.handler({ agent, rawInput: " codex Mention pnpm." });

  expect(result).toEqual({
    kind: "success",
    text: expect.stringMatching(
      /^\/init codex: Use the `Codex CLI` prompt preset \(openai\/codex@[0-9a-f]{7}, Apache-2\.0\)\.\nPresets: kimi-code \(default\), codex, opencode, crush, copilot, qwen-code, kilo-code, claude-code, claude-code-init-new, team$/,
    ),
  });
  expect(sent).toHaveLength(1);
  expect(sent[0]).toEqual({
    id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    role: "user",
    content: [
      {
        type: "text",
        text: `${template.trimEnd()}\n\n## Additional instructions from the user\n\nMention pnpm.\n`,
      },
    ],
    source: { kind: "user" },
  });
  expect(Object.isFrozen(sent[0]?.content[0])).toBe(true);
});

test("/init uses the $DSH_HOME default preset", async () => {
  const { command, sent, agent } = await mount(undefined);
  const template = await readFile(
    fileURLToPath(new URL("../../vendor/init-prompts/kimi-code/prompt.md", import.meta.url)),
    "utf8",
  );
  const result = await command.handler({ agent, rawInput: "" });
  expect(result).toMatchObject({ text: expect.stringMatching(/^\/init kimi-code: /) });
  expect(sent[0]?.content[0]?.text).toBe(template);
});

test("/init fills ${path} with the current working directory", async () => {
  const current = await mount(CURRENT_DIR);
  await current.command.handler({ agent: current.agent, rawInput: " team release flow" });
  expect(current.sent[0]?.content[0]?.text).toBe(
    `Write the team AGENTS.md for ${CURRENT_DIR}.\n\nFocus: release flow\n`,
  );

  const original = await mount(undefined);
  await original.command.handler({ agent: original.agent, rawInput: "team" });
  expect(original.sent[0]?.content[0]?.text).toBe(
    `Write the team AGENTS.md for ${SESSION_DIR}.\n\nFocus: \n`,
  );
});

test("/init fails without a working directory", async () => {
  const { command } = await mount(undefined);
  const agent: DshAgent = { session: { header: {} }, followup: () => {} };
  await expect(command.handler({ agent, rawInput: "" })).rejects.toThrow(
    "/init needs a session working directory",
  );
});

test("unloading the plugin removes the command", async () => {
  expect((await mount(undefined)).disposed()).toBe(true);
});
