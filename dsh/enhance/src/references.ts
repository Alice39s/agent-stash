import { readFile } from "node:fs/promises";
import { join } from "pathe";
import * as v from "valibot";
import { MANIFEST_FILE, ReferenceManifestSchema, VENDOR_DIR } from "./vendor-manifest.ts";

/** 随包分发的一份写作参考：上游出处与全文。 */
export interface WritingReference {
  readonly name: string;
  /** 上游文件在 GitHub 上固定到提交的地址。 */
  readonly source: string;
  readonly license: string;
  readonly text: string;
}

/** 名称到写作参考。 */
export type References = ReadonlyMap<string, WritingReference>;

/** 读取 `dir` 下清单列出的全部写作参考。 */
export async function loadReferences(dir: string = VENDOR_DIR): Promise<References> {
  const manifest = v.parse(
    ReferenceManifestSchema,
    JSON.parse(await readFile(join(dir, MANIFEST_FILE), "utf8")),
  );
  const entries = await Promise.all(
    manifest.references.map(async (entry): Promise<[string, WritingReference]> => [
      entry.name,
      {
        name: entry.name,
        source: `https://github.com/${entry.repository}/blob/${entry.commit}/${entry.path}`,
        license: entry.license,
        text: await readFile(join(dir, entry.name, entry.file), "utf8"),
      },
    ]),
  );
  return new Map(entries);
}

const INCLUDE = /<include ref="([^"]*)"\s*\/>/gu;

/** 展开 `<include>` 的结果：引用了没有随包分发的参考时列出这些名称。 */
export type Expanded =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly missing: readonly string[] };

/**
 * 把指令里的 `<include ref="名称" />` 换成对应参考的全文，外面包一层注明出处与许可的
 * `<reference>`。参考的全文原样放入，不改动上游内容。
 */
export function expandIncludes(text: string, references: References): Expanded {
  const missing = new Set<string>();
  const expanded = text.replace(INCLUDE, (include, name: string) => {
    const reference = references.get(name);
    if (reference === undefined) {
      missing.add(name);
      return include;
    }
    return `<reference name="${reference.name}" source="${reference.source}" license="${reference.license}">\n${reference.text.trimEnd()}\n</reference>`;
  });
  return missing.size > 0 ? { ok: false, missing: [...missing] } : { ok: true, text: expanded };
}
