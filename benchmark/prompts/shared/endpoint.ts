import type { TaskRunContext } from "vieval/config";
import { openaiFromRunContext } from "vieval/plugins/chat-models";
import type { ChatEndpoint } from "./chat.ts";
import { MODELS } from "./models.ts";

/** 矩阵里选中的模型 id 对应的接口：地址与密钥取自 `vieval.config.ts` 注册的模型，附加字段取自模型表。 */
export function endpointOf(context: Pick<TaskRunContext, "models">, id: string): ChatEndpoint {
  const registered = context.models.find((model) => model.id === id);
  const bench = MODELS.find((model) => model.id === id);
  if (registered === undefined || bench === undefined) {
    throw new Error(`model "${id}" is not registered in vieval.config.ts`);
  }
  const runtime = openaiFromRunContext(registered);
  if (runtime.baseURL === undefined) throw new Error(`model "${id}" has no base URL`);
  return {
    baseURL: runtime.baseURL,
    apiKey: runtime.apiKey,
    model: runtime.model,
    body: bench.body,
  };
}
