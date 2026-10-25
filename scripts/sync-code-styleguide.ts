import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
import type { Link, LinkReference } from "mdast";
import { toString as mdastText } from "mdast-util-to-string";
import { dirname, join } from "pathe";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import * as v from "valibot";
import { convertGuide, renderReference, type GuideSource } from "../src/code-styleguide/convert.ts";
import {
  MANIFEST_FILE,
  ManifestSchema,
  SKILL_DIR,
  renderSkill,
  shortRevision,
  sourceLine,
  type Manifest,
  type ReferenceRecord,
} from "../src/code-styleguide/skill.ts";

/** One upstream document before conversion. */
interface Upstream extends GuideSource {
  file: string;
  topic: string;
  fallbackTitle: string;
  repository: string;
  path: string;
  revision: string;
  updated: string;
  license: string;
}

const GOOGLE = { owner: "google", repo: "styleguide" };
const GOOGLE_SITE = "https://google.github.io/styleguide/";
const ANGULAR = {
  owner: "angular",
  repo: "angular",
  path: "adev/src/content/best-practices/style-guide.md",
};
const ANDROID_KOTLIN = "https://developer.android.com/kotlin/style-guide";

const octokit = new Octokit(process.env.GITHUB_TOKEN ? { auth: process.env.GITHUB_TOKEN } : {});
const manifestPath = join(SKILL_DIR, MANIFEST_FILE);
const previous: Manifest | undefined = existsSync(manifestPath)
  ? v.parse(ManifestSchema, JSON.parse(await readFile(manifestPath, "utf8")))
  : undefined;
const today = new Date().toISOString().slice(0, 10);

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed with ${response.status}`);
  return response.text();
}

const rawUrl = (owner: string, repo: string, ref: string, path: string): string =>
  `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;

async function lastCommit(owner: string, repo: string, ref: string, path: string) {
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: ref,
    path,
    per_page: 1,
  });
  const [commit] = data;
  const date = commit?.commit.committer?.date;
  if (commit === undefined || date === undefined) {
    throw new Error(`${owner}/${repo}:${path}@${ref} has no commits`);
  }
  return { sha: commit.sha, date: date.slice(0, 10) };
}

/** Google style guides linked from the upstream README, in README order. */
async function googleGuides(): Promise<Upstream[]> {
  const { data: repo } = await octokit.rest.repos.get(GOOGLE);
  const { data: head } = await octokit.rest.repos.getCommit({
    ...GOOGLE,
    ref: repo.default_branch,
  });
  const { data: tree } = await octokit.rest.git.getTree({
    ...GOOGLE,
    tree_sha: head.sha,
    recursive: "true",
  });
  const blobs = tree.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);

  const readme = unified()
    .use(remarkParse)
    .parse(await fetchText(rawUrl(GOOGLE.owner, GOOGLE.repo, head.sha, "README.md")));
  const definitions = new Map<string, string>();
  visit(readme, "definition", (node) => void definitions.set(node.identifier, node.url));
  const links: (Link | LinkReference)[] = [];
  visit(readme, (node) => {
    if (node.type === "link" || node.type === "linkReference") links.push(node);
  });

  const guides = new Map<string, string>();
  for (const link of links) {
    const href = link.type === "link" ? link.url : definitions.get(link.identifier);
    if (href === undefined) throw new Error(`README link "${mdastText(link)}" has no definition`);
    const url = new URL(href, GOOGLE_SITE).href;
    if (!url.startsWith(GOOGLE_SITE)) continue;
    const path = url.slice(GOOGLE_SITE.length);
    const files = path.endsWith("/")
      ? blobs
          .filter((blob) => blob.startsWith(path) && blob.endsWith(".md"))
          .toSorted(
            (a, b) =>
              Number(b.endsWith("/index.md")) - Number(a.endsWith("/index.md")) ||
              a.localeCompare(b),
          )
      : /\.(?:md|html)$/.test(path)
        ? [path]
        : [];
    const topic = mdastText(link).replace(/\s+style guide$/i, "");
    for (const file of files) {
      if (!blobs.includes(file))
        throw new Error(`README links to ${file}, which is not in the repository`);
      if (!guides.has(file)) guides.set(file, topic);
    }
  }
  if (guides.size === 0) throw new Error("google/styleguide README links to no guides");

  const upstreams: Upstream[] = [];
  for (const [path, topic] of guides) {
    // One guide at a time keeps the run within GitHub's secondary rate limits.
    // oxlint-disable-next-line no-await-in-loop
    upstreams.push(await googleGuide(head.sha, path, topic));
  }
  return upstreams;
}

