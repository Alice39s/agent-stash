import { describe, expect, test } from "vitest";
import { Config, currentSettings } from "./config.ts";
import {
  BUILTIN_INSTRUCTIONS,
  BUILTIN_PRESETS,
  ORGANIZE_STEPS,
  presetInstructions,
} from "./presets.ts";
import { DEFAULT_SETTINGS, parseSettings } from "./settings-value.ts";

describe("enhance Config", () => {
  test("fills every field with the default settings", () => {
    expect(currentSettings(Config({}))).toEqual(DEFAULT_SETTINGS);
  });

  test("defaults to following the session, sending three turns, and no shortcut", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      provider: "",
      model: "",
      effort: "",
      timeout: 60,
      context: true,
      contextTurns: 3,
      shortcut: false,
    });
    expect(DEFAULT_SETTINGS.presets.map((preset) => preset.id)).toEqual([...BUILTIN_PRESETS]);
  });

  test("keeps profile overrides, including custom presets", () => {
    const presets = [
      {
        id: "custom-1",
        title: "Translate",
        description: "",
        prompt: "Translate.",
        icon: "globe-outline",
      },
    ];
    const config = Config({
      provider: "deepseek",
      model: "flash",
      effort: "high",
      timeout: 30,
      shortcut: true,
      presets,
    });
    expect(currentSettings(config)).toEqual({
      ...DEFAULT_SETTINGS,
      provider: "deepseek",
      model: "flash",
      effort: "high",
      timeout: 30,
      shortcut: true,
      presets,
    });
  });

  test.each([{ timeout: 2 }, { timeout: 601 }, { contextTurns: 0 }, { contextTurns: 11 }])(
    "rejects %o",
    async (value) => {
      const result = await Config["~standard"].validate(value);
      expect(result.issues?.length).toBeGreaterThan(0);
    },
  );

  test("marks every field volatile so the settings service exposes it", () => {
    const fields = Object.entries(Config.dict ?? {});
    expect(fields.map(([key]) => key)).toEqual(Object.keys(DEFAULT_SETTINGS));
    for (const [, field] of fields) expect(field.meta.volatile).toBe(true);
  });
});

describe("enhance settings in the browser", () => {
  test("reads the settings service value and falls back per field", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ timeout: "fast", context: false, contextTurns: 4 })).toEqual({
      ...DEFAULT_SETTINGS,
      context: false,
      contextTurns: 4,
    });
  });

  test("fills the optional fields of presets written in the profile", () => {
    expect(
      parseSettings({ presets: [{ id: "concise" }, { id: "steps", prompt: "List it." }] }).presets,
    ).toEqual([
      { id: "concise", title: "", description: "", prompt: "", icon: "" },
      { id: "steps", title: "", description: "", prompt: "List it.", icon: "" },
    ]);
    expect(currentSettings(Config({ presets: [{ id: "concise" }] })).presets).toEqual([
      { id: "concise", title: "", description: "", prompt: "", icon: "" },
    ]);
  });
});

describe("preset instructions", () => {
  test("uses the built-in instructions while a built-in preset has none of its own", () => {
    const polish = { id: "polish", title: "", description: "", prompt: "", icon: "" };
    expect(presetInstructions(polish)).toBe(BUILTIN_INSTRUCTIONS.polish);
    expect(presetInstructions({ ...polish, prompt: " Mine. " })).toBe("Mine.");
  });

  test("polishes after the structure steps and includes the writing references", () => {
    const { polish, structure } = BUILTIN_INSTRUCTIONS;
    expect(structure).toContain(ORGANIZE_STEPS);
    const organize = polish.indexOf(`<step name="structure">\n${ORGANIZE_STEPS}\n</step>`);
    expect(organize).toBeGreaterThan(-1);
    expect(polish.indexOf('<step name="expand">')).toBeGreaterThan(organize);
    for (const name of ["humanizer", "no-ai-slop", "no-negative-echo"]) {
      expect(polish).toContain(`<include ref="${name}" />`);
    }
  });

  test("has no instructions for a custom preset left empty", () => {
    expect(
      presetInstructions({ id: "custom-1", title: "X", description: "", prompt: "", icon: "" }),
    ).toBeUndefined();
  });
});
