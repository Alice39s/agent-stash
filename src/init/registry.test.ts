import { fileURLToPath } from "node:url";
import { join } from "pathe";
import { describe, expect, test } from "vitest";
import { VENDOR_DIR } from "./manifest.ts";
import { CONFIG_PATH, DEFAULT_PRESET, loadInitRegistry } from "./registry.ts";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`fixtures/${name}`, import.meta.url));
const configFile = (name: string): string => join(fixture(name), CONFIG_PATH);

describe("loadInitRegistry", () => {
  test("exposes the vendored presets with codex as the default", async () => {
    const registry = await loadInitRegistry([configFile("no-config")]);
    expect(registry.defaultPreset).toBe(DEFAULT_PRESET);
    expect([...registry.presets.keys()]).toEqual(["codex", "kimi-code", "opencode"]);
    expect(registry.presets.get("codex")?.file).toBe(join(VENDOR_DIR, "codex/prompt.md"));
    expect(registry.presets.get("kimi-code")?.description).toMatch(
      /^Use the `Kimi Code CLI` prompt preset \(MoonshotAI\/kimi-code@[0-9a-f]{7}, MIT\)\.$/,
    );
  });

  test("adds personal presets and default", async () => {
    const registry = await loadInitRegistry([configFile("agent")]);
    expect(registry.defaultPreset).toBe("kimi-code");
    expect(registry.presets.get("team")).toEqual({
      name: "team",
      description: "Team AGENTS.md preset",
      file: join(fixture("agent"), "agent-stash/team.md"),
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
      description: "Use the custom prompt preset `./codex-local.md`.",
      file: join(fixture("project"), ".pi/agent-stash/codex-local.md"),
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
