import { defineConfig, requiredEnvFrom } from "vieval";
import { ChatModels, chatModelFrom } from "vieval/plugins/chat-models";
import { PROVIDERS, providerBaseURL, type BenchModel } from "./shared/models.ts";
import { benchSettings, loadBenchEnv } from "./shared/settings.ts";

const env = loadBenchEnv();
const { rewriters, judges, concurrency } = benchSettings(env);

/** 只注册选中的模型，没用到的服务不需要 API Key。 */
const registered = [
  ...new Map([...rewriters, ...judges].map((model) => [model.id, model])).values(),
];

function chatModel(model: BenchModel) {
  const provider = PROVIDERS[model.provider];
  return chatModelFrom({
    id: model.id,
    aliases: [],
    inferenceExecutor: "openai",
    model: model.model,
    apiKey: (config) => requiredEnvFrom(config.env, { name: provider.apiKeyEnv, type: "string" }),
    baseURL: (config) => providerBaseURL(provider, config.env),
  });
}

export default defineConfig({
  env,
  plugins: [ChatModels({ models: registered.map(chatModel) })],
  projects: [
    {
      name: "enhance",
      root: "enhance",
      include: ["evals/*.eval.ts"],
      runMatrix: { extend: { model: rewriters.map((model) => model.id) } },
      evalMatrix: { extend: { judge: judges.map((model) => model.id) } },
    },
  ],
  scheduler: { concurrency: { case: concurrency } },
});
