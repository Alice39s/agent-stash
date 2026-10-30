import { describe, expect, test } from "vitest";
import { PICKER_COLUMNS } from "./icon-picker.tsx";
import {
  defaultIcon,
  isPresetIcon,
  PRESET_ICON_NAMES,
  presetIcon,
  storedIcon,
} from "./preset-icons.ts";
import { DEFAULT_PRESETS } from "./presets.ts";

const preset = (id: string, icon = "") => ({ id, title: "", description: "", prompt: "", icon });

describe("preset icons", () => {
  test("offers distinct icons that fill whole rows of the picker", () => {
    expect(new Set(PRESET_ICON_NAMES).size).toBe(PRESET_ICON_NAMES.length);
    expect(PRESET_ICON_NAMES.length % PICKER_COLUMNS).toBe(0);
  });

  test("gives each built-in preset its own icon and custom presets a shared one", () => {
    expect(DEFAULT_PRESETS.map(presetIcon)).toEqual([
      "sparkle",
      "flat-list-outline",
      "compact-outline",
    ]);
    expect(defaultIcon("custom-1")).toBe("list-pen-outline");
    for (const id of ["polish", "structure", "concise", "custom-1"]) {
      expect(isPresetIcon(defaultIcon(id))).toBe(true);
    }
  });

  test("shows a chosen icon and falls back when the name is not offered", () => {
    expect(presetIcon(preset("polish", "globe-outline"))).toBe("globe-outline");
    expect(presetIcon(preset("polish", "rocket"))).toBe("sparkle");
  });

  test("stores the default icon as empty", () => {
    expect(storedIcon("structure", "flat-list-outline")).toBe("");
    expect(storedIcon("structure", "code-outline")).toBe("code-outline");
    expect(storedIcon("custom-1", "list-pen-outline")).toBe("");
  });
});
