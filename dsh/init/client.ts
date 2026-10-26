import { IconListPenOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import * as v from "valibot";
import { getJson, postJson } from "../shared/client/fetch.ts";
import { installDictionaries } from "../shared/client/resources.ts";
import { en, zh, type InitKey } from "./locales.ts";
import {
  PRESETS_PATH,
  PresetListSchema,
  RUN_PATH,
  RunResultSchema,
  type PresetList,
} from "./wire.ts";

/** 词典命名空间，与 Host 半部的插件名相同。 */
const NS = "agent-stash-init";
/** `/` 菜单里的指令名。 */
const COMMAND = "init";
const TOKEN = `/${COMMAND}`;
/** 草稿以 `/init` 加空白开头，后面才是参数。 */
const WITH_ARGUMENTS = /^\/init\s/u;

/** 指令界面交给贡献与触发源的会话投影。 */
export interface CommandSession {
  readonly sessionId: string;
}

/** 预设弹层的一行。 */
export interface PresetOption {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  /** 默认预设：行尾打勾，弹层打开时高亮停在这一行。 */
  readonly active?: boolean;
  readonly group?: { readonly name: string; readonly label: string };
}

/** `commandUi.register` 接受的弹层指令。 */
export interface InitContribution {
  readonly name: string;
  readonly label: () => string;
  readonly description: () => string;
  readonly icon: (props: { size?: number }) => ReactNode;
  readonly available: (session: CommandSession) => boolean;
  readonly ui: {
    readonly kind: "popupSelect";
    readonly searchLabels: () => { placeholder: string; empty: string; noResults: string };
    readonly options: (session: CommandSession, signal: AbortSignal) => Promise<PresetOption[]>;
    readonly onSelect: (option: PresetOption, session: CommandSession) => Promise<void>;
  };
}

/** 认领草稿开头的 `/init `：之后输入的文字是参数，回车时交给 `submit`。 */
export interface InitClaim {
  readonly name: string;
  readonly token: string;
  readonly hint: string;
  readonly submit: (args: string) => Promise<{ readonly kind: "success" }>;
}

/** `inputTriggers.registerSource` 接受的 `/` 触发源。本插件只认领带参数的 `/init`，不往菜单里加行。 */
export interface InitTriggerSource {
  readonly trigger: "/";
  readonly name: string;
  readonly showGroupTitle: false;
  readonly order: number;
  readonly candidates: () => Promise<readonly never[]>;
  readonly matchSpace: (
    session: CommandSession,
    token: string,
  ) => { readonly claim: InitClaim } | undefined;
  readonly matchEnter: (
    session: CommandSession,
    line: string,
  ) => Promise<{ readonly claim: InitClaim } | undefined>;
  readonly matchClaim: (session: CommandSession, token: string) => Promise<InitClaim | undefined>;
}

/** Client 根上下文里本插件用到的服务。 */
export interface InitClientContext {
  readonly commandUi: { register(contribution: InitContribution): () => void };
  readonly inputTriggers: { registerSource(source: InitTriggerSource): () => void };
  /** 子代理会话的地址；普通会话为 `undefined`。 */
  readonly sessions: { subagentAddress(sessionId: string): unknown };
  readonly locale: {
    register(ns: string, locale: string, dict: Readonly<Record<string, string>>): () => void;
    bind(ns: string): (key: string) => string;
  };
  effect(execute: () => () => void, label?: string): void;
}

type Translate = (key: InitKey) => string;
type Availability = (session: CommandSession) => boolean;

/** 请求失败时换成带本地化前缀的错误：弹层与输入框的出错提示直接显示 message。 */
async function explained<T>(prefix: string, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${prefix}${reason}`, { cause: error });
  }
}

function fetchPresets(t: Translate, signal: AbortSignal): Promise<PresetList> {
  return explained(t("presetsFailed"), async () =>
    v.parse(PresetListSchema, await getJson(PRESETS_PATH, signal)),
  );
}

/** 在会话里执行 `/init [预设] [额外指令]`，返回 Host 选中的预设名。 */
function runInit(t: Translate, sessionId: string, input: string): Promise<string> {
  return explained(t("runFailed"), async () => {
    const result = await postJson(RUN_PATH, { session: sessionId, input });
    return v.parse(RunResultSchema, result).preset;
  });
}

/**
 * 弹层的行：标题为预设的显示名。内置预设以预设名作补充，方便记住后直接输入；
 * 自定义预设以 `init.json` 里的说明作补充。默认预设打勾，自定义预设归入单独一组。
 */
export function presetOptions(list: PresetList, customGroup: string): PresetOption[] {
  return list.presets.map((preset) => {
    const detail = preset.custom ? preset.description : preset.name;
    return {
      id: preset.name,
      label: preset.title,
      ...(detail === undefined || detail === preset.title ? {} : { detail }),
      ...(preset.name === list.defaultPreset ? { active: true } : {}),
      ...(preset.custom ? { group: { name: "custom", label: customGroup } } : {}),
    };
  });
}

/** `/` 菜单里的「初始化」：选中后打开预设弹层，选一个预设即执行。 */
export function initContribution(t: Translate, available: Availability): InitContribution {
  return {
    name: COMMAND,
    label: () => t("label"),
    description: () => t("description"),
    icon: IconListPenOutlineRegular,
    available,
    ui: {
      kind: "popupSelect",
      searchLabels: () => ({
        placeholder: t("searchPlaceholder"),
        empty: t("searchEmpty"),
        noResults: t("searchNoResults"),
      }),
      options: async (_session, signal) =>
        presetOptions(await fetchPresets(t, signal), t("customGroup")),
      onSelect: async (option, session) => {
        await runInit(t, session.sessionId, option.id);
      },
    },
  };
}

/**
 * 带参数的 `/init`：在 `/init` 后按空格会认领成指令块，粘贴整行后回车也会认领；参数交给 Host 解析。
 * 不带参数的 `/init` 由指令界面打开预设弹层，这里不认领。
 */
export function initSource(available: Availability, t: Translate): InitTriggerSource {
  const claimFor = (session: CommandSession): InitClaim | undefined =>
    available(session)
      ? {
          name: COMMAND,
          token: `${TOKEN} `,
          hint: t("hint"),
          submit: async (args) => {
            await runInit(t, session.sessionId, args);
            return { kind: "success" };
          },
        }
      : undefined;
  const claimed = (session: CommandSession): { readonly claim: InitClaim } | undefined => {
    const claim = claimFor(session);
    return claim === undefined ? undefined : { claim };
  };
  return {
    trigger: "/",
    name: NS,
    showGroupTitle: false,
    order: 100,
    candidates: () => Promise.resolve([]),
    matchSpace: (session, token) => (token === TOKEN ? claimed(session) : undefined),
    matchEnter: (session, line) =>
      Promise.resolve(WITH_ARGUMENTS.test(line) ? claimed(session) : undefined),
    matchClaim: (session, token) =>
      Promise.resolve(token === TOKEN ? claimFor(session) : undefined),
  };
}

export const inject = ["commandUi", "inputTriggers", "sessions", "locale"];

/** 注册词典、`/` 菜单里的 `/init` 指令与它的参数认领；子代理会话里不提供。 */
export function apply(ctx: InitClientContext): void {
  installDictionaries(ctx, NS, { en, zh });
  const t: Translate = ctx.locale.bind(NS);
  const available: Availability = (session) =>
    ctx.sessions.subagentAddress(session.sessionId) === undefined;
  ctx.effect(() => ctx.commandUi.register(initContribution(t, available)), `${NS}: /init command`);
  ctx.effect(
    () => ctx.inputTriggers.registerSource(initSource(available, t)),
    `${NS}: /init arguments`,
  );
}
