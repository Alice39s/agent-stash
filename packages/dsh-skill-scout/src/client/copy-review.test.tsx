// @vitest-environment happy-dom
/**
 * design.md 第 8 章检查 6：两种语言下，各界面上看得到的文字与读屏名称都不等于字典键，也没有留下
 * 没替换的 `{name}` 参数。翻译函数照宿主 `locale.bind` 的行为：找不到键时原样返回键。
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ItemView } from "../shared.ts";
import { InboxEntry } from "./inbox.tsx";
import { SCOUT_DICTIONARIES, type ScoutTranslate } from "./locale.ts";
import { HistoryPage } from "./page.tsx";
import { SessionTab } from "./session.tsx";
import {
  click,
  detailOf,
  fakeHost,
  inboxOf,
  item,
  mount,
  NOW,
  perform,
  progress,
  settle,
  UNSUMMARIZED,
  type FakeHost,
} from "./testing.tsx";

const KEYS: ReadonlySet<string> = new Set(Object.keys(SCOUT_DICTIONARIES.en));
const ATTRIBUTES = ["aria-label", "title", "placeholder", "data-tooltip"] as const;
let unmounts: (() => void)[] = [];

/** 与宿主相同：缺键时返回键本身，缺参数时保留 `{name}`。 */
function hostTranslator(locale: "en" | "zh"): ScoutTranslate {
  const dictionary: Readonly<Record<string, string>> = SCOUT_DICTIONARIES[locale];
  return (key, params = {}) => {
    const text = dictionary[key];
    if (text === undefined) return key;
    return text.replaceAll(/\{(\w+)\}/gu, (match, name: string) => {
      const value = params[name];
      return value === undefined ? match : String(value);
    });
  };
}

/** 页面上全部可见文字与读屏名称。 */
function visibleCopy(): string[] {
  const copy: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? "";
    if (text !== "") copy.push(text);
  }
  for (const element of document.body.querySelectorAll("*")) {
    for (const attribute of ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value !== null && value.trim() !== "") copy.push(value.trim());
    }
  }
  return copy;
}

function problems(): string[] {
  return visibleCopy().filter((text) => KEYS.has(text) || /\{\w+\}/u.test(text));
}

/** 各种状态的卡片：可以保存的草稿（同一线索两个 idea）、摘要、尚未摘要、进行中、失败、已保存、已忽略。 */
function items(): ItemView[] {
  return [
    item({ ideaCount: 2 }),
    item({ id: "repeated:1~1", state: "proposed", ideaCount: 2, title: "Publish the docs" }),
    item({ ...UNSUMMARIZED, id: "recovery:2", kind: "recovery" }),
    item({ ...UNSUMMARIZED, id: "complex:3", state: "summarizing", progress: progress() }),
    item({
      ...UNSUMMARIZED,
      id: "session:s1",
      kind: "session",
      state: "failed",
      failure: { stage: "summary", kind: "timeout", message: "timed out", at: NOW, attempts: 1 },
    }),
    item({ id: "selected:ab~0", kind: "selected", state: "written", title: "Bump deps" }),
    item({ id: "repeated:9~0", state: "dismissed", title: "Old" }),
  ];
}

function host(): FakeHost {
  const fake = fakeHost(inboxOf(items(), { working: 1 }));
  fake.detail = (entry) => ({
    ...detailOf(entry),
    siblings:
      entry.leadId === "repeated:1"
        ? [
            { id: "repeated:1~0", title: "Cut a local patch release", state: "ready" },
            { id: "repeated:1~1", title: "Publish the docs", state: "proposed" },
          ]
        : detailOf(entry).siblings,
  });
  return fake;
}

async function show(node: Parameters<typeof mount>[0]): Promise<void> {
  const mounted = await mount(node);
  unmounts.push(mounted.unmount);
  await settle();
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe.each(["en", "zh"] as const)("design review check 6 in %s", (locale) => {
  const t = hostTranslator(locale);

  test.each(items().map((entry) => entry.id))(
    "shows no dictionary key in the suggestions section with %s open",
    async (id) => {
      const fake = host();
      fake.face.page.update({ selected: id });
      await show(<HistoryPage {...fake.face} t={t} />);
      expect(document.querySelector("section[data-state][aria-label]")).not.toBeNull();
      expect(problems()).toEqual([]);
    },
  );

  test("shows no dictionary key in the notices, the search section, and the stats section", async () => {
    const fake = host();
    await show(<HistoryPage {...fake.face} t={t} />);
    await perform(async () => {
      await fake.store.act(
        { action: "dismiss", id: "recovery:2", similar: false },
        {
          key: "notice.dismissed",
          params: {},
          undo: { action: "restore", id: "recovery:2" },
          view: null,
        },
      );
    });
    expect(document.querySelector("[data-notice=result]")).not.toBeNull();
    expect(problems()).toEqual([]);
    await perform(() =>
      fake.face.page.update({ tab: "search", query: "npm test", picked: ["s1:8"] }),
    );
    await settle();
    await settle();
    expect(document.querySelectorAll("[data-episode]").length).toBeGreaterThan(0);
    expect(problems()).toEqual([]);
    await perform(() => fake.face.page.update({ tab: "stats" }));
    await settle();
    expect(problems()).toEqual([]);
  });

  test("shows no dictionary key in the inbox panel and the conversation view", async () => {
    const fake = host();
    await show(<InboxEntry {...fake.face} t={t} />);
    await click(document.querySelector("[aria-haspopup=dialog]"));
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
    expect(problems()).toEqual([]);
    await show(<SessionTab {...fake.face} sessionId="s1" t={t} />);
    expect(problems()).toEqual([]);
  });
});
