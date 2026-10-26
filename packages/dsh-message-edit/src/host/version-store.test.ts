import { describe, expect, test } from "vitest";
import { MESSAGE_EDIT_DOMAIN, MESSAGE_EDIT_VERSIONS_TABLE } from "../shared.ts";
import { parseVersionRecord, VERSION_DOMAIN } from "./version-store.ts";

/** 两版 dsh-storage 的 `UNIT_NAME_RE`：domain 名与表名都要满足它。 */
const UNIT_NAME_RE = /^[a-z][a-z0-9_]*$/;

const RECORD = {
  parentSessionId: "session-source",
  createdAt: 1_700_000_000_000,
  effect: {
    id: "0b7c9d9e-4a7f-4c1e-9a43-1f0e2d3c4b5a",
    operation: "edit",
    cascade: "preserve",
    targetTurn: 2,
    targetEventSeq: 15,
    targetBlockIndex: 0,
    blockKind: "user",
    before: "旧",
    after: "新",
  },
};

describe("parseVersionRecord", () => {
  test("accepts a stored record and drops unknown fields", () => {
    expect(parseVersionRecord({ ...RECORD, legacy: true })).toEqual(RECORD);
  });

  test.each([
    ["a missing source session", { createdAt: 1, effect: RECORD.effect }],
    ["an unknown operation", { ...RECORD, effect: { ...RECORD.effect, operation: "undo" } }],
    ["a non-uuid effect id", { ...RECORD, effect: { ...RECORD.effect, id: "legacy:1" } }],
    ["a negative event seq", { ...RECORD, effect: { ...RECORD.effect, targetEventSeq: -1 } }],
    ["a non-object value", "session-source"],
  ])("rejects %s", (_, raw) => {
    expect(() => parseVersionRecord(raw)).toThrow("版本记录不符合 VersionRecordSchema");
  });
});

describe("VERSION_DOMAIN", () => {
  test("declares one versions table under names both storage backends accept", () => {
    expect(VERSION_DOMAIN.name).toBe(MESSAGE_EDIT_DOMAIN);
    expect(VERSION_DOMAIN.name).toMatch(UNIT_NAME_RE);
    expect(Object.keys(VERSION_DOMAIN.tables)).toEqual([MESSAGE_EDIT_VERSIONS_TABLE]);
    expect(MESSAGE_EDIT_VERSIONS_TABLE).toMatch(UNIT_NAME_RE);
    expect(Number.isInteger(VERSION_DOMAIN.version) && VERSION_DOMAIN.version >= 0).toBe(true);
  });

  test("validates stored records through the table value schema", () => {
    const table = VERSION_DOMAIN.tables[MESSAGE_EDIT_VERSIONS_TABLE];
    expect(table?.valueSchema.parse(RECORD)).toEqual(RECORD);
    expect(() => table?.valueSchema.parse({})).toThrow("版本记录不符合 VersionRecordSchema");
  });
});
