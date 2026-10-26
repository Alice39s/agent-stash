import { act, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { apply } from "./client.tsx";
import type {
  ConfigFormSnapshotView,
  ConfigFormView,
  ConfigPathOp,
  KitClientContext,
  RowConfigProps,
} from "./dsh.ts";
import type { StashKit } from "./service.ts";

type ConfigValue = Readonly<Record<string, boolean | string>>;

/** 组件测试用的设置服务：框架条目的配置，写入按 `accept` 决定是否被接受。 */
export interface SettingsHarness {
  readonly form: ConfigFormView;
  /** 收到的每次写入。 */
  readonly writes: (readonly ConfigPathOp[])[];
  /** 之后的写入是否被 Host 接受。 */
  accept: boolean;
  /** 模拟 Host 推送新的配置值。 */
  publish(value: ConfigValue): Promise<void>;
}

/** 以 `value` 为当前配置创建设置服务。 */
export function createSettings(value: ConfigValue, writable = true): SettingsHarness {
  let values = value;
  let snapshot: ConfigFormSnapshotView = {
    status: "ready",
    value,
    user: undefined,
    revision: 1,
    writable,
  };
  const listeners = new Set<() => void>();
  const replace = (next: ConfigValue): void => {
    values = next;
    snapshot = { ...snapshot, value: next, revision: (snapshot.revision ?? 0) + 1 };
    for (const listener of listeners) listener();
  };
  const harness: SettingsHarness = {
    writes: [],
    accept: true,
    form: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      mutate: async (ops, expectedRevision) => {
        harness.writes.push(ops);
        if (!harness.accept || expectedRevision !== snapshot.revision) return false;
        const next: Record<string, boolean | string> = { ...values };
        for (const op of ops) {
          const field = op.path.join(".");
          if (op.op === "set") next[field] = op.value;
          else delete next[field];
        }
        replace(next);
        return true;
      },
    },
    async publish(next) {
      await act(async () => replace(next));
    },
  };
  return harness;
}

/** 按框架的 `apply` 流程挂载的 `stashKit` 服务。 */
export interface KitHarness {
  readonly kit: StashKit;
  /** 框架注册的英文词典。 */
  readonly english: Readonly<Record<string, string>>;
  /** 像插件页那样渲染框架条目的配置页，返回它的容器。 */
  openSettings(): Promise<HTMLElement>;
  dispose(): void;
}

/** 运行框架的 `apply`；传入 `settings` 时设置服务可用。 */
export function mountKit(settings?: SettingsHarness): KitHarness {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  let provided: StashKit | undefined;
  let page: ComponentType<RowConfigProps<string>> | undefined;
  let english: Readonly<Record<string, string>> = {};
  const disposers: (() => void)[] = [];
  const ctx: KitClientContext = {
    slots: {
      inject: (_key, callback) => callback(),
      register(_options, component) {
        page = component;
        return () => {};
      },
    },
    locale: {
      register(_ns, locale, dict) {
        if (locale === "en") english = dict;
        return () => {};
      },
    },
    effect(execute) {
      disposers.push(execute());
    },
    inject(_deps, applyInner) {
      if (settings === undefined) return undefined;
      applyInner({ ...ctx, configForms: { get: () => settings.form } });
      return undefined;
    },
    provide(_name, value) {
      provided = value;
    },
  };
  apply(ctx);
  if (provided === undefined) throw new Error("the kit provided no stashKit service");
  const roots: Root[] = [];
  const hosts: HTMLElement[] = [];
  const t = (key: string): string => english[key] ?? key;
  return {
    kit: provided,
    english,
    async openSettings() {
      const Page = page;
      if (Page === undefined || settings === undefined) {
        throw new Error("the kit registered no settings page or the settings service is off");
      }
      const { form } = settings;
      const Bound = (): ReactNode => {
        const snapshot = useSyncExternalStore(form.subscribe, form.getSnapshot);
        return <Page view="page" form={{ state: snapshot, mutate: form.mutate }} t={t} />;
      };
      const host = document.createElement("div");
      document.body.append(host);
      hosts.push(host);
      const root = createRoot(host);
      roots.push(root);
      await act(async () => root.render(<Bound />));
      return host;
    },
    dispose() {
      act(() => {
        for (const root of roots) root.unmount();
      });
      for (const dispose of disposers) dispose();
      for (const host of hosts) host.remove();
    },
  };
}
