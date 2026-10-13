import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "pathe";
import * as v from "valibot";
import { MANIFEST_FILE, ManifestSchema, VENDOR_DIR } from "./manifest.ts";

export const DEFAULT_PRESET = "codex";
export const CONFIG_PATH = join("agent-stash", "init.json");

export interface InitPreset {
  name: string;
  description: string;
  file: string;
}

export interface InitRegistry {
  defaultPreset: string;
  presets: ReadonlyMap<string, InitPreset>;
}

const ConfigSchema = v.strictObject({
  defaultPreset: v.optional(v.pipe(v.string(), v.nonEmpty())),
  presets: v.optional(
    v.record(
      v.pipe(v.string(), v.regex(/^\S+$/, "Preset names cannot contain whitespace")),
      v.strictObject({
        file: v.pipe(v.string(), v.nonEmpty()),
        description: v.optional(v.string()),
      }),
    ),
  ),
});

interface ConfigLayer {
  defaultPreset: string | undefined;
  presets: InitPreset[];
}

async function readJsonFile<TSchema extends v.GenericSchema>(
  file: string,
  schema: TSchema,
): Promise<v.InferOutput<TSchema>> {
  const text = await readFile(file, "utf8");
  const result = v.safeParse(v.pipe(v.string(), v.parseJson(), schema), text);
  if (!result.success) {
    throw new Error(`Invalid ${file}:\n${v.summarize(result.issues)}`);
  }
  return result.output;
}

async function loadVendoredPresets(): Promise<InitPreset[]> {
  const manifest = await readJsonFile(join(VENDOR_DIR, MANIFEST_FILE), ManifestSchema);
  return manifest.presets.map((preset) => ({
    name: preset.name,
    description: `${preset.title} · ${preset.repository}@${preset.commit.slice(0, 7)} · ${preset.license}`,
    file: join(VENDOR_DIR, preset.prompt),
  }));
}

async function loadConfigLayer(configFile: string): Promise<ConfigLayer | undefined> {
  if (!existsSync(configFile)) {
    return undefined;
  }
  const config = await readJsonFile(configFile, ConfigSchema);
  const baseDir = dirname(configFile);
  return {
    defaultPreset: config.defaultPreset,
    presets: Object.entries(config.presets ?? {}).map(([name, preset]) => ({
      name,
      description: preset.description ?? `Custom · ${preset.file}`,
      file: resolve(baseDir, preset.file),
    })),
  };
}

/**
 * 按 vendor 预设与 `configFiles` 的顺序合并，后者覆盖前者。
 * 不存在的配置文件跳过。
 */
export async function loadInitRegistry(configFiles: readonly string[]): Promise<InitRegistry> {
  const [vendored, ...layers] = await Promise.all([
    loadVendoredPresets(),
    ...configFiles.map(loadConfigLayer),
  ]);

  const presets = new Map(vendored.map((preset) => [preset.name, preset]));
  let defaultPreset = DEFAULT_PRESET;
  for (const layer of layers) {
    if (!layer) {
      continue;
    }
    for (const preset of layer.presets) {
      presets.set(preset.name, preset);
    }
    defaultPreset = layer.defaultPreset ?? defaultPreset;
  }

  if (!presets.has(defaultPreset)) {
    throw new Error(
      `/init default preset "${defaultPreset}" is not defined. Known presets: ${[...presets.keys()].join(", ")}`,
    );
  }
  return { defaultPreset, presets };
}
