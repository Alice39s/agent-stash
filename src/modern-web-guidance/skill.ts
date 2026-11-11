import { fileURLToPath } from "node:url";
import * as v from "valibot";
import { stringify } from "yaml";

export const SKILL_NAME = "modern-web-guidance";
export const SKILL_DIR = fileURLToPath(new URL(`../../skills/${SKILL_NAME}/`, import.meta.url));
export const MANIFEST_FILE = "sources.json";
export const PACKAGE_NAME = "modern-web-guidance";
export const REPOSITORY = "GoogleChrome/modern-web-guidance";

const Text = v.pipe(v.string(), v.nonEmpty());
const Slug = v.pipe(v.string(), v.regex(/^[a-z0-9][a-z0-9-]*$/));

export const GuideRecordSchema = v.object({
  id: Slug,
  category: Slug,
  description: Text,
  tokenCount: v.pipe(v.number(), v.integer(), v.minValue(1)),
  /** web-features 名称，与上游 `featuresUsed` 一致。 */
  featuresUsed: v.array(Text),
  /** 上游 `originTrials` 里的特性 id；非空时使用前需要用户同意。 */
  originTrials: v.array(Text),
  /** 上游 `volatileFeatures` 里的特性 id；非空时使用前需要用户同意。 */
  volatileFeatures: v.array(Text),
});

export const ManifestSchema = v.object({
  package: v.literal(PACKAGE_NAME),
  version: Text,
  /** 上游 `skill-version.txt`。 */
  skillVersion: Text,
  published: v.pipe(v.string(), v.isoDate()),
  tarball: v.pipe(v.string(), v.url()),
  integrity: Text,
  guides: v.pipe(v.array(GuideRecordSchema), v.minLength(1)),
});

export type GuideRecord = v.InferOutput<typeof GuideRecordSchema>;
export type Manifest = v.InferOutput<typeof ManifestSchema>;

export const guideFile = (guide: Pick<GuideRecord, "id" | "category">): string =>
  `references/${guide.category}/${guide.id}.md`;

export const indexFile = (category: string): string => `references/${category}/index.md`;

/** 按上游顺序列出分类，每个分类下的指南保持上游顺序。 */
export function categories(manifest: Manifest): Map<string, GuideRecord[]> {
  const groups = new Map<string, GuideRecord[]>();
  for (const guide of manifest.guides) {
    groups.set(guide.category, [...(groups.get(guide.category) ?? []), guide]);
  }
  return groups;
}

