import { describe, expect, test } from "vitest";
import { DEFAULT_APPEARANCE } from "./appearance.ts";
import { Config, currentAppearance } from "./config.ts";

describe("stash kit Config", () => {
  test("fills every field with the default appearance", () => {
    expect(currentAppearance(Config({}))).toEqual(DEFAULT_APPEARANCE);
  });

  test("keeps profile overrides", () => {
    const config = Config({ glass: false, motion: "off", density: "compact" });
    expect(currentAppearance(config)).toEqual({
      ...DEFAULT_APPEARANCE,
      glass: false,
      motion: "off",
      density: "compact",
    });
  });

  test("rejects a choice outside the listed options", async () => {
    const result = await Config["~standard"].validate({ motion: "wild" });
    expect(result.issues?.length).toBeGreaterThan(0);
  });

  test("marks every field volatile so the settings service exposes it", () => {
    const fields = Object.entries(Config.dict ?? {});
    expect(fields.map(([key]) => key)).toEqual(Object.keys(DEFAULT_APPEARANCE));
    for (const [, field] of fields) expect(field.meta.volatile).toBe(true);
  });
});
