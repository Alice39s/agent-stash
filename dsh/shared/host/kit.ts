import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "pathe";
import * as v from "valibot";

/** 插件管理器一次变更的结果里本插件读取的字段。 */
export interface DshChangeResult {
  readonly application: string;
  readonly error?: { readonly code: string };
}

/** 插件管理器里本插件用到的部分。 */
export interface DshPluginManager {
  listBundles(): Promise<
    readonly { readonly name: string; readonly enabled: boolean; readonly installed: boolean }[]
  >;
  setBundleEnabled(name: string, enabled: boolean): Promise<DshChangeResult>;
  installBundle(spec: string): Promise<DshChangeResult>;
}

/** 注入插件管理器后的上下文。 */
export interface DshManagerContext {
  readonly pluginManager: DshPluginManager;
}

/** Agent Stash 框架的 npm 包名：插件管理器按它列出组合包，也按它从 npm 安装。 */
export const STASH_KIT = "@agent-stash/dsh-stash-kit";

const PackageNameSchema = v.object({ name: v.string() });

/**
 * 框架的安装地址。插件包从本地仓库目录安装时（`dsh/recall/dist/index.js`），
 * 同一仓库里的 `dsh/kit` 目录就在旁边，直接装它；其余情况从 npm 安装。
 */
export function stashKitSpec(hostFile: string): string {
  const sibling = join(dirname(dirname(dirname(hostFile))), "kit");
  const manifest = join(sibling, "package.json");
  if (!existsSync(manifest)) return STASH_KIT;
  const { name } = v.parse(PackageNameSchema, JSON.parse(readFileSync(manifest, "utf8")));
  return name === STASH_KIT ? sibling : STASH_KIT;
}

function check(result: DshChangeResult, plugin: string, action: string): void {
  if (result.application === "failed") {
    throw new Error(
      `${plugin}: ${action} the ${STASH_KIT} bundle failed (${result.error?.code ?? "unknown"})`,
    );
  }
}

/**
 * 确保框架组合包已安装并在 profile 里启用。DSH 只启用用户直接安装的那个组合包，
 * 本插件的界面依赖框架提供的服务，所以框架缺失时这里替用户安装，停用时替用户启用。
 * 返回实际执行的动作，便于测试与诊断。
 */
export async function ensureStashKit(
  manager: DshPluginManager,
  plugin: string,
  spec: string,
): Promise<"present" | "enabled" | "installed"> {
  const kit = (await manager.listBundles()).find((bundle) => bundle.name === STASH_KIT);
  if (kit?.enabled === true) return "present";
  if (kit?.installed !== true) {
    const installed = await manager.installBundle(spec);
    // 另一个 Agent Stash 插件可能刚刚装好了框架。
    if (installed.error?.code !== "already-installed") {
      check(installed, plugin, "installing");
      return "installed";
    }
  }
  check(await manager.setBundleEnabled(STASH_KIT, true), plugin, "enabling");
  return "enabled";
}

/** 能按需注入插件管理器的 Host 上下文。 */
export interface DshKitHost {
  /** 依赖的服务全部就绪时运行 `apply`。 */
  inject(deps: readonly ["pluginManager"], apply: (ctx: DshManagerContext) => void): unknown;
}

/**
 * 插件管理器可用时在后台确保框架可用。失败只记录：本插件的 Host 路由照常工作，
 * 浏览器半部停在等待 `stashKit` 服务，用户手动安装框架后即恢复。
 */
export function requireStashKit(ctx: DshKitHost, plugin: string, hostFile: string): void {
  ctx.inject(["pluginManager"], (inner) => {
    ensureStashKit(inner.pluginManager, plugin, stashKitSpec(hostFile)).catch((error: unknown) => {
      console.error(`[${plugin}] the ${STASH_KIT} bundle is not available:`, error);
    });
  });
}
