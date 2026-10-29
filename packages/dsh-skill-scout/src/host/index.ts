/**
 * Skill Scout 的 Host 半部：打开插件存储，注册浏览器路由，监听会话的回合结束，
 * 在持有工作锁时于后台分析会话与复核候选。
 */
import { join } from "pathe";
import { currentSettings, type ConfigValue } from "./config.ts";
import type { ScoutContext } from "./dsh.ts";
import { acquireLock, holdsLock } from "./lock.ts";
import { scoutRoutes } from "./route.ts";
import { createScout } from "./scout.ts";
import { recordKey, SCOUT_DOMAIN, storeOf } from "./store.ts";
import { detailView, inboxView } from "./views.ts";
import { dshHome } from "./writer.ts";

export { Config } from "./config.ts";

export const name = "agent-stash-skill-scout";

/** `agentDefaultModel` 不在这里：部署可能没有它，用到时经 `ctx.get` 读取。 */
export const inject = [
  "sessionQuery",
  "llm",
  "sessionSkillCatalog",
  "storageDomain",
  "webServer",
  "connection",
];

/** 后台定时检查：复核是否到期、锁是否可以接管、发现开关是否刚打开。 */
const TICK = 60_000;

export async function apply(ctx: ScoutContext, config: ConfigValue): Promise<void> {
  const settings = () => currentSettings(config);
  await ctx.effect(async function* () {
    const domain = await ctx.storageDomain.open(SCOUT_DOMAIN);
    yield () => domain.close();
    const controller = new AbortController();
    yield () => controller.abort();
    const store = storeOf(domain);
    const scout = createScout({
      query: ctx.sessionQuery,
      llm: ctx.llm,
      skills: ctx.sessionSkillCatalog,
      store,
      settings,
      defaultModel: () => ctx.get("agentDefaultModel")?.currentSelection(),
      logger: ctx.logger,
      now: () => Date.now(),
      signal: controller.signal,
    });
    yield () => scout.dispose();
    const inbox = () => inboxView(store, settings(), scout.route(), scout.runtime(), Date.now());
    const detail = (id: string) => {
      const suggestion = store.suggestions.get(recordKey(id));
      return suggestion === undefined ? undefined : detailView(store, suggestion, scout.runtime());
    };
    for (const route of scoutRoutes({
      scout,
      connection: ctx.connection,
      logger: ctx.logger,
      inbox,
      detail,
    })) {
      yield ctx.webServer.register(route);
    }
    yield ctx.on("session/event", (session, event) => {
      if (event.type === "turn/end" && session.header.origin !== "subagent") {
        scout.noteTurnEnd(session.id);
      }
    });

    const lockPath = join(dshHome(), "skill-scout", "worker.lock");
    let release: (() => Promise<void>) | null = null;
    let discovery = settings().discovery;
    const startBackfill = (): void => {
      scout.backfill().catch((error: unknown) => {
        ctx.logger.warn("skill-scout: reading past sessions failed: %s", String(error));
      });
    };
    const claim = async (): Promise<void> => {
      if (release !== null || controller.signal.aborted) return;
      const acquired = await acquireLock(lockPath);
      if (acquired === null) return;
      // 等锁期间插件已卸载：立即还锁，不再开始工作。
      if (controller.signal.aborted) {
        await acquired();
        return;
      }
      release = acquired;
      scout.setLead(true);
      startBackfill();
    };
    /** 持有锁时确认锁文件仍记着本进程；没有锁时尝试获取。 */
    const keepLock = async (): Promise<void> => {
      if (release === null) return claim();
      if (await holdsLock(lockPath)) return;
      release = null;
      scout.setLead(false);
      ctx.logger.warn("skill-scout: another DSH process took the work lock");
    };
    await claim();
    yield async () => {
      scout.setLead(false);
      await release?.();
    };
    const timer = setInterval(() => {
      const enabled = settings().discovery;
      if (enabled && !discovery && release !== null) startBackfill();
      discovery = enabled;
      keepLock().catch((error: unknown) => {
        ctx.logger.warn("skill-scout: checking the work lock failed: %s", String(error));
      });
      scout.pump();
    }, TICK);
    timer.unref();
    yield () => clearInterval(timer);
  }, "skill-scout: storage, routes, and background analysis");
}
