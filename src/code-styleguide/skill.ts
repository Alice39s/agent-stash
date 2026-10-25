import { fileURLToPath } from "node:url";
import * as v from "valibot";
import { stringify } from "yaml";

export const SKILL_NAME = "code-styleguide";
export const SKILL_DIR = fileURLToPath(new URL(`../../skills/${SKILL_NAME}/`, import.meta.url));
export const MANIFEST_FILE = "sources.json";

const Text = v.pipe(v.string(), v.nonEmpty());

export const ReferenceRecordSchema = v.object({
  /** Path relative to the skill directory. */
  file: v.pipe(v.string(), v.regex(/^references\/[\w./-]+\.md$/)),
  topic: Text,
  title: Text,
  url: v.pipe(v.string(), v.url()),
  /** GitHub `owner/repo`, or the host for pages outside Git. */
  repository: Text,
  /** Fetched path inside the repository or on the host. */
  path: Text,
  /** Commit SHA, or `sha256:<hex>` of the fetched page. */
  revision: Text,
  updated: v.pipe(v.string(), v.isoDate()),
  license: Text,
  indexEnd: v.pipe(v.number(), v.integer(), v.minValue(1)),
  lines: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const ManifestSchema = v.object({
  references: v.pipe(v.array(ReferenceRecordSchema), v.minLength(1)),
});

export type ReferenceRecord = v.InferOutput<typeof ReferenceRecordSchema>;
export type Manifest = v.InferOutput<typeof ManifestSchema>;

const unique = (values: string[]): string[] => [...new Set(values)];

export function shortRevision(revision: string): string {
  return revision.startsWith("sha256:") ? revision.slice(0, 19) : revision.slice(0, 12);
}

export function sourceLine(record: Omit<ReferenceRecord, "indexEnd" | "lines">): string {
  const revision = `${record.repository}@${shortRevision(record.revision)}`;
  return `Source: <${record.url}> · ${revision} (${record.updated}) · ${record.license}`;
}

export function renderSkill(manifest: Manifest): string {
  const { references } = manifest;
  const topics = unique(references.map((record) => record.topic)).join(", ");
  const frontmatter = stringify(
    {
      name: SKILL_NAME,
      description:
        `Google, Angular, and Android Kotlin style guides synced from upstream, covering ${topics}. ` +
        "Use when writing, reviewing, refactoring, or formatting code that should follow one of " +
        "these guides, or when the user asks about naming, formatting, comments, imports, or " +
        "language-feature rules in these languages.",
      license: unique(references.map((record) => record.license)).join(", "),
      metadata: {
        updated: references
          .map((record) => record.updated)
          .toSorted()
          .at(-1),
        sources: unique(references.map((record) => record.repository)).join(", "),
        generator: "scripts/sync-code-styleguide.ts",
      },
    },
    { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN", lineWidth: 0 },
  );
  const rows = references.map(
    (record) =>
      `| ${record.topic} | [${record.title}](${record.file}) | 1-${record.indexEnd} | ${record.lines} |`,
  );
  return [
    "---",
    frontmatter.trimEnd(),
    "---",
    "",
    "# Code style guides",
    "",
    "Each reference is one upstream guide converted to Markdown. Load only what the task needs:",
    "",
    "1. Pick the reference for the language or framework below.",
    "2. Read its index (the line range in the Index column). Each entry gives the line where a section starts.",
    "3. Read only the sections you need, starting at those lines.",
    "",
    "Code fences tagged `good` show recommended code; fences tagged `bad` show code to avoid.",
    "The project's own configuration, formatter, and surrounding code take precedence over these guides.",
    "",
    "| Topic | Reference | Index | Lines |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}
