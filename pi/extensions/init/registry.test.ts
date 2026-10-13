import { fileURLToPath } from "node:url";
import { join } from "pathe";
import { describe, expect, test } from "vitest";
import { VENDOR_DIR } from "./manifest.ts";
import { DEFAULT_PRESET, loadInitRegistry } from "./registry.ts";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`fixtures/${name}`, import.meta.url));
const AGENT_DIR_WITHOUT_CONFIG = fixture("no-config");

describe("loadInitRegistry", () => {
  test("exposes the vendored presets with codex as the default", async () => {
    const registry = await loadInitRegistry({
      agentDir: AGENT_DIR_WITHOUT_CONFIG,
      projectDir: undefined,
    });
    expect(registry.defaultPreset).toBe(DEFAULT_PRESET);
    expect([...registry.presets.keys()]).toEqual(["codex", "kimi", "opencode"]);
    expect(registry.presets.get("codex")?.file).toBe(join(VENDOR_DIR, "codex/prompt.md"));
    expect(registry.presets.get("kimi")?.description).toMatch(
      /^Kimi Code · MoonshotAI\/kimi-code@[0-9a-f]{7} · MIT$/,
    );
  });

  test("adds personal presets and default", async () => {
    const registry = await loadInitRegistry({ agentDir: fixture("agent"), projectDir: undefined });
    expect(registry.defaultPreset).toBe("kimi");
    expect(registry.presets.get("team")).toEqual({
      name: "team",
      description: "Team AGENTS.md preset",
      file: join(fixture("agent"), "agent-stash/team.md"),
    });
  });

  test("lets the trusted project config override personal and vendored presets", async () => {
    const registry = await loadInitRegistry({
      agentDir: fixture("agent"),
      projectDir: fixture("project"),
    });
    expect(registry.defaultPreset).toBe("team");
    expect(registry.presets.get("codex")).toEqual({
      name: "codex",
      description: "Custom · ./codex-local.md",
      file: join(fixture("project"), ".pi/agent-stash/codex-local.md"),
    });
  });

  test("rejects an unknown default preset", async () => {
    await expect(
      loadInitRegistry({ agentDir: fixture("unknown-default"), projectDir: undefined }),
    ).rejects.toThrow('/init default preset "missing" is not defined');
  });

  test("reports the config file of an invalid preset", async () => {
    await expect(
      loadInitRegistry({ agentDir: fixture("invalid"), projectDir: undefined }),
    ).rejects.toThrow(join(fixture("invalid"), "agent-stash/init.json"));
  });
});
