import { afterEach, describe, expect, test, vi } from "vitest";
import { IconListPenOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives";
import {
  apply,
  initSource,
  presetOptions,
  type InitClientContext,
  type InitContribution,
  type InitTriggerSource,
} from "./client.ts";
import type { PresetList } from "./wire.ts";

const LIST: PresetList = {
  defaultPreset: "kimi-code",
  presets: [
    { name: "codex", title: "Codex CLI", custom: false },
    { name: "kimi-code", title: "Kimi Code CLI", custom: false },
    { name: "team", title: "team", custom: true },
  ],
};

interface Mounted {
  contribution: InitContribution;
  source: InitTriggerSource;
  setLocale: (locale: "en" | "zh") => void;
  dispose: () => void;
  registrations: () => number;
}

/** 用假的指令界面、触发管线与词典挂载浏览器半部；`subagent` 是子代理会话的 id。 */
function mount(): Mounted {
  const dictionaries = new Map<string, Readonly<Record<string, string>>>();
  let locale: "en" | "zh" = "zh";
  let contribution: InitContribution | undefined;
  let source: InitTriggerSource | undefined;
  let live = 0;
  const disposers: (() => void)[] = [];
  const ctx: InitClientContext = {
    commandUi: {
      register(registered) {
        contribution = registered;
        live += 1;
        return () => {
          live -= 1;
        };
      },
    },
    inputTriggers: {
      registerSource(registered) {
        source = registered;
        live += 1;
        return () => {
          live -= 1;
        };
      },
    },
    sessions: { subagentAddress: (id) => (id === "subagent" ? { parent: "root" } : undefined) },
    locale: {
      register(ns, id, dict) {
        dictionaries.set(`${ns}:${id}`, dict);
        live += 1;
        return () => {
          live -= 1;
        };
      },
      bind: (ns) => (key) => dictionaries.get(`${ns}:${locale}`)?.[key] ?? key,
    },
    effect(execute) {
      disposers.push(execute());
    },
  };
  apply(ctx);
  if (contribution === undefined || source === undefined) {
    throw new Error("the client half registered no command");
  }
  return {
    contribution,
    source,
    setLocale: (next) => {
      locale = next;
    },
    dispose: () => {
      for (const dispose of disposers) dispose();
    },
    registrations: () => live,
  };
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** 替换全局 `fetch`：按路径与方法回应，记下每个请求；带请求体的请求连同它的 `content-type`。 */
function stubHost(run: (body: unknown) => Response = () => json(200, { preset: "codex" })) {
  const requests: { url: string; method: string; type?: string | null; body?: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      const body: unknown = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
      const type = new Headers(init.headers).get("content-type");
      requests.push({ url, method, ...(body === undefined ? {} : { type, body }) });
      if (url === "agent-stash-init/presets" && method === "GET") {
        return Promise.resolve(json(200, LIST));
      }
      if (url === "agent-stash-init/run" && method === "POST") {
        return Promise.resolve(run(body));
      }
      return Promise.resolve(json(404, { message: "no route" }));
    }),
  );
  return requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const session = { sessionId: "session-1" };

describe("the /init command in the / menu", () => {
  test("shows a localized title, description and icon", () => {
    const { contribution, setLocale } = mount();
    expect(contribution.name).toBe("init");
    expect(contribution.icon).toBe(IconListPenOutlineRegular);
    expect([contribution.label(), contribution.description()]).toEqual([
      "初始化",
      "分析项目并写出 AGENTS.md",
    ]);
    setLocale("en");
    expect([contribution.label(), contribution.description()]).toEqual([
      "Init",
      "Analyze the project and write AGENTS.md",
    ]);
    expect(contribution.ui.searchLabels()).toEqual({
      placeholder: "Search presets…",
      empty: "No presets available",
      noResults: "No matching presets",
    });
  });

  test("is unavailable in subagent sessions", () => {
    const { contribution } = mount();
    expect(contribution.available(session)).toBe(true);
    expect(contribution.available({ sessionId: "subagent" })).toBe(false);
  });

  test("lists the presets from the Host and runs the picked one in the session", async () => {
    const requests = stubHost();
    const { contribution } = mount();
    const options = await contribution.ui.options(session, new AbortController().signal);
    expect(options.map((option) => option.id)).toEqual(["codex", "kimi-code", "team"]);
    const team = options[2];
    if (team === undefined) throw new Error("the custom preset is missing");
    await contribution.ui.onSelect(team, session);
    expect(requests).toEqual([
      { url: "agent-stash-init/presets", method: "GET" },
      {
        url: "agent-stash-init/run",
        method: "POST",
        type: "application/json",
        body: { session: "session-1", input: "team" },
      },
    ]);
  });

  test("keeps the popup open with the Host message when a run fails", async () => {
    stubHost(() => json(404, { message: 'session "session-1" not found' }));
    const { contribution } = mount();
    await expect(
      contribution.ui.onSelect({ id: "codex", label: "Codex CLI" }, session),
    ).rejects.toThrow('POST agent-stash-init/run answered 404: session "session-1" not found');
  });

  test("unregisters the command, the argument source and the dictionaries on unload", () => {
    const mounted = mount();
    expect(mounted.registrations()).toBe(4);
    mounted.dispose();
    expect(mounted.registrations()).toBe(0);
  });
});

describe("presetOptions", () => {
  test("titles each preset, marks the default and groups the custom presets", () => {
    expect(presetOptions(LIST, "自定义")).toEqual([
      { id: "codex", label: "Codex CLI", detail: "codex" },
      { id: "kimi-code", label: "Kimi Code CLI", detail: "kimi-code", active: true },
      { id: "team", label: "team", group: { name: "custom", label: "自定义" } },
    ]);
  });
});

describe("/init arguments", () => {
  const source = initSource(
    (candidate) => candidate.sessionId !== "subagent",
    () => "[预设] [额外指令]",
  );

  test("adds no rows to the / menu", async () => {
    expect(source).toMatchObject({ trigger: "/", showGroupTitle: false });
    await expect(source.candidates()).resolves.toEqual([]);
  });

  test("claims /init followed by a space with the argument hint", () => {
    expect(source.matchSpace(session, "/init")?.claim).toMatchObject({
      name: "init",
      token: "/init ",
      hint: "[预设] [额外指令]",
    });
    expect(source.matchSpace(session, "/model")).toBeUndefined();
    expect(source.matchSpace({ sessionId: "subagent" }, "/init")).toBeUndefined();
  });

  test("claims a submitted /init line only when it carries arguments", async () => {
    await expect(source.matchEnter(session, "/init kimi-code focus on tests")).resolves.toEqual({
      claim: expect.objectContaining({ token: "/init " }),
    });
    await expect(source.matchEnter(session, "/init")).resolves.toBeUndefined();
    await expect(source.matchEnter(session, "/initialize the repo")).resolves.toBeUndefined();
    await expect(source.matchClaim(session, "/init")).resolves.toMatchObject({ name: "init" });
    await expect(source.matchClaim(session, "/goal")).resolves.toBeUndefined();
  });

  test("submits the arguments after the token to the Host", async () => {
    const requests = stubHost();
    const claim = source.matchSpace(session, "/init")?.claim;
    await expect(claim?.submit("kimi-code focus on tests")).resolves.toEqual({ kind: "success" });
    expect(requests).toEqual([
      {
        url: "agent-stash-init/run",
        method: "POST",
        type: "application/json",
        body: { session: "session-1", input: "kimi-code focus on tests" },
      },
    ]);
  });
});
