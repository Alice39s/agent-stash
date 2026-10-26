import { expect, test } from "vitest";
import { cx } from "./class-names.ts";

test("cx joins enabled class names only", () => {
  expect(cx("a", false, undefined, null, "", "b")).toBe("a b");
});
