import { mkdir, rm, writeFile } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
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
}

interface VendoredFile {
  path: string;
  content: string;
}

const SOURCES: UpstreamSource[] = [
  {
    name: "codex",
    title: "Codex",
    owner: "openai",
    repo: "codex",
    path: "codex-rs/tui/assets/prompt_for_init_command.md",
  },
  {
    name: "kimi-code",
    title: "Kimi Code",
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
  const license = repo.license?.spdx_id;
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

const results = await Promise.all(SOURCES.map(fetchSource));
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

for (const preset of manifest.presets) {
  console.log(`${preset.name}: ${preset.repository}@${preset.commit.slice(0, 12)} ${preset.path}`);
}
