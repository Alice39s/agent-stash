import { fileURLToPath } from "node:url";
import * as v from "valibot";

/**
 * 随包分发的上游写作参考目录 `dsh/enhance/vendor/`。
 * 源码 `src/*.ts` 与打包产物 `dist/index.js` 都在包根目录下一层，同一个相对路径对两者都成立。
 */
export const VENDOR_DIR = fileURLToPath(new URL("../vendor/", import.meta.url));
export const MANIFEST_FILE = "manifest.json";

const Text = v.pipe(v.string(), v.nonEmpty());
/** 单个文件或目录名，不含路径分隔符。 */
const FileName = v.pipe(v.string(), v.regex(/^[^/\\]+$/));

/** 一份原样复制的上游参考，文件都在 `vendor/<name>/` 下。 */
export const VendoredReferenceSchema = v.object({
  name: FileName,
  title: Text,
  /** GitHub 仓库 `owner/repo`。 */
  repository: v.pipe(v.string(), v.regex(/^[\w.-]+\/[\w.-]+$/)),
  /** 上游仓库内的文件路径。 */
  path: Text,
  /** 默认分支上最近一次改动 `path` 的提交。 */
  commit: v.pipe(v.string(), v.regex(/^[0-9a-f]{40}$/)),
  /** SPDX 许可证标识。 */
  license: Text,
  /** 逐字节复制的上游文件。 */
  file: FileName,
  /** 同一提交下仓库根目录的 LICENSE、NOTICE 等文件。 */
  notices: v.pipe(v.array(FileName), v.minLength(1)),
});

export const ReferenceManifestSchema = v.object({
  references: v.pipe(v.array(VendoredReferenceSchema), v.minLength(1)),
});

export type VendoredReference = v.InferOutput<typeof VendoredReferenceSchema>;
export type ReferenceManifest = v.InferOutput<typeof ReferenceManifestSchema>;
