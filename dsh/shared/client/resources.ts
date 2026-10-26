import type { DshClientContext } from "./dsh.ts";

/** 注册中英文词典，卸载时移除。 */
export function installDictionaries(
  ctx: DshClientContext,
  ns: string,
  dictionaries: Readonly<Record<"en" | "zh", Readonly<Record<string, string>>>>,
): void {
  for (const [locale, dict] of Object.entries(dictionaries)) {
    ctx.effect(() => ctx.locale.register(ns, locale, dict), `${ns}: ${locale} dictionary`);
  }
}