function gate(guide: GuideRecord): string {
  return [
    guide.originTrials.length > 0 ? `Origin Trial (${guide.originTrials.join(", ")})` : "",
    guide.volatileFeatures.length > 0 ? `Volatile (${guide.volatileFeatures.join(", ")})` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const cell = (text: string): string => text.replaceAll("|", "\\|").replaceAll("\n", " ");

export function renderCategoryIndex(category: string, guides: GuideRecord[]): string {
  const rows = guides.map(
    (guide) =>
      `| [${guide.id}](${guide.id}.md) | ${cell(guide.description)} | ${guide.tokenCount} | ${gate(guide) || "-"} |`,
  );
  return [
    `# ${category}`,
    "",
    "| Guide | Description | Tokens | Gate |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

export function renderSkill(manifest: Manifest): string {
  const groups = categories(manifest);
  const frontmatter = stringify(
    {
      name: SKILL_NAME,
      description:
        `Offline copy of GoogleChrome/modern-web-guidance: ${manifest.guides.length} guides on modern HTML, CSS, ` +
        "and client-side JavaScript (dialogs, popovers, anchor positioning, container queries, view " +
        "transitions, scroll-driven animations, forms, autofill, validation, accessibility, dark mode, " +
        "Core Web Vitals, image loading, security, passkeys, sanitization, web components, built-in AI, " +
        "WebMCP). Use before writing or changing web UI, CSS layout or animation, or browser-side JS, " +
        "including HTML/CSS/DOM inside React, Vue, or other frameworks. Not for backend code, build " +
        "tooling, CI, or tests.",
      license: "CC-BY-4.0",
      metadata: {
        updated: manifest.published,
        sources: `${REPOSITORY}, npm ${PACKAGE_NAME}@${manifest.version}`,
        generator: "scripts/sync-modern-web-guidance.ts",
      },
    },
    { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN", lineWidth: 0 },
  );
  const rows = [...groups].map(([category, guides]) => {
    const discipline = guides.some((guide) => guide.id === category)
      ? `[${category}](${guideFile({ id: category, category })})`
      : "-";
    return `| ${category} | ${guides.length} | ${discipline} | [index](${indexFile(category)}) |`;
  });
  return [
    "---",
    frontmatter.trimEnd(),
    "---",
    "",
    "# Modern Web Guidance",
    "",
    `Guides from [${REPOSITORY}](https://github.com/${REPOSITORY}), copied from npm \`${PACKAGE_NAME}@${manifest.version}\` (skill version \`${manifest.skillVersion}\`, published ${manifest.published}). Each guide is \`references/<category>/<id>.md\`; each category's \`index.md\` lists its guides with a one-line description, a token count, and feature gates.`,
    "",
    "## Workflow",
    "",
    '1. Find guides. Open the index of each category that fits the task, or search all indexes at once: `rg -i "<keyword>" references/*/index.md`. Search by the user-visible capability or the UI primitive it implies (`confirm dialog`, `date picker`), not by framework or app names, and search once per feature when a task touches several.',
    '2. Read the matching guides in full, plus the discipline guide of the same category when the table below lists one. Guides cite other guides as `npx -y modern-web-guidance@latest retrieve "<id>"`; read `references/*/<id>.md` for those instead of running the command.',
    "3. Write the code with the guide's patterns and fallbacks, then check the result against the guide and the user's request before finishing.",
    "4. When no guide matches after a second search, continue without one.",
    "",
    "## Feature gates",
    "",
    'A guide with an Origin Trial or Volatile entry in the Gate column relies on an experimental Origin Trial API or on a feature that ships in one engine only or is still changing. Use such a guide only when the user agrees, or when `.mwgrc` in the project root (or `~/.mwgrc`) sets `"allowOriginTrials": true` or `"allowVolatileFeatures": true` respectively.',
    "",
    "## Browser support",
    "",
    "- Baseline Widely available features need no fallback. For any other feature, follow the fallback the guide gives.",
    "- When the user or the project states a support policy (for example `Safari 17.4+` or `Baseline 2024`), use the compatibility data in the guide to decide which fallbacks to keep. A feature meets a `Baseline YYYY` target when its Baseline year is YYYY or earlier.",
    "",
    "## Frameworks",
    "",
    "The guides use plain HTML, CSS, and JavaScript. Keep the platform feature when porting to a framework:",
    "",
    "- Pass new HTML attributes that the framework types do not know yet (`popover`, `commandfor`, `interestfor`) through a spread or cast instead of dropping them.",
    "- Guard `window` and DOM globals during server rendering, and load polyfills with a dynamic `import()` on the client.",
    "- Call `showModal()` and similar methods through refs, generate per-instance IDs and `anchor-name` values, and keep `:root` and `@starting-style` rules unscoped.",
    "",
    "## Categories",
    "",
    "| Category | Guides | Discipline guide | Index |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "## Source and license",
    "",
    `The guide text is from ${REPOSITORY} and is licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/); parts of it derive from MDN Web Docs and from W3C, WHATWG, and IETF specifications. \`sources.json\` records the package version, tarball, and the upstream index entry of every guide. \`scripts/sync-modern-web-guidance.ts\` in Alice39s/agent-stash copies the guides and writes this file and the category indexes.`,
    "",
  ].join("\n");
}
