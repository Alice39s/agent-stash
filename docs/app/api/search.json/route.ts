import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

// 两种语言共用一个搜索库；Unicode 分词已覆盖中文，不需要另配分词器。
export const dynamic = "force-static";
export const { staticGET: GET } = createFromSource(source);
