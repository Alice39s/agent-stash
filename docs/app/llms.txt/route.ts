import { i18n } from "@/lib/i18n";
import { docsLlms } from "@/lib/source";

export const dynamic = "force-static";

/** 两种语言的索引依次排列，每份以页面树的标题开头。 */
export function GET() {
  const body = i18n.languages.map((lang) => docsLlms.index(lang)).join("\n\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