async function googleGuide(head: string, path: string, topic: string): Promise<Upstream> {
  const commit = await lastCommit(GOOGLE.owner, GOOGLE.repo, head, path);
  return {
    format: path.endsWith(".html") ? "html" : "markdown",
    content: await fetchText(rawUrl(GOOGLE.owner, GOOGLE.repo, head, path)),
    url: GOOGLE_SITE + path.replace(/\.md$/, ".html"),
    rewriteUrl: (url: URL) =>
      url.href.startsWith(GOOGLE_SITE) ? new URL(url.href.replace(/\.md(?=$|[?#])/, ".html")) : url,
    file: `google/${path.replace(/\.(?:md|html)$/, ".md")}`,
    topic,
    fallbackTitle: `Google ${topic} Style Guide`,
    repository: `${GOOGLE.owner}/${GOOGLE.repo}`,
    path,
    revision: commit.sha,
    updated: commit.date,
    license: "CC-BY-3.0",
  };
}

async function angularGuide(): Promise<Upstream> {
  const { data: repo } = await octokit.rest.repos.get(ANGULAR);
  const commit = await lastCommit(ANGULAR.owner, ANGULAR.repo, repo.default_branch, ANGULAR.path);
  return {
    format: "markdown",
    content: await fetchText(rawUrl(ANGULAR.owner, ANGULAR.repo, commit.sha, ANGULAR.path)),
    url: "https://angular.dev/style-guide",
    file: "angular/style-guide.md",
    topic: "Angular",
    fallbackTitle: "Angular coding style guide",
    repository: `${ANGULAR.owner}/${ANGULAR.repo}`,
    path: ANGULAR.path,
    revision: commit.sha,
    updated: commit.date,
    license: "CC-BY-4.0",
  };
}

/** developer.android.com has no public Git history, so a content hash stands in for the revision. */
async function androidKotlinGuide(): Promise<Upstream> {
  const url = new URL(`${ANDROID_KOTLIN}.md.txt`);
  const content = await fetchText(url.href);
  const revision = `sha256:${createHash("sha256").update(content).digest("hex")}`;
  const file = "android/kotlin-style-guide.md";
  const known = previous?.references.find((record) => record.file === `references/${file}`);
  return {
    format: "markdown",
    content,
    url: ANDROID_KOTLIN,
    file,
    topic: "Kotlin",
    fallbackTitle: "Kotlin style guide",
    repository: url.host,
    path: url.pathname,
    revision,
    updated: known?.revision === revision ? known.updated : today,
    license: "Apache-2.0",
  };
}

const upstreams = [...(await googleGuides()), await angularGuide(), await androidKotlinGuide()];
const outputs = await Promise.all(
  upstreams.map(async (upstream) => {
    const guide = await convertGuide(upstream);
    const record = {
      file: `references/${upstream.file}`,
      topic: upstream.topic,
      title: guide.title ?? upstream.fallbackTitle,
      url: upstream.url,
      repository: upstream.repository,
      path: upstream.path,
      revision: upstream.revision,
      updated: upstream.updated,
      license: upstream.license,
    };
    const reference = renderReference(record.title, sourceLine(record), guide.body);
    const complete: ReferenceRecord = {
      ...record,
      indexEnd: reference.indexEnd,
      lines: reference.lines,
    };
    return { record: complete, text: reference.text };
  }),
);
const manifest = v.parse(ManifestSchema, { references: outputs.map((output) => output.record) });

await rm(join(SKILL_DIR, "references"), { recursive: true, force: true });
await Promise.all(
  outputs.map(async ({ record, text }) => {
    const target = join(SKILL_DIR, record.file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  }),
);
await writeFile(join(SKILL_DIR, "SKILL.md"), renderSkill(manifest));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

for (const record of manifest.references) {
  console.log(
    `${record.file}: ${record.repository}@${shortRevision(record.revision)} (${record.updated})`,
  );
}
