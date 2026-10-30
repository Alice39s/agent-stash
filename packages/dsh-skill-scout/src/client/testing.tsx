/** 浏览器半部测试共用的翻译函数、收件箱与会话样例、Host 路由替身与挂载工具。 */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type {
  Action,
  ActionResult,
  DetailView,
  InboxView,
  ItemView,
  PreviewView,
  ProgressView,
  SearchView,
  SessionView,
  StatsView,
  StatusView,
  TaskView,
} from "../shared.ts";
import type { SearchQuery } from "./api.ts";
import type { ScoutFace } from "./face.ts";
import { SCOUT_DICTIONARIES, type ScoutTranslate } from "./locale.ts";
import { createPageStore } from "./navigation.ts";
import { createSeenStore } from "./seen.ts";
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
  usage: {
    summaries: 1,
    limit: 6,
    requested: 1,
    inputTokens: 1200,
    cacheReadTokens: 800,
    cacheWriteTokens: 100,
    outputTokens: 300,
  },
  backfill: null,
  lastError: null,
  analyzed: { sessions: 4, episodes: 4 },
};

/** 摘要还没有给出 idea 的线索卡片应有的字段。 */
export const UNSUMMARIZED: Partial<ItemView> = {
  id: "repeated:1",
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

/**
 * 一张卡片；默认是一条线索的第一个 idea，草稿已生成、可以保存的重复流程。
 * 线索 id 与 idea 下标按 `<线索 id>~<下标>` 从 id 推出。
 */
export function item(fields: Partial<ItemView> = {}): ItemView {
  const id = fields.id ?? "repeated:1~0";
  const [leadId = id, index] = id.split("~");
  return {
    id,
    leadId,
    ideaIndex: index === undefined ? null : Number(index),
    ideaCount: index === undefined ? 0 : 1,
    merged: 0,
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
    progress: null,
    ...fields,
  };
}

/** 模型请求的进度；默认是摘要正在写、已收到一半预计字数。 */
export function progress(fields: Partial<ProgressView> = {}): ProgressView {
  return {
    stage: "summary",
    phase: "writing",
    startedAt: NOW - 12_000,
    phaseAt: NOW - 3_000,
    chars: 450,
    expected: 900,
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

/** 一张卡片的详情：两个任务的证据，第一个任务的检查被模型引用；idea 卡片的 siblings 只有它自己。 */
export function detailOf(view: ItemView): DetailView {
  const drafted = view.state === "ready" || view.state === "written";
  return {
    item: view,
    siblings:
      view.ideaIndex === null
        ? []
        : [{ id: view.id, title: view.title ?? view.goal, state: view.state }],
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

/** 一个任务的概要；默认是 s1 里经检查通过的一次发布。 */
export function task(fields: Partial<TaskView> = {}): TaskView {
  return {
    episodeId: "s1:8",
    sessionId: "s1",
    at: NOW - 3_600_000,
    cwd: "~/work/widget",
    goal: "Release a patch version",
    outcome: "verified",
    commands: 3,
    edits: 1,
    recoveries: 0,
    steps: ["npm test", "npm version patch", "git push --tags"],
    matches: [],
    ...fields,
  };
}

/** 会话 s1：已分析，两个任务。 */
export const SESSION: SessionView = {
  sessionId: "s1",
  state: "analyzed",
  scannedAt: NOW - 120_000,
  error: null,
  tasks: [
    task(),
    task({
      episodeId: "s1:12",
      at: NOW - 1_800_000,
      goal: "Fix the build config",
      outcome: "failed",
      commands: 2,
      edits: 2,
      recoveries: 1,
      steps: ["npm run build"],
    }),
  ],
};

/** 搜索「npm test」的命中：三个会话里各一个任务。 */
export const SEARCH_HITS: readonly TaskView[] = [
  task({ matches: ["npm test -- --run", "Error: npm test failed"] }),
  task({
    episodeId: "s2:8",
    sessionId: "s2",
    at: NOW - 60_000,
    goal: "Release another patch",
    matches: ["npm test"],
  }),
  task({
    episodeId: "s3:4",
    sessionId: "s3",
    at: NOW - 86_400_000,
    goal: "Check the tests before publishing",
    outcome: "unverified",
    matches: ["pnpm exec npm test"],
  }),
];

/** 统计样例里近 30 天中有任务或新线索的三天，其余日子各项为 0。 */
const ACTIVE_DAYS: Readonly<Record<string, Partial<Omit<StatsView["daily"][number], "day">>>> = {
  "2026-10-28": { verified: 2, succeeded: 1, failed: 1, leads: 1 },
  "2026-10-29": { verified: 1, unverified: 1, disputed: 1 },
  "2026-10-30": { verified: 3, succeeded: 1, aborted: 1, leads: 2 },
};

/**
 * 统计样例：一个分析失败的会话；近 30 天有三天结束了任务（共 12 个，6 个通过检查）、两天出现新线索；
 * 近 7 天里有两天有用量，两次模型调用。
 */
export const STATS: StatsView = {
  coverage: {
    analyzed: 40,
    inRange: 48,
    total: 120,
    backfilled: 12,
    failed: [{ sessionId: "s9", message: "日志无法解析", at: NOW - 600_000 }],
  },
  funnel: {
    leads: { detected: 2, summarized: 6, skipped: 2, failed: 1, dismissed: 1 },
    ideas: { proposed: 3, ready: 1, failed: 1, written: 2, dismissed: 1 },
  },
  actions: [
    { key: "pm run build", label: "pnpm build", sessions: 9, weeks: [0, 1, 3, 2, 1, 0, 1, 1] },
    { key: "vitest", label: "vitest run", sessions: 6, weeks: [0, 0, 1, 1, 2, 0, 1, 1] },
  ],
  errors: [
    {
      signature: "Cannot find module <path>",
      example: "Cannot find module 'vite'",
      sessions: 3,
    },
  ],
  daily: Array.from({ length: 30 }, (_, index) => {
    const day = new Date(NOW - (29 - index) * 86_400_000).toISOString().slice(0, 10);
    return {
      day,
      verified: 0,
      succeeded: 0,
      unverified: 0,
      disputed: 0,
      failed: 0,
      aborted: 0,
      leads: 0,
      ...ACTIVE_DAYS[day],
    };
  }),
  usage: [
    "2026-10-24",
    "2026-10-25",
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
  ].map((day, index) => ({
    day,
    summaries: index === 6 ? 2 : 0,
    requested: index >= 5 ? 1 : 0,
    failures: index === 6 ? 1 : 0,
    inputTokens: index >= 5 ? 1200 : 0,
    cacheReadTokens: index >= 5 ? 3400 : 0,
    cacheWriteTokens: index >= 5 ? 600 : 0,
    outputTokens: index >= 5 ? 500 : 0,
  })),
  calls: [
    {
      at: NOW - 60_000,
      stage: "draft",
      itemId: "repeated:1~0",
      title: "Cut a local patch release",
      provider: "deepseek",
      model: "deepseek-pro",
      durationMs: 42_000,
      inputTokens: 1200,
      cacheReadTokens: 3400,
      cacheWriteTokens: 600,
      outputTokens: 500,
      result: "drafted",
      detail: null,
    },
    {
      at: NOW - 600_000,
      stage: "summary",
      itemId: "complex:3",
      title: "Migrate the config format",
      provider: "deepseek",
      model: "deepseek-flash",
      durationMs: 8_000,
      inputTokens: 900,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 120,
      result: "skipped",
      detail: "A one-off migration",
    },
  ],
};

/**
 * Host 路由的替身：记录提交的操作与搜索条件。`answer` 决定操作的回应，`gate` 不为 null 时读取收件箱要等它兑现；
 * `face` 是注入到各个 Slot 组件的共享对象，打开页面与会话只记次数。
 */
export interface FakeHost {
  readonly actions: Action[];
  inbox: InboxView;
  answer: (action: Action) => ActionResult;
  gate: Promise<void> | null;
  readonly store: InboxStore;
  detail: (view: ItemView) => DetailView;
  session: SessionView;
  readonly queries: SearchQuery[];
  answerSearch: (query: SearchQuery) => SearchView;
  stats: StatsView;
  readonly sessionsOpened: string[];
  pagesOpened: number;
  readonly face: ScoutFace;
}

export function fakeHost(inbox: InboxView): FakeHost {
  const store = createInboxStore({
    fetchInbox: async () => {
      await host.gate;
      return host.inbox;
    },
    postAction: async (action) => {
      host.actions.push(action);
      return host.answer(action);
    },
  });
  const host: FakeHost = {
    actions: [],
    inbox,
    gate: null,
    answer: (action) =>
      action.action === "preview"
        ? { ok: true, inbox: host.inbox, preview: CREATE_PREVIEW }
        : { ok: true, inbox: host.inbox },
    store,
    detail: detailOf,
    session: SESSION,
    queries: [],
    answerSearch: (query) => ({
      query: query.q,
      total: SEARCH_HITS.length,
      hits: [...SEARCH_HITS],
      indexed: { sessions: 4, episodes: 4 },
    }),
    stats: STATS,
    sessionsOpened: [],
    pagesOpened: 0,
    face: {
      inbox: store,
      page: createPageStore(),
      seen: createSeenStore(window.localStorage),
      loadDetail: async (id) => {
        const found = host.inbox.items.find((entry) => entry.id === id);
        if (found === undefined) throw new Error(`no item ${id}`);
        return host.detail(found);
      },
      loadSession: async () => host.session,
      search: async (query) => {
        host.queries.push(query);
        return host.answerSearch(query);
      },
      loadStats: async () => host.stats,
      openSession: (sessionId) => host.sessionsOpened.push(sessionId),
      openPage: () => {
        host.pagesOpened += 1;
      },
    },
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

/** 让真实计时器走一段时间，并等待随后的渲染。 */
export async function wait(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** 像用户选择一样改变下拉框的值，并等待随后的渲染。 */
export async function choose(element: HTMLSelectElement | null, value: string): Promise<void> {
  if (element === null) throw new Error("没有下拉框");
  await act(async () => {
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 在 act 里改动 store（读取收件箱、切换页面位置），并等待随后的渲染。 */
export async function perform(change: () => void | Promise<void>): Promise<void> {
  await act(async () => {
    await change();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
