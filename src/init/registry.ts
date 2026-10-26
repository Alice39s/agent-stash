import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "pathe";
import * as v from "valibot";
import { MANIFEST_FILE, ManifestSchema, VENDOR_DIR } from "./manifest.ts";
import { parsePromptFile } from "./prompt.ts";

export const DEFAULT_PRESET = "codex";
/** 手动维护的预设，文件名即预设名。 */
export const MANUAL_DIR = fileURLToPath(new URL("../../prompts/init/", import.meta.url));
export const CONFIG_PATH = join("agent-stash", "init.json");

export interface InitPreset {
  name: string;
  /** 界面里显示的名称：vendor 预设取上游产品名，手动维护的预设取 frontmatter 的 `title`，自定义预设取预设名。 */
  title: string;
  description: string;
  file: string;
  /** 来自配置文件的自定义预设，包括覆盖了内置预设的同名条目。 */
  custom: boolean;
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

const ManualMatterSchema = v.object({
  title: v.pipe(v.string(), v.nonEmpty()),
  source: v.pipe(v.string(), v.nonEmpty()),
  version: v.pipe(v.string(), v.nonEmpty()),
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
    title: preset.title,
    description: `Use the \`${preset.title}\` prompt preset (${preset.repository}@${preset.commit.slice(0, 7)}, ${preset.license}).`,
    file: join(VENDOR_DIR, preset.prompt),
    custom: false,
  }));
}

async function loadManualPresets(): Promise<InitPreset[]> {
  const names = (await readdir(MANUAL_DIR))
    .filter((file) => file.endsWith(".md"))
    .map((file) => basename(file, ".md"))
    .toSorted();
  return Promise.all(
    names.map(async (name) => {
      const file = join(MANUAL_DIR, `${name}.md`);
      const { matter } = parsePromptFile(await readFile(file, "utf8"));
      const result = v.safeParse(ManualMatterSchema, matter);
      if (!result.success) {
        throw new Error(`Invalid frontmatter in ${file}:\n${v.summarize(result.issues)}`);
      }
      return {
        name,
        title: result.output.title,
        description: `Use the \`${result.output.source}\` prompt preset (${result.output.version}).`,
        file,
        custom: false,
      };
    }),
  );
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
      title: name,
      // 没写说明时以配置里写的模板路径作说明，补全菜单与 DSH 的预设列表都显示它。
      description: preset.description ?? preset.file,
      file: resolve(baseDir, preset.file),
      custom: true,
    })),
  };
}

/**
 * 按 vendor 预设、手动维护的预设与 `configFiles` 的顺序合并，后者覆盖前者。
 * 不存在的配置文件跳过。
 */
export async function loadInitRegistry(configFiles: readonly string[]): Promise<InitRegistry> {
  const [vendored, manual, ...layers] = await Promise.all([
    loadVendoredPresets(),
    loadManualPresets(),
    ...configFiles.map(loadConfigLayer),
  ]);

  const presets = new Map([...vendored, ...manual].map((preset) => [preset.name, preset]));
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

/** 预设名列表，默认预设排在最前，如 `codex (default), kimi-code, opencode`。 */
export function listPresetNames(registry: InitRegistry): string {
  const others = [...registry.presets.keys()].filter((name) => name !== registry.defaultPreset);
  return [`${registry.defaultPreset} (default)`, ...others].join(", ");
}
