import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  type AgentSession,
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`../../../src/init/fixtures/${name}`, import.meta.url));
const EXTENSION = fileURLToPath(new URL("index.ts", import.meta.url));
/** 扩展通过 `PI_CODING_AGENT_DIR` 从这里读取 init 配置。 */
const AGENT_DIR = fixture("agent");
/** SDK 会话在这里写入 auth 与模型缓存文件。 */
const SESSION_AGENT_DIR = fileURLToPath(new URL("../../../.test-output/pi-agent", import.meta.url));
const PROJECT_DIR = fixture("project");

interface InitSession {
  session: AgentSession;
  /** 扩展发出的用户消息，在发送给模型之前截获。 */
  sent: string[];
}

const sessions: AgentSession[] = [];

beforeEach(() => {
  vi.stubEnv("PI_CODING_AGENT_DIR", AGENT_DIR);
});

afterEach(() => {
  for (const session of sessions.splice(0)) {
    session.dispose();
  }
  vi.unstubAllEnvs();
});

async function startSession(projectTrusted: boolean): Promise<InitSession> {
  const sent: string[] = [];
  const settingsManager = SettingsManager.inMemory({}, { projectTrusted });
  const resourceLoader = new DefaultResourceLoader({
    cwd: PROJECT_DIR,
    agentDir: SESSION_AGENT_DIR,
    settingsManager,
    additionalExtensionPaths: [EXTENSION],
    extensionFactories: [
      (pi) => {
        pi.on("input", (event) => {
          if (event.source !== "extension") {
            return { action: "continue" };
          }
          sent.push(event.text);
          return { action: "handled" };
        });
      },
    ],
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();
  const { session } = await createAgentSession({
    cwd: PROJECT_DIR,
    agentDir: SESSION_AGENT_DIR,
    resourceLoader,
    settingsManager,
    sessionManager: SessionManager.inMemory(PROJECT_DIR),
  });
  sessions.push(session);
  await session.bindExtensions({
    onError: (error) => {
      throw new Error(`Extension error in ${error.extensionPath}: ${error.error}`);
    },
  });
  return { session, sent };
}

async function runInit(input: string, projectTrusted: boolean): Promise<string> {
  const { session, sent } = await startSession(projectTrusted);
  await session.prompt(input);
  await vi.waitFor(() => expect(sent).toHaveLength(1));
  return sent[0] ?? "";
}

test("/init sends a vendored preset with the extra prompt", async () => {
  const template = await readFile(
    fileURLToPath(new URL("../../../vendor/init-prompts/codex/prompt.md", import.meta.url)),
    "utf8",
  );
  const prompt = await runInit("/init codex Mention the pnpm workspace.", false);
  expect(prompt).toBe(
    `${template.trimEnd()}\n\n## Additional instructions from the user\n\nMention the pnpm workspace.\n`,
  );
});

test("/init uses the personal default preset outside a trusted project", async () => {
  const prompt = await runInit("/init Keep it short.", false);
  expect(prompt).toContain("Please explore the current project directory");
  expect(prompt).toMatch(/## Additional instructions from the user\n\nKeep it short\.\n$/);
});

test("/init uses the trusted project default preset and fills its placeholders", async () => {
  const prompt = await runInit("/init release flow", true);
  expect(prompt).toBe(`Write the team AGENTS.md for ${PROJECT_DIR}.\n\nFocus: release flow\n`);
});

test("/init completes preset names and marks the default", async () => {
  const { session } = await startSession(false);
  const command = session.extensionRunner.getCommand("init");
  expect(await command?.getArgumentCompletions?.("")).toEqual([
    expect.objectContaining({ value: "codex" }),
    expect.objectContaining({
      value: "kimi-code",
      description: expect.stringMatching(/^default · /),
    }),
    expect.objectContaining({ value: "opencode" }),
    { value: "team", label: "team", description: "Team AGENTS.md preset" },
  ]);
  expect(await command?.getArgumentCompletions?.("o")).toEqual([
    expect.objectContaining({ value: "opencode" }),
  ]);
  expect(await command?.getArgumentCompletions?.("kimi-code ")).toBeNull();
});
