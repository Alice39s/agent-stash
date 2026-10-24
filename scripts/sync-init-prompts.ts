import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
import MurmurHash3 from "murmurhash3js-revisited";
import { dirname, join } from "pathe";
import * as v from "valibot";
import {
  MANIFEST_FILE,
  ManifestSchema,
  VENDOR_DIR,
  type VendoredPreset,
} from "../src/init/manifest.ts";

interface UpstreamSource {
  name: string;
  title: string;
  owner: string;
  repo: string;
  path: string;
  /** SPDX id for repositories whose license GitHub does not recognize. */
  license?: string;
}

interface VendoredFile {
  path: string;
  content: string;
}

const SOURCES: UpstreamSource[] = [
  {
    name: "codex",
    title: "Codex CLI",
    owner: "openai",
    repo: "codex",
    path: "codex-rs/tui/assets/prompt_for_init_command.md",
  },
  {
    name: "kimi-code",
    title: "Kimi Code CLI",
    owner: "MoonshotAI",
    repo: "kimi-code",
    path: "packages/agent-core-v2/src/features/sessionInit/profile/init.md",
  },
  {
    name: "opencode",
    title: "OpenCode",
    owner: "anomalyco",
    repo: "opencode",
    path: "packages/core/src/plugin/command/initialize.txt",
  },
  {
    name: "crush",
    title: "Crush",
    owner: "charmbracelet",
    repo: "crush",
    path: "internal/agent/templates/initialize.md.tpl",
    license: "FSL-1.1-MIT",
  },
  {
    name: "copilot",
    title: "GitHub Copilot in VS Code",
    owner: "microsoft",
    repo: "vscode",
    path: "extensions/copilot/assets/prompts/skills/init/SKILL.md",
  },
];

const NOTICE_BASENAMES = new Set(["license", "licence", "notice", "copying"]);

const octokit = new Octokit(process.env.GITHUB_TOKEN ? { auth: process.env.GITHUB_TOKEN } : {});

function isNoticeFile(name: string): boolean {
  const base = name.toLowerCase().split(".")[0] ?? "";
  return NOTICE_BASENAMES.has(base);
}

async function readFileAt(source: UpstreamSource, commit: string, path: string): Promise<string> {
  const { data } = await octokit.rest.repos.getContent({
    owner: source.owner,
    repo: source.repo,
    path,
    ref: commit,
  });
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`${source.owner}/${source.repo}:${path}@${commit} is not a file`);
  }
  return Buffer.from(data.content, "base64").toString("utf8");
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

async function fetchSource(
  source: UpstreamSource,
): Promise<{ preset: VendoredPreset; files: VendoredFile[] }> {
  const { data: repo } = await octokit.rest.repos.get({ owner: source.owner, repo: source.repo });
  const license = source.license ?? repo.license?.spdx_id;
  if (!license || license === "NOASSERTION") {
    throw new Error(`${repo.full_name} has no recognized SPDX license`);
  }
  const { data: commit } = await octokit.rest.repos.getCommit({
    owner: source.owner,
    repo: source.repo,
    ref: repo.default_branch,
  });

  const prompt = `${source.name}/prompt.md`;
  const noticeNames = await listNoticeFiles(source, commit.sha);
  const files: VendoredFile[] = [
    { path: prompt, content: await readFileAt(source, commit.sha, source.path) },
    ...(await Promise.all(
      noticeNames.map(async (name) => ({
        path: `${source.name}/${name}`,
        content: await readFileAt(source, commit.sha, name),
      })),
    )),
  ];

  const preset: VendoredPreset = {
    name: source.name,
    title: source.title,
    repository: repo.full_name,
    commit: commit.sha,
    path: source.path,
    license,
    prompt,
    notices: noticeNames.map((name) => `${source.name}/${name}`),
  };
  return { preset, files };
}

/** MurmurHash3 (x64, 128-bit) of a preset's vendored paths and contents. */
function contentHash(files: VendoredFile[]): string {
  return MurmurHash3.x64.hash128(new TextEncoder().encode(JSON.stringify(files)));
}

async function readVendored(preset: VendoredPreset): Promise<VendoredFile[]> {
  return Promise.all(
    [preset.prompt, ...preset.notices].map(async (path) => ({
      path,
      content: await readFile(join(VENDOR_DIR, path), "utf8"),
    })),
  );
}

const previous = v.parse(
  ManifestSchema,
  JSON.parse(await readFile(join(VENDOR_DIR, MANIFEST_FILE), "utf8")),
);
interface SyncedPreset {
  preset: VendoredPreset;
  files: VendoredFile[];
  hash: string;
  changed: boolean;
}

async function syncSource(source: UpstreamSource): Promise<SyncedPreset> {
  const result = await fetchSource(source);
  const hash = contentHash(result.files);
  const known = previous.presets.find((preset) => preset.name === source.name);
  const unchanged =
    known !== undefined &&
    known.path === result.preset.path &&
    contentHash(await readVendored(known)) === hash;
  // Unchanged content keeps the recorded commit, so a moving upstream HEAD alone produces no diff.
  if (unchanged) result.preset.commit = known.commit;
  return { preset: result.preset, files: result.files, hash, changed: !unchanged };
}

const results: SyncedPreset[] = [];
for (const source of SOURCES) {
  // One upstream at a time keeps the run within GitHub's secondary rate limits.
  // oxlint-disable-next-line no-await-in-loop
  results.push(await syncSource(source));
}
const manifest = v.parse(ManifestSchema, { presets: results.map((result) => result.preset) });

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
await writeFile(join(VENDOR_DIR, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);

for (const { preset, hash, changed } of results) {
  const status = changed ? "changed" : "unchanged";
  console.log(
    `${preset.name}: ${preset.repository}@${preset.commit.slice(0, 12)} ${preset.path} murmur3:${hash} ${status}`,
  );
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `changed=${results.some((result) => result.changed)}\n`,
  );
}
