/** 浏览器半部测试共用的翻译函数、收件箱样例、Host 路由替身与挂载工具。 */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type {
  Action,
  ActionResult,
  DetailView,
  InboxView,
  ItemView,
  PreviewView,
  StatusView,
} from "../shared.ts";
import { SCOUT_DICTIONARIES, type ScoutTranslate } from "./locale.ts";
import { createInboxStore, type InboxStore } from "./store.ts";

/** 与宿主 `locale.bind` 相同的 `{name}` 插值；缺参数时直接报错。 */
export function translator(locale: "en" | "zh"): ScoutTranslate {
  const dictionary = SCOUT_DICTIONARIES[locale];
  return (key, params = {}) =>
    dictionary[key].replaceAll(/\{(\w+)\}/gu, (_match, name: string) => {
      const value = params[name];
      if (value === undefined) throw new Error(`missing parameter ${name} for ${key}`);
      return String(value);
    });
}

export const NOW = Date.UTC(2026, 9, 30, 9);

export const STATUS: StatusView = {
  discovery: true,
  summarize: false,
  notify: "badge",
  scope: "project",
  models: {
    summary: { provider: "deepseek", model: "deepseek-flash", effort: null, source: "config" },
    draft: { provider: "deepseek", model: "deepseek-pro", effort: null, source: "default" },
  },
  lead: true,
  scanning: false,
  waiting: 0,
  working: 0,
  usage: { summaries: 1, limit: 6, requested: 1, inputTokens: 1200, outputTokens: 300 },
  lastError: null,
  analyzed: { sessions: 4, episodes: 4 },
};

/** 摘要与草稿都还没有的建议应有的字段。 */
export const UNSUMMARIZED: Partial<ItemView> = {
  state: "detected",
  title: null,
  found: null,
  description: null,
  trigger: null,
  outline: [],
  risks: [],
  verification: null,
  decision: null,
  skill: null,
};

/** 一条建议；默认是草稿已生成、可以保存的重复流程。 */
export function item(fields: Partial<ItemView> = {}): ItemView {
  return {
    id: "repeated:1",
    kind: "repeated",
    state: "ready",
    title: "Cut a local patch release",
    goal: "Release a patch version",
    steps: ["npm test", "npm version", "git push"],
    found:
      "Two sessions ran the tests, bumped the patch version, and pushed the tag; every step passed.",
    description: "Release a patch version of an npm package after the tests pass.",
    trigger: "When the user asks for a patch release of widget.",
    outline: ["Run the tests", "Bump the patch version", "Push the tag"],
    risks: ["Pushes a tag to the remote"],
    verification: "The new tag is on the remote and the tests passed before the bump.",
    reason: null,
    occurrences: 2,
    sessions: [
      {
        sessionId: "s2",
        episodeId: "s2:8",
        at: NOW - 60_000,
        goal: "Release another patch",
        outcome: "verified",
      },
      {
        sessionId: "s1",
        episodeId: "s1:8",
        at: NOW - 3_600_000,
        goal: "Release a patch version",
        outcome: "verified",
      },
    ],
    score: 0.9,
    detectedAt: NOW - 120_000,
    updatedAt: NOW - 60_000,
    decision: "suggest_create",
    skill: "local-patch-release",
    cautions: [],
    failure: null,
    write: null,
    dismissedSimilar: false,
    ...fields,
  };
}

export function inboxOf(items: readonly ItemView[], status: Partial<StatusView> = {}): InboxView {
  return { status: { ...STATUS, ...status }, items: [...items] };
}

export const DRAFT = {
  name: "local-patch-release",
  description: "Test, bump the patch version, commit, and tag.",
  whenToUse: "When a patch release is requested.",
  body: "# Cut a local patch release\n\n## Steps\n\n1. Run the tests.\n\n   ```bash\n   npm test\n   ```\n",
};

const CALL = {
  provider: "deepseek",
  at: NOW - 60_000,
  inputTokens: 1200,
  outputTokens: 300,
};

