import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  STASH_KIT,
  ensureStashKit,
  stashKitSpec,
  type DshChangeResult,
  type DshPluginManager,
} from "./kit.ts";

interface Recorded extends DshPluginManager {
  readonly calls: string[];
}

/** 记录调用的插件管理器：组合包列表与每种操作的结果由测试给定。 */
function manager(
  bundles: { name: string; enabled: boolean; installed: boolean }[],
  results: { install?: DshChangeResult; enable?: DshChangeResult } = {},
): Recorded {
  const calls: string[] = [];
  return {
    calls,
    listBundles: () => Promise.resolve(bundles),
    installBundle: (spec) => {
      calls.push(`install ${spec}`);
      return Promise.resolve(results.install ?? { application: "applied" });
    },
    setBundleEnabled: (name, enabled) => {
      calls.push(`enable ${name} ${String(enabled)}`);
      return Promise.resolve(results.enable ?? { application: "applied" });
    },
  };
}

const SPEC = "/repo/dsh/kit";

describe("ensureStashKit", () => {
  test("leaves an enabled kit alone", async () => {
    const pm = manager([{ name: STASH_KIT, enabled: true, installed: true }]);
    expect(await ensureStashKit(pm, "dsh-recall", SPEC)).toBe("present");
    expect(pm.calls).toEqual([]);
  });

  test("installs a missing kit, which also enables it", async () => {
    const pm = manager([{ name: "@agent-stash/dsh-recall", enabled: true, installed: true }]);
    expect(await ensureStashKit(pm, "dsh-recall", SPEC)).toBe("installed");
    expect(pm.calls).toEqual([`install ${SPEC}`]);
  });

  test("enables an installed kit the profile does not select", async () => {
    const pm = manager([{ name: STASH_KIT, enabled: false, installed: true }]);
    expect(await ensureStashKit(pm, "dsh-recall", SPEC)).toBe("enabled");
    expect(pm.calls).toEqual([`enable ${STASH_KIT} true`]);
  });

  test("enables the kit another plugin installed in the meantime", async () => {
    const pm = manager([], {
      install: { application: "failed", error: { code: "already-installed" } },
    });
    expect(await ensureStashKit(pm, "dsh-autosuggest", SPEC)).toBe("enabled");
    expect(pm.calls).toEqual([`install ${SPEC}`, `enable ${STASH_KIT} true`]);
  });

  test("reports a failed installation with its code", async () => {
    const pm = manager([], { install: { application: "failed", error: { code: "network" } } });
    await expect(ensureStashKit(pm, "dsh-recall", SPEC)).rejects.toThrow(
      "dsh-recall: installing the @agent-stash/dsh-stash-kit bundle failed (network)",
    );
  });
});

describe("stashKitSpec", () => {
  test("installs the kit beside a plugin installed from a repository checkout", () => {
    const host = fileURLToPath(new URL("../../recall/dist/index.js", import.meta.url));
    expect(stashKitSpec(host)).toBe(fileURLToPath(new URL("../../kit", import.meta.url)));
  });

  test("installs the kit from npm when no kit directory sits beside the plugin", () => {
    const host = fileURLToPath(new URL("../../../dist/cli/agent-stash.js", import.meta.url));
    expect(stashKitSpec(host)).toBe("@agent-stash/dsh-stash-kit");
  });
});
