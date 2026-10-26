/**
 * 版本记录存在 `ctx.storageDomain` 的 `message_edit` domain 里，键是子会话 id。
 *
 * 声明写成两版 DSH 都接受的纯对象：0.1.0-rc.3 与 0.2.1-rc.3 的 `open` 只读取 `name`、`version`、
 * `tables`，并在打开时对每条存储记录调用 `valueSchema.parse`；不写 `layout` 时 0.2.1-rc.3 的 json
 * 后端与 0.1.0-rc.3 一样存成单个 `message_edit.json`。Host bundle 因此不需要 import `defineDomain`。
 */
import * as v from "valibot";
import {
  MESSAGE_EDIT_DOMAIN,
  MESSAGE_EDIT_VERSIONS_TABLE,
  VersionRecordSchema,
  type VersionRecord,
} from "../shared.ts";
import type { DshDomainSpec, DshKvTable, JsonValue } from "./dsh.ts";

/** domain 的存储格式版本；存储里记录的版本与它不同时 domain 拒绝打开。 */
const VERSION_DOMAIN_FORMAT = 1;

/** 校验一条存储的版本记录；不符合 `VersionRecordSchema` 时抛出，DSH 会补上记录键再拒绝打开 domain。 */
export function parseVersionRecord(raw: JsonValue): VersionRecord {
  const result = v.safeParse(VersionRecordSchema, raw);
  if (!result.success) {
    throw new Error(`版本记录不符合 VersionRecordSchema：${v.summarize(result.issues)}`);
  }
  return result.output;
}

export const VERSION_DOMAIN: DshDomainSpec<VersionRecord> = {
  name: MESSAGE_EDIT_DOMAIN,
  version: VERSION_DOMAIN_FORMAT,
  tables: { [MESSAGE_EDIT_VERSIONS_TABLE]: { valueSchema: { parse: parseVersionRecord } } },
};

/** 版本表：子会话 id → 创建它的那次操作。 */
export type VersionTable = DshKvTable<VersionRecord>;
