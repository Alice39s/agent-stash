import { fileURLToPath } from "node:url";
import * as v from "valibot";

export const VENDOR_DIR = fileURLToPath(new URL("../../vendor/init-prompts/", import.meta.url));
export const MANIFEST_FILE = "manifest.json";

export const VendoredPresetSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  title: v.pipe(v.string(), v.nonEmpty()),
  repository: v.pipe(v.string(), v.nonEmpty()),
  commit: v.pipe(v.string(), v.length(40)),
  path: v.pipe(v.string(), v.nonEmpty()),
  license: v.pipe(v.string(), v.nonEmpty()),
  prompt: v.pipe(v.string(), v.nonEmpty()),
  notices: v.pipe(v.array(v.string()), v.minLength(1)),
});

export const ManifestSchema = v.object({
  presets: v.pipe(v.array(VendoredPresetSchema), v.minLength(1)),
});

export type VendoredPreset = v.InferOutput<typeof VendoredPresetSchema>;
export type Manifest = v.InferOutput<typeof ManifestSchema>;
