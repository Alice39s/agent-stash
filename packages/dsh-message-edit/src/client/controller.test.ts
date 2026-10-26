import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createMessageEditController,
  lineageRevision,
  openSession,
  sessionRevision,
} from "./controller.ts";
import type { ClientContext, SessionListState, SessionSnapshot } from "./dsh.ts";
import { createSnapshotStore } from "./store.ts";

function list(rows: Record<string, string | undefined>): SessionListState {
  return {
    ids: Object.keys(rows),
    byId: Object.fromEntries(
      Object.entries(rows).map(([id, parentId]) => [
        id,
        parentId === undefined ? {} : { parentId },
      ]),
    ),
  };
}

function context(overrides: Partial<ClientContext>): ClientContext {
  return {
    slots: { register: () => () => {}, inject: () => () => {} },
    sessions: { list: createSnapshotStore(list({})), binding: () => undefined },
    locale: { register: () => () => {}, bind: () => (key) => key },
    get: () => undefined,
    on: () => () => {},
    effect: () => async () => {},
    ...overrides,
  };
}

const TIMELINE = {
  sessionId: "root",
  messages: [],
  retryableTurns: [],
  versions: [],
  undoStack: [],
  redoSessionIds: [],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("lineageRevision", () => {
  test("covers every session in the version tree and ignores unrelated sessions", () => {
    const state = list({ root: undefined, a: "root", b: "a", other: undefined });
    expect(lineageRevision(state, "b")).toBe("a>root|b>a|root>");
    expect(lineageRevision(state, "other")).toBe("other>");
  });

  test("changes when a new version joins the tree", () => {
    const before = lineageRevision(list({ root: undefined, a: "root" }), "a");
    const after = lineageRevision(list({ root: undefined, a: "root", c: "root" }), "a");
    expect(after).not.toBe(before);
  });

  test("treats a parent missing from the list as the root", () => {
    expect(lineageRevision(list({ a: "gone", b: "a" }), "b")).toBe("a>gone|b>a");
  });
});

test("sessionRevision follows running, open state, and removal", () => {
  const idle = sessionRevision({ running: false, openState: "open", removed: false });
  expect(sessionRevision({ running: true, openState: "open", removed: false })).not.toBe(idle);
  expect(sessionRevision({ running: false, openState: "open", removed: false })).toBe(idle);
});

describe("openSession", () => {
  test("uses sessions.open when the runtime provides it", () => {
    const open = vi.fn<(sessionId: string) => void>();
    openSession(context({ sessions: { ...context({}).sessions, open } }), "child");
    expect(open).toHaveBeenCalledWith("child");
  });

  test("falls through to uiWorkspace.openSession on runtimes without sessions.open", () => {
    const openSessionInWorkspace = vi.fn<(sessionId: string) => void>();
    openSession(context({ get: () => ({ openSession: openSessionInWorkspace }) }), "child");
    expect(openSessionInWorkspace).toHaveBeenCalledWith("child");
  });

  test("throws when neither navigation service exists", () => {
    expect(() => openSession(context({}), "child")).toThrow(/cannot open session child/u);
  });
});

describe("createMessageEditController", () => {
  test("loads on first use and refetches after the open session finishes a turn", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn<() => Promise<Response>>(async () => Response.json(TIMELINE));
    vi.stubGlobal("fetch", fetch);
    const session = createSnapshotStore<SessionSnapshot>({
      running: true,
      openState: "open",
      removed: false,
    });
    const ctx = context({
      sessions: {
        list: createSnapshotStore(list({ root: undefined })),
        binding: () => ({ session }),
      },
      effect: (execute) => {
        const dispose = execute();
        return async () => dispose();
      },
    });
    const { face } = createMessageEditController(ctx, "root");

    const release = face.acquire();
    await vi.waitFor(() => expect(face.hooks.messageEdit.getSnapshot().status).toBe("ready"));
    expect(fetch).toHaveBeenCalledTimes(1);

    session.update((state) => ({ ...state, running: false }));
    await vi.advanceTimersByTimeAsync(300);
    expect(fetch).toHaveBeenCalledTimes(2);

    release();
    session.update((state) => ({ ...state, running: true }));
    await vi.advanceTimersByTimeAsync(300);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("createSnapshotStore", () => {
  test("notifies subscribers only when the snapshot reference changes", () => {
    const store = createSnapshotStore({ count: 0 });
    const listener = vi.fn<() => void>();
    const unsubscribe = store.subscribe(listener);
    store.update((state) => state);
    store.update((state) => ({ count: state.count + 1 }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ count: 1 });
    unsubscribe();
    store.update((state) => ({ count: state.count + 1 }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
