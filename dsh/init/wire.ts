import * as v from "valibot";

/** 路由前缀，与插件名相同。Host 注册 `/agent-stash-init/…`，浏览器按文档相对路径请求。 */
const ROUTE_PREFIX = "agent-stash-init";
/** `GET`：列出预设。 */
export const PRESETS_PATH = `${ROUTE_PREFIX}/presets`;
/** `POST`：把 `/init [预设] [额外指令]` 排进会话。 */
export const RUN_PATH = `${ROUTE_PREFIX}/run`;

export const PresetListSchema = v.object({
  defaultPreset: v.string(),
  /** 内置预设在前，自定义预设在后。 */
  presets: v.array(v.object({ name: v.string(), title: v.string(), custom: v.boolean() })),
});
export type PresetList = v.InferOutput<typeof PresetListSchema>;

export const RunRequestSchema = v.object({
  session: v.pipe(v.string(), v.nonEmpty()),
  /** 指令名之后的参数：`[预设] [额外指令]`，可以为空。 */
  input: v.string(),
});
export type RunRequest = v.InferOutput<typeof RunRequestSchema>;

export const RunResultSchema = v.object({ preset: v.string() });
export type RunResult = v.InferOutput<typeof RunResultSchema>;
