import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
import MurmurHash3 from "murmurhash3js-revisited";
import { dirname, join } from "pathe";
import * as v from "valibot";
import {
  MANIFEST_FILE,
  ReferenceManifestSchema,
  VENDOR_DIR,
  type ReferenceManifest,
  type VendoredReference,
} from "../dsh/enhance/src/vendor-manifest.ts";

interface UpstreamSource {
  name: string;
  title: string;
  owner: string;
  repo: string;
  path: string;
}

interface VendoredFile {
  /** 相对 `VENDOR_DIR` 的路径。 */
  path: string;
  content: Buffer;
}

/** dsh-enhance 的 polish 预设内联的上游写作技能。 */
const SOURCES: UpstreamSource[] = [
  {
    name: "humanizer",
    title: "Humanizer",
    owner: "blader",
    repo: "humanizer",
    path: "SKILL.md",
  },
  {
    name: "no-ai-slop",
    title: "No AI Slop",
    owner: "petergyang",
    repo: "no-ai-slop",
    path: "skills/no-ai-slop/SKILL.md",
  },
  {
    name: "no-negative-echo",
    title: "No Negative Echo",
    owner: "LB623",
    repo: "no-negative-echo",
    path: "no-negative-echo/SKILL.md",
  },
];

const VENDORED_FILE = "SKILL.md";
const NOTICE_BASENAMES = new Set(["license", "licence", "notice", "copying"]);

const octokit = new Octokit(process.env.GITHUB_TOKEN ? { auth: process.env.GITHUB_TOKEN } : {});
const manifestPath = join(VENDOR_DIR, MANIFEST_FILE);

function isNoticeFile(name: string): boolean {
  const base = name.toLowerCase().split(".")[0] ?? "";
  return NOTICE_BASENAMES.has(base);
}

/** 读取提交 `commit` 下的文件原始字节。 */
async function readFileAt(source: UpstreamSource, commit: string, path: string): Promise<Buffer> {
  const { data } = await octokit.rest.repos.getContent({
    owner: source.owner,
    repo: source.repo,
    path,
    ref: commit,
  });
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`${source.owner}/${source.repo}:${path}@${commit} is not a file`);
  }
  return Buffer.from(data.content, "base64");
}

async function listNoticeFiles(source: UpstreamSource, commit: string): Promise<string[]> {
  const { data } = await octokit.rest.repos.getContent({
    owner: source.owner,
    repo: source.repo,
    path: "",
    ref: commit,
  });
  if (!Array.isArray(data)) {
    throw new Error(`${source.owner}/${source.repo}@${commit} root is not a directory`);
  }
  const names = data
    .filter((entry) => entry.type === "file" && isNoticeFile(entry.name))
    .map((entry) => entry.name)
    .toSorted();
  if (names.length === 0) {
    throw new Error(`${source.owner}/${source.repo}@${commit} has no LICENSE or NOTICE file`);
  }
  return names;
}

/** 分支 `branch` 上最近一次改动 `source.path` 的提交。 */
async function lastCommit(source: UpstreamSource, branch: string): Promise<string> {
  const { data } = await octokit.rest.repos.listCommits({
    owner: source.owner,
    repo: source.repo,
    sha: branch,
    path: source.path,
    per_page: 1,
  });
  const [commit] = data;
  if (commit === undefined) {
    throw new Error(`${source.owner}/${source.repo}:${source.path}@${branch} has no commits`);
  }
  return commit.sha;
}

async function fetchSource(
  source: UpstreamSource,
): Promise<{ reference: VendoredReference; files: VendoredFile[] }> {
  const { data: repo } = await octokit.rest.repos.get({ owner: source.owner, repo: source.repo });
  const license = repo.license?.spdx_id;
  if (!license || license === "NOASSERTION") {
    throw new Error(`${repo.full_name} has no recognized SPDX license`);
  }
  const commit = await lastCommit(source, repo.default_branch);

  const notices = await listNoticeFiles(source, commit);
  const files: VendoredFile[] = [
    {
      path: `${source.name}/${VENDORED_FILE}`,
      content: await readFileAt(source, commit, source.path),
    },
    ...(await Promise.all(
      notices.map(async (name) => ({
        path: `${source.name}/${name}`,
        content: await readFileAt(source, commit, name),
      })),
    )),
  ];

  const reference: VendoredReference = {
    name: source.name,
    title: source.title,
    repository: repo.full_name,
    path: source.path,
    commit,
    license,
    file: VENDORED_FILE,
    notices,
  };
  return { reference, files };
}

/** 一份参考全部复制文件的路径与内容的 MurmurHash3（x64，128 位）。 */
function contentHash(files: VendoredFile[]): string {
  const entries = files.map((file) => [file.path, file.content.toString("base64")]);
  return MurmurHash3.x64.hash128(new TextEncoder().encode(JSON.stringify(entries)));
}

async function readVendored(reference: VendoredReference): Promise<VendoredFile[]> {
  return Promise.all(
    [reference.file, ...reference.notices].map(async (name) => {
      const path = `${reference.name}/${name}`;
      return { path, content: await readFile(join(VENDOR_DIR, path)) };
    }),
  );
}

// 首次同步时还没有清单。
const previous: ReferenceManifest | undefined = existsSync(manifestPath)
  ? v.parse(ReferenceManifestSchema, JSON.parse(await readFile(manifestPath, "utf8")))
  : undefined;

interface SyncedReference {
  reference: VendoredReference;
  files: VendoredFile[];
  hash: string;
  changed: boolean;
}

async function syncSource(source: UpstreamSource): Promise<SyncedReference> {
  const result = await fetchSource(source);
  const hash = contentHash(result.files);
  const known = previous?.references.find((reference) => reference.name === source.name);
  const unchanged =
    known !== undefined &&
    known.path === result.reference.path &&
    known.commit === result.reference.commit &&
    contentHash(await readVendored(known)) === hash;
  return { reference: result.reference, files: result.files, hash, changed: !unchanged };
}

const results: SyncedReference[] = [];
for (const source of SOURCES) {
  // 逐个请求上游，避免触发 GitHub 的次级速率限制。
  // oxlint-disable-next-line no-await-in-loop
  results.push(await syncSource(source));
}
const manifest = v.parse(ReferenceManifestSchema, {
  references: results.map((result) => result.reference),
});

await rm(VENDOR_DIR, { recursive: true, force: true });
await Promise.all(
  results
    .flatMap((result) => result.files)
    .map(async (file) => {
      const target = join(VENDOR_DIR, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }),
);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

for (const { reference, hash, changed } of results) {
  const status = changed ? "changed" : "unchanged";
  console.log(
    `${reference.name}: ${reference.repository}@${reference.commit.slice(0, 12)} ${reference.path} murmur3:${hash} ${status}`,
  );
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `changed=${results.some((result) => result.changed)}\n`,
  );
}
