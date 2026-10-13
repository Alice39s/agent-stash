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

/** `DSH_HOME`，其中的 `agent-stash/init.json` 把默认预设设为 kimi-code。 */
const DSH_HOME = fileURLToPath(new URL("../../src/init/fixtures/agent", import.meta.url));
const SESSION_DIR = "/work/original";
const CURRENT_DIR = "/work/current";

interface Harness {
  command: DshCommandDefinition;
  sent: DshUserMessage[];
  agent: DshAgent;
  disposed: () => boolean;
}

function mount(workingDirectory: string | undefined): Harness {
  let registered: DshCommandDefinition | undefined;
  let disposer: (() => void) | undefined;
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
      disposer = execute();
    },
    get: () => (workingDirectory ? { get: () => workingDirectory } : undefined),
  };
  apply(ctx);
  if (!registered || !disposer) {
    throw new Error("/init was not registered inside an effect");
  }
  const dispose = disposer;
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

test("/init queues the selected preset as a follow-up user message", async () => {
  const { command, sent, agent } = mount(undefined);
  expect(command).toMatchObject({ name: "init", input: { hint: "[preset] [extra prompt]" } });

  const template = await readFile(
    fileURLToPath(new URL("../../vendor/init-prompts/codex/prompt.md", import.meta.url)),
    "utf8",
  );
  const result = await command.handler({ agent, rawInput: " codex Mention pnpm." });

  expect(result).toEqual({
    kind: "success",
    text: expect.stringMatching(
      /^\/init codex · Codex · openai\/codex@[0-9a-f]{7} · Apache-2\.0\n/,
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
  const { command, sent, agent } = mount(undefined);
  const template = await readFile(
    fileURLToPath(new URL("../../vendor/init-prompts/kimi-code/prompt.md", import.meta.url)),
    "utf8",
  );
  const result = await command.handler({ agent, rawInput: "" });
  expect(result).toMatchObject({ text: expect.stringMatching(/^\/init kimi-code \u00b7 /) });
  expect(sent[0]?.content[0]?.text).toBe(template);
});

test("/init fills ${path} with the current working directory", async () => {
  const current = mount(CURRENT_DIR);
  await current.command.handler({ agent: current.agent, rawInput: " team release flow" });
  expect(current.sent[0]?.content[0]?.text).toBe(
    `Write the team AGENTS.md for ${CURRENT_DIR}.\n\nFocus: release flow\n`,
  );

  const original = mount(undefined);
  await original.command.handler({ agent: original.agent, rawInput: "team" });
  expect(original.sent[0]?.content[0]?.text).toBe(
    `Write the team AGENTS.md for ${SESSION_DIR}.\n\nFocus: \n`,
  );
});

test("/init fails without a working directory", async () => {
  const { command } = mount(undefined);
  const agent: DshAgent = { session: { header: {} }, followup: () => {} };
  await expect(command.handler({ agent, rawInput: "" })).rejects.toThrow(
    "/init needs a session working directory",
  );
});

test("unloading the plugin removes the command", () => {
  expect(mount(undefined).disposed()).toBe(true);
});