/** 一条建议的详情：两个任务的证据，第一个任务的检查被模型引用。 */
export function detailOf(view: ItemView): DetailView {
  const drafted = view.state === "ready" || view.state === "written";
  return {
    item: view,
    episodes: [
      {
        ref: "E1",
        episodeId: "s2:8",
        sessionId: "s2",
        at: NOW - 60_000,
        cwd: "~/work/widget",
        goal: "Release another patch",
        outcome: "verified",
        reads: 2,
        ops: [
          {
            ref: "E1.20",
            kind: "exec",
            label: "npm test",
            ok: true,
            exit: null,
            error: null,
            role: "verify",
            cited: true,
          },
          {
            ref: "E1.28",
            kind: "exec",
            label: "npm version patch --no-git-tag-version",
            ok: true,
            exit: null,
            error: null,
            role: null,
            cited: true,
          },
        ],
        reply: "Released.",
        steering: ["Use a patch bump, not minor"],
        followup: null,
      },
      {
        ref: "E2",
        episodeId: "s1:8",
        sessionId: "s1",
        at: NOW - 3_600_000,
        cwd: "~/work/widget",
        goal: "Release a patch version",
        outcome: "verified",
        reads: 0,
        ops: [
          {
            ref: "E2.20",
            kind: "exec",
            label: "npm run build",
            ok: false,
            exit: 1,
            error: "Error: Cannot find build config",
            role: "failure",
            cited: false,
          },
        ],
        reply: null,
        steering: [],
        followup: null,
      },
    ],
    summary: view.decision === null ? null : { ...CALL, model: "deepseek-flash" },
    draftCall: drafted ? { ...CALL, model: "deepseek-pro" } : null,
    draft: drafted && view.decision === "suggest_create" ? DRAFT : null,
    section:
      drafted && view.decision === "suggest_improve"
        ? "## Pitfalls\n\n- Run npm test first."
        : null,
  };
}

export const CREATE_PREVIEW: PreviewView = {
  kind: "create",
  scope: "project",
  path: "~/work/widget/.agents/skills/local-patch-release/SKILL.md",
  content: "---\nname: local-patch-release\n---\n# Cut a local patch release\n",
  exists: false,
};

/** 记录提交的操作；`answer` 决定 Host 的回应，`gate` 不为 null 时读取收件箱要等它兑现。 */
export interface FakeHost {
  readonly actions: Action[];
  inbox: InboxView;
  answer: (action: Action) => ActionResult;
  gate: Promise<void> | null;
  readonly store: InboxStore;
}

export function fakeHost(inbox: InboxView): FakeHost {
  const host: FakeHost = {
    actions: [],
    inbox,
    gate: null,
    answer: (action) =>
      action.action === "preview"
        ? { ok: true, inbox: host.inbox, preview: CREATE_PREVIEW }
        : { ok: true, inbox: host.inbox },
    store: createInboxStore({
      fetchInbox: async () => {
        await host.gate;
        return host.inbox;
      },
      postAction: async (action) => {
        host.actions.push(action);
        return host.answer(action);
      },
    }),
  };
  return host;
}

/** 挂载到 document.body 并等首次读取完成，返回容器与卸载函数。 */
export async function mount(
  node: ReactNode,
): Promise<{ readonly container: HTMLElement; readonly unmount: () => void }> {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** 等待挂起的 Promise 与随后的渲染。 */
export async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 点击一个元素并等待随后的渲染。 */
export async function click(element: Element | null | undefined): Promise<void> {
  if (!(element instanceof HTMLElement)) throw new Error("没有可点击的元素");
  await act(async () => {
    element.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 像用户输入一样替换输入框的值，并等待随后的渲染。 */
export async function type(
  element: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
): Promise<void> {
  if (element === null) throw new Error("没有输入框");
  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 在元素上按一个键并等待随后的渲染。 */
export async function press(element: Element | null | undefined, key: string): Promise<void> {
  if (element === null || element === undefined) throw new Error("没有可按键的元素");
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 按可访问名称找按钮。 */
export function button(name: string | RegExp, root: ParentNode = document): HTMLButtonElement {
  const found = [...root.querySelectorAll("button")].find((element) => {
    const label = element.getAttribute("aria-label") ?? element.textContent ?? "";
    return typeof name === "string" ? label === name : name.test(label);
  });
  if (found === undefined) throw new Error(`没有按钮 ${String(name)}`);
  return found;
}
