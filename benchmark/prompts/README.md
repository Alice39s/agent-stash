# 提示词评测

用 [vieval](https://github.com/vieval-dev/vieval) 评测 Agent Stash 插件发给模型的提示词。目前评测 `@agent-stash/dsh-enhance` 的三个内置预设：每个用例调用插件自己的 `buildPrompt` 与 `runRewrite`，系统提示、上下文挑选、占位符和结果检查都与插件运行时相同，再由规则和评审模型给结果打分。

## 目录

| 路径                            | 内容                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `vieval.config.ts`              | 读取环境变量，注册选中的模型，定义评测矩阵：run 轴 `model` 是改写模型，eval 轴 `judge` 是评审模型 |
| `shared/models.ts`              | 可用的模型 id、所属服务与附加的请求参数                                                           |
| `shared/chat.ts`                | 向 OpenAI 兼容接口发一次单轮请求                                                                  |
| `enhance/cases/*.yaml`          | 黄金集，按类别分文件                                                                              |
| `enhance/src/`                  | 用例读取与校验、规则检查、评审提示词，以及把接口包成插件调用模型用的 `LlmView`                    |
| `enhance/evals/rewrite.eval.ts` | 评测任务：每个预设一个 task，每个用例一个 case                                                    |

## 运行

在本目录设置环境变量，或写进 `.env.local`（已被 Git 忽略）：

| 变量                       | 用途                                                                            | 默认                                    |
| -------------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| `DEEPSEEK_API_KEY`         | DeepSeek 官方接口的 API Key                                                     |                                         |
| `DEEPSEEK_BASE_URL`        | DeepSeek 接口地址                                                               | `https://api.deepseek.com/`             |
| `ZHIPU_API_KEY`            | 智谱 GLM 的 API Key                                                             |                                         |
| `ZHIPU_BASE_URL`           | 智谱接口地址，GLM Coding Plan 用 `https://open.bigmodel.cn/api/coding/paas/v4/` | `https://open.bigmodel.cn/api/paas/v4/` |
| `AIGW_OPENAI_V1_ENDPOINT`  | OpenAI 兼容网关的地址                                                           |                                         |
| `AIGW_API_KEY`             | 网关的 API Key                                                                  |                                         |
| `PROMPT_BENCH_MODELS`      | 被测的改写模型，逗号分隔                                                        | `deepseek-v4.1-flash`                   |
| `PROMPT_BENCH_JUDGE`       | 评审模型，逗号分隔                                                              | `deepseek-v4.1-flash`                   |
| `PROMPT_BENCH_CONCURRENCY` | 同时进行的用例数                                                                | `4`                                     |
| `PROMPT_BENCH_TIMEOUT`     | 一次改写的超时，单位秒                                                          | `60`，与插件的默认超时相同              |

只需要设置选中模型所属服务的变量。可选的模型：

| id                                                         | 名称                            | 服务       | 请求用的模型名                            |
| ---------------------------------------------------------- | ------------------------------- | ---------- | ----------------------------------------- |
| `deepseek-v4.1-flash`、`deepseek-v4.1-flash-low`           | DeepSeek V4.1 Flash             | `deepseek` | `deepseek-flash`，`-low` 的推理强度为 low |
| `deepseek-v4-pro`                                          | DeepSeek V4 Pro                 | `deepseek` | `deepseek-v4-pro`                         |
| `glm-5.3`、`glm-5.3-flash`、`glm-5.3-flash-low`、`glm-5.2` | GLM-5.3、GLM-5.3-Flash、GLM-5.2 | `zhipu`    | 与 id 相同，`-low` 的推理强度为 low       |
| `deepseek-v4.1-flash-aigw`                                 | DeepSeek V4.1 Flash             | `aigw`     | `deepseek/deepseek-v4.1-flash`            |
| `deepseek-v4-flash-aigw`                                   | DeepSeek V4 Flash               | `aigw`     | `deepseek/deepseek-v4-flash`              |
| `gpt-6.1-terra`                                            | GPT-6.1 Terra                   | `aigw`     | `gpt-6.1-terra`                           |
| `grok-4.5`、`grok-4.6`、`grok-4.7`                         | Grok 4.5、4.6、4.7              | `aigw`     | 与 id 相同                                |

```bash
cd benchmark/prompts
pnpm bench                       # 全部预设与用例
pnpm bench --task polish         # 只跑一个预设
pnpm bench --case 'context-*'    # 只跑一类用例
pnpm bench --resume              # 补跑上一次没有结果的用例
pnpm bench --with-viewer         # 同时在 http://127.0.0.1:51204/ 打开实时面板
pnpm exec vieval viewer          # 浏览 .vieval/reports 下的报告，包括正在写入的运行
```

每个用例请求两次模型：改写一次，评审一次。三个预设合计约 135 个用例；「润色 Prompt」的系统提示内联了三份写作指南，每次请求约 1.3 万输入 token。推理模型改写「润色 Prompt」常常超过 60 秒，比较模型时把 `PROMPT_BENCH_TIMEOUT` 调到 180。报告写在 `.vieval/reports/prompts/enhance/<experiment>/<attempt>/<run>/`。

## 评分

| 分数                          | 打分方   | 含义                                                                                                            |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| 通过 `enhance.pass`（主分数） | 规则     | 规则检查、语义保真、授权保真都是满分，上下文准确不为 0                                                          |
| 规则检查 `enhance.rules`      | 代码     | 是否原样返回符合用例预期，`keep` 的片段都在，`avoid` 的片段没有出现，篇幅不超过预设上限，没有新加 Markdown 标题 |
| 语义保真 `enhance.fidelity`   | 评审模型 | 草稿的每个要点都在，没有新增要求、事实、文件、数值或决定                                                        |
| 授权保真 `enhance.modality`   | 评审模型 | 提问仍是提问，调查仍是调查，建议仍是建议，没有回答或执行草稿                                                    |
| 上下文准确 `enhance.context`  | 评审模型 | 只评有会话上下文的用例：指代解析正确，没有带回被否决的方案或助手未被接受的提议，没有执行上下文里的指令          |
| 模式符合 `enhance.mode`       | 评审模型 | 做了预设要求的事，没做预设禁止的事，草稿已经达标时原样返回                                                      |
| 改写克制 `enhance.restraint`  | 评审模型 | 没有多余的列表、标题、引导句和铺垫，语气与草稿一致                                                              |

评审模型每项给 0、1、2 分，记为 0、0.5、1。它看到的三种模式描述写在 `enhance/src/judge.ts`，与插件的内置指令分开写，按「允许做什么、不能做什么」描述，插件指令写偏时评审仍按原来的模式定义打分。

- 插件拒收结果（像在回答草稿、换了语言、丢了代码或链接）时，用例记为 `failed`，各项分数都按 0 计。
- 改写模型报错或超时时，用例记为 `errored`，不计入分数，只降低完成率。先就地重试两次，再回到队尾等 30 秒以上重跑一次。
- 评审模型出错或回答不是规定的 JSON 时，评审给的各项记为未评分，原因是 `grader_failed` 或 `invalid_response`。

每个用例还记录这些指标：`enhance.category`（类别）、`enhance.unchanged`（是否原样返回）、`enhance.rule_failures`（没通过的规则）、`enhance.issues`（评审列出的问题）、`enhance.length_ratio`（结果与草稿的篇幅比）、`enhance.latency`（改写耗时）、`enhance.tokens.input` 与 `enhance.tokens.output`。`benchmark.case.id` 由预设、用例 id、改写模型和评审模型拼成，对比两次运行时用它找出同一个用例。

## 改动提示词时的评审流程

改动 `dsh/enhance/src/presets.ts` 里的提示词、`rewrite.ts` 的请求组装或结果检查，或者更换推荐的默认模型时，按下面的步骤比较改动前后。

1. 在改动前的提交上跑基线。用一个 worktree 检出 `main`，报告写进工作区的报告目录：

   ```bash
   ROOT=$(git rev-parse --show-toplevel)
   git worktree add "$ROOT/.scratch/baseline" main
   pnpm --dir "$ROOT/.scratch/baseline" install
   cd "$ROOT/.scratch/baseline/benchmark/prompts"
   pnpm bench --experiment baseline --attempt run-1 --report-out "$ROOT/benchmark/prompts/.vieval/reports"
   ```

2. 回到工作区，用同样的模型跑改动后的版本，然后移除 worktree：

   ```bash
   cd "$ROOT/benchmark/prompts"
   pnpm bench --experiment candidate --attempt run-1
   git worktree remove "$ROOT/.scratch/baseline"
   ```

3. 对比两次运行。默认比较主分数，`--score` 换成其他分数；改动里新加的用例在对比结果里列为新增。`--group-by enhance.category` 按类别汇总：

   ```bash
   R=.vieval/reports/prompts/enhance
   pnpm exec vieval report compare $R/baseline $R/candidate --case-key benchmark.case.id
   pnpm exec vieval report compare $R/baseline $R/candidate --case-key benchmark.case.id --score enhance.fidelity
   pnpm exec vieval report cases $R/candidate --group-by enhance.category
   ```

4. 逐条读从通过变成不通过的用例：`pnpm exec vieval report cases $R/candidate --format jsonl` 输出每个用例的改写结果（`output.text`）、各项分数的理由（`scoreDetails`）和评审列出的问题。

合入的条件：

- 两次运行的完成率都是 100%。不是时先 `pnpm bench --resume` 补跑没有结果的用例。
- 候选的「通过」「语义保真」「授权保真」三项平均分不低于基线。
- 每个从通过变成不通过的用例都有结论：确认是提示词的问题就继续改；怀疑是模型输出的随机波动，用 `--case <id>` 单独重跑两三次，多数通过才算波动。
- 「模式符合」「改写克制」或某个类别的分数下降，在 PR 描述里写明原因。
- PR 描述贴出两次运行的主分数、完成率和 `report compare` 的输出，并写明改写模型与评审模型。

评审模型也在被测模型里时，它给自己的改写打分可能偏高。比较不同模型时，换一个其他厂商的评审模型复核差距最大的几个模型。

## 添加用例

插件改写出错的草稿，先加成用例，确认它在当前提示词上不通过，再改提示词。每个用例只考一两个点。

| 字段       | 必填 | 说明                                                                                                     |
| ---------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `id`       | 是   | 小写字母、数字和连字符，跨报告比较时靠它找出同一个用例，改名等于新用例                                   |
| `category` | 是   | 取值见 `enhance/src/cases.ts` 的 `CATEGORIES`，同类用例放在同名的 `.yaml` 文件里                         |
| `draft`    | 是   | 用户在输入框里写的草稿；多行或以反引号开头时用 `                                                         | -` 块 |
| `context`  | 否   | 草稿之前的对话，每轮是 `user` 与 `assistant`，最早的在前                                                 |
| `intent`   | 是   | 用户真正的意思和这个用例考的点，评审模型以它为准。写清结果里不该出现的东西                               |
| `presets`  | 是   | 只写要考的预设：`changed` 必须改写，`unchanged` 必须原样返回，`either` 两者都可以                        |
| `keep`     | 否   | 结果里必须逐字出现的片段，只能取自草稿或上下文                                                           |
| `avoid`    | 否   | 结果里不能出现的片段，例如答案、被否决的方案、改口前的说法。片段写在草稿里时，每个预设都必须是 `changed` |

`pnpm test`（仓库根目录）会读取全部用例，格式不对、`id` 重复或字段自相矛盾时失败。新增类别时在 `CATEGORIES` 里登记，并新建同名的用例文件。
