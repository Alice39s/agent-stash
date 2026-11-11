import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { unpackTar } from "modern-tar";
import { dirname, join } from "pathe";
import * as v from "valibot";
import {
  MANIFEST_FILE,
  ManifestSchema,
  PACKAGE_NAME,
  SKILL_DIR,
  categories,
  guideFile,
  indexFile,
  renderCategoryIndex,
  renderSkill,
} from "../src/modern-web-guidance/skill.ts";

/** npm 包里技能目录的前缀。 */
const PACKAGE_SKILL = `package/skills/${PACKAGE_NAME}/`;

const Text = v.pipe(v.string(), v.nonEmpty());

const PackumentSchema = v.object({
  "dist-tags": v.object({ latest: Text }),
  time: v.record(v.string(), v.string()),
  versions: v.record(
    v.string(),
    v.object({ dist: v.object({ tarball: v.pipe(v.string(), v.url()), integrity: Text }) }),
  ),
});

/** 上游 `gen/guides.json` 的条目，CLI 用它做检索。 */
const UpstreamGuidesSchema = v.pipe(
  v.array(
    v.object({
      id: Text,
      description: Text,
      category: Text,
      featuresUsed: v.array(Text),
      tokenCount: v.number(),
      originTrials: v.optional(v.array(v.object({ id: Text }))),
      volatileFeatures: v.optional(v.array(v.object({ id: Text }))),
    }),
  ),
  v.minLength(1),
);

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed with ${response.status}`);
  return response;
}

const packument = v.parse(
  PackumentSchema,
  await (await fetchOk(`https://registry.npmjs.org/${PACKAGE_NAME}`)).json(),
);
const version = packument["dist-tags"].latest;
const release = packument.versions[version];
const published = packument.time[version];
if (release === undefined || published === undefined) {
  throw new Error(`${PACKAGE_NAME}@${version} is missing from the registry document`);
}

const tarball = new Uint8Array(await (await fetchOk(release.dist.tarball)).arrayBuffer());
const [algorithm, expected] = release.dist.integrity.split("-", 2);
const actual = createHash(algorithm ?? "")
  .update(tarball)
  .digest("base64");
if (actual !== expected) {
  throw new Error(`${release.dist.tarball} does not match integrity ${release.dist.integrity}`);
}

const files = new Map(
  (await unpackTar(gunzipSync(tarball))).map((entry) => [
    entry.header.name,
    entry.data ?? new Uint8Array(),
  ]),
);
function packageText(path: string): string {
  const data = files.get(PACKAGE_SKILL + path);
  if (data === undefined)
    throw new Error(`${PACKAGE_NAME}@${version} has no ${PACKAGE_SKILL}${path}`);
  return new TextDecoder().decode(data);
}

const upstreamGuides = v.parse(UpstreamGuidesSchema, JSON.parse(packageText("gen/guides.json")));
const manifest = v.parse(ManifestSchema, {
  package: PACKAGE_NAME,
  version,
  skillVersion: packageText("skill-version.txt").trim(),
  published: published.slice(0, 10),
  tarball: release.dist.tarball,
  integrity: release.dist.integrity,
  guides: upstreamGuides.map((guide) => ({
    id: guide.id,
    category: guide.category,
    description: guide.description,
    tokenCount: guide.tokenCount,
    featuresUsed: guide.featuresUsed,
    originTrials: (guide.originTrials ?? []).map((feature) => feature.id),
    volatileFeatures: (guide.volatileFeatures ?? []).map((feature) => feature.id),
  })),
});
const guideTexts = manifest.guides.map((guide) => ({
  file: guideFile(guide),
  text: packageText(`guides/${guide.category}/${guide.id}.md`),
}));

await rm(join(SKILL_DIR, "references"), { recursive: true, force: true });
const outputs = [
  ...guideTexts,
  ...[...categories(manifest)].map(([category, guides]) => ({
    file: indexFile(category),
    text: renderCategoryIndex(category, guides),
  })),
  { file: "SKILL.md", text: renderSkill(manifest) },
  { file: MANIFEST_FILE, text: `${JSON.stringify(manifest, null, 2)}\n` },
];
await Promise.all(
  outputs.map(async ({ file, text }) => {
    const target = join(SKILL_DIR, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  }),
);

console.log(
  `${PACKAGE_NAME}@${version} (skill version ${manifest.skillVersion}, published ${manifest.published})`,
);
for (const [category, guides] of categories(manifest)) {
  console.log(`${category}: ${guides.length} ${guides.length === 1 ? "guide" : "guides"}`);
}
