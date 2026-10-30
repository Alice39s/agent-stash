import { readFile, stat } from "node:fs/promises";
import { join } from "pathe";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { MANIFEST_FILE, ReferenceManifestSchema, VENDOR_DIR } from "./vendor-manifest.ts";

const manifest = v.parse(
  ReferenceManifestSchema,
  JSON.parse(await readFile(join(VENDOR_DIR, MANIFEST_FILE), "utf8")),
);

describe("vendored writing references", () => {
  test.each(manifest.references)(
    "$name lists files that exist and are not empty",
    async (entry) => {
      const files = [entry.file, ...entry.notices];
      const sizes = await Promise.all(
        files.map(async (file) => (await stat(join(VENDOR_DIR, entry.name, file))).size),
      );
      expect(files.filter((_, index) => sizes[index] === 0)).toEqual([]);
    },
  );
});
