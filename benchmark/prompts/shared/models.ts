/** 可以原样放进 JSON 请求体的值。 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * 评测用到的 OpenAI 兼容服务。`apiKeyEnv` 是存放 API Key 的环境变量；接口地址取 `baseURLEnv`
 * 指向的环境变量，没有设置时用 `baseURL`，两者都没有时报错。
 */
export interface Provider {
  readonly apiKeyEnv: string;
  readonly baseURLEnv: string;
  readonly baseURL?: string;
}

export const PROVIDERS = {
  deepseek: {
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseURLEnv: "DEEPSEEK_BASE_URL",
    baseURL: "https://api.deepseek.com/",
  },
  zhipu: {
    apiKeyEnv: "ZHIPU_API_KEY",
    baseURLEnv: "ZHIPU_BASE_URL",
    baseURL: "https://open.bigmodel.cn/api/paas/v4/",
  },
  /** 自建的 OpenAI 兼容网关，地址与密钥都由环境变量给出。 */
  aigw: { apiKeyEnv: "AIGW_API_KEY", baseURLEnv: "AIGW_OPENAI_V1_ENDPOINT" },
} as const satisfies Record<string, Provider>;

export type ProviderId = keyof typeof PROVIDERS;

/**
 * 可以写进评测矩阵的一个模型。`id` 是矩阵与报告里的名称，`label` 是给人看的名称，
 * `model` 是请求服务时用的模型名。`body` 合并进每次请求的请求体，用来指定推理强度这类服务自己的参数。
 */
export interface BenchModel {
  readonly id: string;
  readonly label: string;
  readonly provider: ProviderId;
  readonly model: string;
  readonly body: Readonly<Record<string, JsonValue>>;
}

export const MODELS: readonly BenchModel[] = [
  {
    id: "deepseek-v4.1-flash",
    label: "DeepSeek V4.1 Flash",
    provider: "deepseek",
    model: "deepseek-flash",
    body: {},
  },
  {
    id: "deepseek-v4.1-flash-low",
    label: "DeepSeek V4.1 Flash (low)",
    provider: "deepseek",
    model: "deepseek-flash",
    body: { reasoning_effort: "low" },
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    body: {},
  },
  { id: "glm-5.3", label: "GLM-5.3", provider: "zhipu", model: "glm-5.3", body: {} },
  {
    id: "glm-5.3-flash",
    label: "GLM-5.3-Flash",
    provider: "zhipu",
    model: "glm-5.3-flash",
    body: {},
  },
  {
    id: "glm-5.3-flash-low",
    label: "GLM-5.3-Flash (low)",
    provider: "zhipu",
    model: "glm-5.3-flash",
    body: { reasoning_effort: "low" },
  },
  { id: "glm-5.2", label: "GLM-5.2", provider: "zhipu", model: "glm-5.2", body: {} },
  {
    id: "deepseek-v4.1-flash-aigw",
    label: "DeepSeek V4.1 Flash",
    provider: "aigw",
    model: "deepseek/deepseek-v4.1-flash",
    body: {},
  },
  {
    id: "deepseek-v4-flash-aigw",
    label: "DeepSeek V4 Flash",
    provider: "aigw",
    model: "deepseek/deepseek-v4-flash",
    body: {},
  },
  {
    id: "gpt-6.1-terra",
    label: "GPT-6.1 Terra",
    provider: "aigw",
    model: "gpt-6.1-terra",
    body: {},
  },
  { id: "grok-4.5", label: "Grok 4.5", provider: "aigw", model: "grok-4.5", body: {} },
  { id: "grok-4.6", label: "Grok 4.6", provider: "aigw", model: "grok-4.6", body: {} },
  { id: "grok-4.7", label: "Grok 4.7", provider: "aigw", model: "grok-4.7", body: {} },
];

/** 按逗号分隔的模型 id 取出模型，保持写的顺序；写了不存在的 id 时报错并列出可选的 id。 */
export function selectModels(list: string): BenchModel[] {
  const ids = [...new Set(list.split(",").map((id) => id.trim()))].filter((id) => id !== "");
  if (ids.length === 0) throw new Error("no model selected");
  return ids.map((id) => {
    const model = MODELS.find((candidate) => candidate.id === id);
    if (model === undefined) {
      const known = MODELS.map((candidate) => candidate.id).join(", ");
      throw new Error(`unknown model "${id}" (known: ${known})`);
    }
    return model;
  });
}

/** 一个服务的接口地址：环境变量优先，其次是内置地址。 */
export function providerBaseURL(
  provider: Provider,
  env: Readonly<Record<string, string | undefined>>,
): string {
  const value = env[provider.baseURLEnv] ?? provider.baseURL;
  if (value === undefined || value === "") {
    throw new Error(`${provider.baseURLEnv} is not set`);
  }
  return value;
}
