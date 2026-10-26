import { fileURLToPath } from "node:url";
import { join } from "pathe";
import { describe, expect, test } from "vitest";
import { VENDOR_DIR } from "./manifest.ts";
import { CONFIG_PATH, DEFAULT_PRESET, MANUAL_DIR, loadInitRegistry } from "./registry.ts";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`fixtures/${name}`, import.meta.url));
const configFile = (name: string): string => join(fixture(name), CONFIG_PATH);

describe("loadInitRegistry", () => {
  test("exposes the vendored presets with codex as the default", async () => {
    const registry = await loadInitRegistry([configFile("no-config")]);
    expect(registry.defaultPreset).toBe(DEFAULT_PRESET);
    expect([...registry.presets.keys()]).toEqual([
      "codex",
      "kimi-code",
      "opencode",
      "crush",
      "copilot",
      "qwen-code",
      "kilo-code",
      "claude-code",
      "claude-code-init-new",
    ]);
    expect(registry.presets.get("codex")?.file).toBe(join(VENDOR_DIR, "codex/prompt.md"));
    expect(registry.presets.get("kimi-code")).toMatchObject({
      title: "Kimi Code CLI",
      description: expect.stringMatching(
        /^Use the `Kimi Code CLI` prompt preset \(MoonshotAI\/kimi-code@[0-9a-f]{7}, MIT\)\.$/,
      ),
      custom: false,
    });
  });

  test("describes manual presets from their frontmatter", async () => {
    const registry = await loadInitRegistry([configFile("no-config")]);
    expect(registry.presets.get("claude-code")).toEqual({
      name: "claude-code",
      title: "Claude Code (classic)",
      description:
        "Use the `Claude Code builtin slash command /init (classic prompt variant)` prompt preset (v2.1.306).",
      file: join(MANUAL_DIR, "claude-code.md"),
      custom: false,
    });
    expect(registry.presets.get("claude-code-init-new")?.title).toBe("Claude Code (multi-phase)");
  });

  test("adds personal presets and default", async () => {
    const registry = await loadInitRegistry([configFile("agent")]);
    expect(registry.defaultPreset).toBe("kimi-code");
    expect(registry.presets.get("team")).toEqual({
      name: "team",
      title: "team",
      description: "Team AGENTS.md preset",
      file: join(fixture("agent"), "agent-stash/team.md"),
      custom: true,
    });
  });

  test("lets later config files override earlier and vendored presets", async () => {
    const registry = await loadInitRegistry([
      configFile("agent"),
      join(fixture("project"), ".pi", CONFIG_PATH),
    ]);
    expect(registry.defaultPreset).toBe("team");
    expect(registry.presets.get("codex")).toEqual({
      name: "codex",
      title: "codex",
      description: "./codex-local.md",
      file: join(fixture("project"), ".pi/agent-stash/codex-local.md"),
      custom: true,
    });
  });

  test("rejects an unknown default preset", async () => {
    await expect(loadInitRegistry([configFile("unknown-default")])).rejects.toThrow(
      '/init default preset "missing" is not defined',
    );
  });

  test("reports the config file of an invalid preset", async () => {
    await expect(loadInitRegistry([configFile("invalid")])).rejects.toThrow(configFile("invalid"));
  });
});
