/**
 * 给 `public/media/` 里的录屏和录屏封面图加上仓库水印（design.md「录屏水印」）。
 *
 * 用法：`pnpm --filter agent-stash-docs media:watermark --source <目录> [场景名…]`
 *
 * `--source` 目录按场景名放未加水印的原始录屏与封面图（`recall.mp4`、`recall.png`），文件名与
 * `lib/media.ts` 登记的相同。脚本把加好水印的文件写进 `public/media/`；不写场景名时处理全部录屏场景。
 */
import { spawn } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import * as v from "valibot";
import { media } from "../lib/media.ts";
import { ogFontFamily, ogRenderer } from "../lib/og.server.ts";
import { watermarkOverlay, WATERMARK_TEXT } from "../lib/watermark.ts";

/** 写进录屏 `comment` 元数据的标记；带这个标记的文件已经加过水印，不能再当原始录屏。 */
const WATERMARK_TAG = `watermark: ${WATERMARK_TEXT}`;
/** 素材按 2 倍像素拍摄。 */
const PIXEL_RATIO = 2;
const MEDIA_DIR = resolve(import.meta.dirname, "..", "public", "media");

interface Run {
  stdout: string;
}

/** 运行一个命令，可选地把 `input` 写进它的标准输入；退出码不为 0 时抛出带 stderr 的错误。 */
function run(command: string, args: string[], input?: Buffer): Promise<Run> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", fail);
    child.on("close", (code) => {
      if (code === 0) done({ stdout });
      else fail(new Error(`${command} ${args.join(" ")} exited with ${String(code)}\n${stderr}`));
    });
    child.stdin.end(input);
  });
}

/** `ffprobe -of json` 输出里用到的字段。 */
const ProbeSchema = v.object({
  streams: v.tuple([v.object({ width: v.number(), height: v.number() })]),
  format: v.object({ tags: v.optional(v.object({ comment: v.optional(v.string()) })) }),
});

interface Probe {
  width: number;
  height: number;
  comment: string | undefined;
}

async function probe(file: string): Promise<Probe> {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format_tags=comment",
    "-of", "json",
    file,
  ]); // prettier-ignore
  const { streams, format } = v.parse(ProbeSchema, JSON.parse(stdout));
  const [stream] = streams;
  return { width: stream.width, height: stream.height, comment: format.tags?.comment };
}

async function renderOverlay(width: number, height: number): Promise<Buffer> {
  const renderer = await ogRenderer();
  // `width` 与 `height` 是输出图片的像素尺寸，排版按除以 `devicePixelRatio` 后的 CSS 尺寸进行。
  const overlay = await renderer.render(
    watermarkOverlay(width / PIXEL_RATIO, height / PIXEL_RATIO),
    { width, height, devicePixelRatio: PIXEL_RATIO, format: "png", fontFamilies: [ogFontFamily] },
  );
  return Buffer.from(overlay);
}

/** 把覆盖层叠到一段录屏上；画质参数与原始录屏相同（H.264、yuv420p、无音轨）。 */
async function watermarkVideo(source: string, target: string, overlay: Buffer): Promise<void> {
  await run(
    "ffmpeg",
    [
      "-v", "error", "-y",
      "-i", source,
      "-f", "png_pipe", "-i", "pipe:0",
      "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p",
      "-an",
      "-c:v", "libx264", "-preset", "slow", "-crf", "20",
      "-map_metadata", "-1",
      "-metadata", `comment=${WATERMARK_TAG}`,
      "-movflags", "+faststart",
      target,
    ],
    overlay,
  ); // prettier-ignore
}

async function watermarkImage(source: string, target: string, overlay: Buffer): Promise<void> {
  await run(
    "ffmpeg",
    [
      "-v", "error", "-y",
      "-i", source,
      "-f", "png_pipe", "-i", "pipe:0",
      "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto",
      "-frames:v", "1",
      "-update", "1",
      target,
    ],
    overlay,
  ); // prettier-ignore
}

interface Scene {
  name: string;
  video: string;
  image: string;
}

const { values, positionals } = parseArgs({
  options: { source: { type: "string" } },
  allowPositionals: true,
});
if (values.source === undefined) {
  throw new Error("--source <directory of the original recordings> is required");
}
const sourceDir = resolve(process.env["INIT_CWD"] ?? process.cwd(), values.source);
if (sourceDir === MEDIA_DIR) {
  throw new Error(`--source must not be ${MEDIA_DIR}, which holds the output`);
}

async function watermarkScene(scene: Scene): Promise<void> {
  const video = join(sourceDir, basename(scene.video));
  const poster = join(sourceDir, basename(scene.image));
  const [videoInfo, posterInfo] = await Promise.all([probe(video), probe(poster)]);
  if (videoInfo.comment === WATERMARK_TAG) {
    throw new Error(`${video} already carries the watermark`);
  }
  if (videoInfo.width !== posterInfo.width || videoInfo.height !== posterInfo.height) {
    throw new Error(`${poster} is not the size of ${video}`);
  }
  const overlay = await renderOverlay(videoInfo.width, videoInfo.height);
  await watermarkVideo(video, join(MEDIA_DIR, basename(scene.video)), overlay);
  await watermarkImage(poster, join(MEDIA_DIR, basename(scene.image)), overlay);
  console.log(`${scene.name}: ${String(videoInfo.width)}x${String(videoInfo.height)}`);
}

const scenes: Scene[] = Object.entries(media).flatMap(([name, entry]) =>
  entry.video === undefined ? [] : [{ name, video: entry.video, image: entry.image }],
);
const unknown = positionals.filter((name) => !scenes.some((scene) => scene.name === name));
if (unknown.length > 0) {
  throw new Error(`Not a recording scene in lib/media.ts: ${unknown.join(", ")}`);
}
const selected =
  positionals.length === 0 ? scenes : scenes.filter((scene) => positionals.includes(scene.name));

for (const scene of selected) {
  // oxlint-disable-next-line no-await-in-loop -- 逐段编码，同时只占一个 ffmpeg 进程的内存。
  await watermarkScene(scene);
}
