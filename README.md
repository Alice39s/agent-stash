<div align="center">

# Agent-Stash

[![CI](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/ci.yml) [![sync init prompts](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/sync-init-prompts.yml?branch=main&label=sync%20init%20prompts&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/sync-init-prompts.yml) [![sync style guides](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/sync-code-styleguide.yml?branch=main&label=sync%20style%20guides&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/sync-code-styleguide.yml)

[![License](https://img.shields.io/github/license/Alice39s/agent-stash)](LICENSE) [![Last commit](https://img.shields.io/github/last-commit/Alice39s/agent-stash)](https://github.com/Alice39s/agent-stash/commits/main) [![GitHub repo size](https://img.shields.io/github/repo-size/Alice39s/agent-stash)](https://github.com/Alice39s/agent-stash) [![Stars](https://img.shields.io/github/stars/Alice39s/agent-stash?style=social)](https://github.com/Alice39s/agent-stash/stargazers)

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![Pi Plugins](https://img.shields.io/badge/pi-plugin-111111)](https://pi.dev) [![DSH Plugins](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness) ![powered by DSH](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white) ![powered by pi](https://img.shields.io/badge/powered_by-Pi-111111?style=flat-square&logo=pi&logoColor=white)

> 自用的 Agent Skills，以及给 [Pi](https://pi.dev)、[DSH (DeepSeek Harness)](https://github.com/deepseek-ai/deepseek-harness)、Cline、Grok Build、goose 与 Aider 用的 `/init` 插件。
>
> 文档站：[中文](https://alice39s.github.io/agent-stash/zh/) · [English](https://alice39s.github.io/agent-stash/en/)

</div>

## 目录

- [Agent-Stash](#agent-stash)
  - [目录](#目录)
  - [清单](#清单)
    - [Plugins](#plugins)
    - [Agent Skills](#agent-skills)
  - [安装](#安装)
    - [Pi](#pi)
    - [DeepSeek Harness (DSH)](#deepseek-harness-dsh)
    - [Cline](#cline)
    - [`agent-stash` 命令行](#agent-stash-命令行)
  - [Plugin: `/init <preset> [extra prompt]`](#plugin-init-preset-extra-prompt)
    - [Grok Build 与 goose](#grok-build-与-goose)
    - [Aider](#aider)
    - [上游同步的预设](#上游同步的预设)
    - [手动维护的预设](#手动维护的预设)
    - [额外指令与占位符](#额外指令与占位符)
    - [配置](#配置)
    - [上游同步](#上游同步)
  - [Plugin: `dsh-recall`](#plugin-dsh-recall)
  - [Plugin: `dsh-autosuggest`](#plugin-dsh-autosuggest)
    - [安装](#安装-1)
  - [Plugin: `dsh-stash-kit`](#plugin-dsh-stash-kit)
  - [Skills: `code-styleguide`](#skills-code-styleguide)
  - [Skills: `self-use-<model>-subagent`](#skills-self-use-model-subagent)
  - [开发](#开发)
    - [文档站](#文档站)
    - [发布](#发布)
  - [许可证](#许可证)

## 清单

### Plugins

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest)

![Pi Plugin](https://img.shields.io/badge/Pi-Plugin-111111) ![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe) ![Cline Plugin](https://img.shields.io/badge/Cline-Plugin-222222) ![goose Recipes](https://img.shields.io/badge/goose-Recipes-2f2f2f) ![Aider](https://img.shields.io/badge/Aider-CLI-14b014) ![Grok Build Skills](https://img.shields.io/badge/Grok%20Build-Skills-000000)

| 名称                                            | npm 包                                                                                         | 支持的 Agent                             | 说明                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| [/init](#plugin-init-preset-extra-prompt)       | [`@agent-stash/init`](https://www.npmjs.com/package/@agent-stash/init)                         | pi、DSH、Cline、Grok Build、goose、Aider | 用其他 Coding Agent 的 `/init` prompt 分析项目，写出 `AGENTS.md` 等说明文件 |
| [消息编辑](packages/dsh-message-edit/README.md) | [`@agent-stash/dsh-message-edit`](https://www.npmjs.com/package/@agent-stash/dsh-message-edit) | DSH                                      | 编辑消息、重新生成回复或重试回合，每次改动另开一个会话版本，可随时切换回去  |
| [Prompt 回溯](#plugin-dsh-recall)               | [`@agent-stash/dsh-recall`](https://www.npmjs.com/package/@agent-stash/dsh-recall)             | DSH                                      | 在输入框里按 ↑↓ 翻看当前会话发过的 Prompt                                   |
| [Prompt 补全](#plugin-dsh-autosuggest)          | [`@agent-stash/dsh-autosuggest`](https://www.npmjs.com/package/@agent-stash/dsh-autosuggest)   | DSH                                      | 输入历史 Prompt 的开头时以灰字补出剩余部分，按 Tab 或 → 填入                |
| [Agent Stash 框架](#plugin-dsh-stash-kit)       | [`@agent-stash/dsh-stash-kit`](https://www.npmjs.com/package/@agent-stash/dsh-stash-kit)       | DSH                                      | 上面两个插件共用的面板、动画与外观配置，随它们自动安装                      |

### Agent Skills

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest)

![Grok Build Skills](https://img.shields.io/badge/Grok%20Build-Skills-000000)

| 名称                                                        | 说明                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| [code-styleguide](#skills-code-styleguide)                  | Google、Angular 与 Android Kotlin 风格指南，每天从上游同步 |
| [self-use-haiku-subagent](#skills-self-use-model-subagent)  | 在 DSH 里把任务委托给 Haiku 5.5 子代理                     |
| [self-use-sonnet-subagent](#skills-self-use-model-subagent) | 在 DSH 里把任务委托给 Sonnet 5.5 子代理                    |
| [self-use-luna-subagent](#skills-self-use-model-subagent)   | 在 DSH 里把任务委托给 GPT-5.6 Luna 子代理                  |
| [self-use-dpsk-subagent](#skills-self-use-model-subagent)   | 在 DSH 里把任务委托给 DeepSeek V4.1 Flash 子代理           |

## 安装

### Pi

```bash
pi install git:github.com/Alice39s/agent-stash
```

pi 会同时加载 `/init` 扩展与 `skills/` 下的技能，也可以只在当前会话试用：

```bash
pi -e git:github.com/Alice39s/agent-stash
```

### DeepSeek Harness (DSH)

DeepSeek Harness 桌面版：在「插件」页点「添加插件」，填入 npm 包名后安装：`@agent-stash/init`（`/init`）、`@agent-stash/dsh-message-edit`（消息编辑）、`@agent-stash/dsh-recall`（Prompt 回溯）或 `@agent-stash/dsh-autosuggest`（Prompt 补全）。

命令行：把包作为 bundle 装进某个 profile，例如 Web 界面使用的 `web`：

```bash
dsh plugin --profile web add @agent-stash/init
dsh plugin --profile web add @agent-stash/dsh-message-edit
dsh plugin --profile web add @agent-stash/dsh-recall
dsh plugin --profile web add @agent-stash/dsh-autosuggest
```

npm 包由 GitHub Actions 经 npm trusted publishing 发布，带 provenance。也可以装 `main` 上的最新版本：`github:Alice39s/agent-stash`（只含 `/init`）。DSH 的斜杠命令目前只能在 Web 界面与桌面版里使用。

插件索引：DSH 0.2.1-alpha.4 起可以在「发现」页浏览 JSON 插件索引并从中安装。在「插件」页的「实验性插件」里打开「自定义插件市场」（较新的 DSH 叫「自定义插件索引」），切到「发现」，点「添加索引源」，填入：

```text
https://alice39s.github.io/agent-stash/index.json
```

索引由 GitHub Actions 用 DSH 的参考生成器生成，每次发布后和每天定时更新，列出这些 npm 包的每个发布版本。它和文档站发布在同一个 GitHub Pages 站点上。

### Cline

```bash
cline plugin install --git github.com/Alice39s/agent-stash
```

插件注册 `/init` 斜杠命令，在 TUI（`cline -i`）里使用。`cline "<prompt>"` 单次运行时不处理斜杠命令。

### `agent-stash` 命令行

Grok Build、goose 与 Aider 通过 `agent-stash` 命令行接入：

```bash
npm install -g github:Alice39s/agent-stash
agent-stash init install grok
agent-stash init install goose
```

## Plugin: `/init <preset> [extra prompt]`

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![Pi Plugin](https://img.shields.io/badge/Pi-Plugin-111111)](https://pi.dev) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness) [![Cline Plugin](https://img.shields.io/badge/Cline-Plugin-222222)](https://github.com/cline/cline) [![Grok Build Skills](https://img.shields.io/badge/Grok%20Build-Skills-000000)](https://docs.x.ai/build/overview) [![goose Recipes](https://img.shields.io/badge/goose-Recipes-2f2f2f)](https://github.com/aaif-goose/goose) [![Aider](https://img.shields.io/badge/Aider-CLI-14b014)](https://github.com/Aider-AI/aider)

让 agent 分析当前项目并写出 AGENTS.md，完整说明见[文档站](https://alice39s.github.io/agent-stash/zh/plugins/init/)。pi、DSH 与 Cline 的用法相同：

```text
/init                         # 使用默认预设
/init kimi-code               # 使用 kimi-code 预设
/init opencode 重点写测试流程   # 使用 opencode 预设并附加额外 Prompt
/init 用中文写                 # 第一个词不是预设名时，整句作为额外 Prompt，使用默认预设
```

DSH 的 `/` 菜单里，`/init` 排在「指令」区，标题是「初始化」。在菜单里选中它，或者只输入 `/init` 就回车，会打开预设列表：默认预设打勾并已高亮，再按回车就用它，输入文字可以筛选预设，自定义预设单独列在「自定义」组里。要写预设名或额外 Prompt，在 `/init` 后面打空格接着输入，规则和上面一样。

### Grok Build 与 goose

每个预设对应一个 `/init-<预设名>` 命令，`/init` 使用默认预设。命令后面的文字都是额外 Prompt：

```text
/init                          # 使用默认预设
/init-kimi-code                # 使用 kimi-code 预设
/init-opencode 重点写测试流程    # 使用 opencode 预设并附加额外 Prompt
```

非交互运行时也能用：

```bash
grok -p "/init-opencode 重点写测试流程"
goose run -t "/init-crush 重点写测试流程"
```

### Aider

`agent-stash init aider` 渲染预设后交给 `aider --message`，aider 处理完这一轮就退出。参数与 `/init` 相同，`--` 之后的参数原样传给 aider：

```bash
agent-stash init aider                               # 使用默认预设
agent-stash init aider opencode 重点写测试流程         # 使用 opencode 预设并附加额外 Prompt
agent-stash init aider crush -- --model sonnet       # 指定 aider 的模型
```

### 上游同步的预设

| 预设            | 上游                                                            | 许可证      |
| --------------- | --------------------------------------------------------------- | ----------- |
| `codex`（默认） | [openai/codex](https://github.com/openai/codex)                 | Apache-2.0  |
| `kimi-code`     | [MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) | MIT         |
| `opencode`      | [anomalyco/opencode](https://github.com/anomalyco/opencode)     | MIT         |
| `crush`         | [charmbracelet/crush](https://github.com/charmbracelet/crush)   | FSL-1.1-MIT |
| `copilot`       | [microsoft/vscode](https://github.com/microsoft/vscode)         | MIT         |
| `qwen-code`     | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code)         | Apache-2.0  |
| `kilo-code`     | [Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode)       | MIT         |

### 手动维护的预设

| 预设                   | 来源                                        |
| ---------------------- | ------------------------------------------- |
| `claude-code`          | Claude Code v2.1.306 的 `/init`（经典版）   |
| `claude-code-init-new` | Claude Code v2.1.306 的 `/init`（多阶段版） |

这两份 prompt 也都统一输出 `AGENTS.md`。

### 额外指令与占位符

发送前去掉模板开头的 YAML frontmatter，并替换以下占位符：

- `${path}`：当前项目目录。DSH 里取会话的当前工作目录，Cline 里取工作区根目录。Grok Build 与 goose 的命令是安装时写好的文件，写成 `.`，即 agent 运行时的当前目录。
- `{{.Config.Options.InitializeAs}}`：Crush 模板里的说明文件名，替换为 `AGENTS.md`。
- `$ARGUMENTS`：额外指令。

模板没有 `$ARGUMENTS` 时，额外指令追加到 prompt 末尾的 `## Additional instructions from the user` 小节，没有额外指令就不加。Grok Build 的技能是静态文件，这个小节始终存在，没有额外指令时内容为空。

### 配置

配置文件按以下顺序读取：

pi：

1. `~/.pi/agent/agent-stash/init.json`（设置了 `PI_CODING_AGENT_DIR` 时为 `$PI_CODING_AGENT_DIR/agent-stash/init.json`）
2. `<项目根目录>/.pi/agent-stash/init.json`，仅在项目受信任时读取

DSH：

1. `$DSH_HOME/agent-stash/init.json`（未设置 `DSH_HOME` 时为 `~/.dsh/agent-stash/init.json`）

Cline：

1. `$CLINE_DIR/agent-stash/init.json`（未设置 `CLINE_DIR` 时为 `~/.cline/agent-stash/init.json`）

`agent-stash` 命令行（Grok Build、goose、Aider）：

1. `$XDG_CONFIG_HOME/agent-stash/init.json`（未设置 `XDG_CONFIG_HOME` 时为 `~/.config/agent-stash/init.json`）

```json
{
  "defaultPreset": "team",
  "presets": {
    "team": {
      "file": "./team-init.md",
      "description": "..."
    }
  }
}
```

- `defaultPreset`：不写预设名时使用的预设，默认为 `codex`。
- `presets`：自定义预设。`file` 是相对配置文件所在目录的路径，同名预设覆盖内置预设。
- `description` 显示在补全菜单和 DSH 的预设列表里，不写时显示 `file` 的路径。

### 上游同步

`.github/workflows/sync-init-prompts.yml` 每天运行一次。

## Plugin: `dsh-recall`

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-recall)](https://www.npmjs.com/package/@agent-stash/dsh-recall) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

Prompt 回溯：在 DSH 的输入框里翻看当前会话发过的 Prompt，录屏见[文档站](https://alice39s.github.io/agent-stash/zh/plugins/dsh-recall/)：

| 按键            | 作用                                       |
| --------------- | ------------------------------------------ |
| ↑（光标在开头） | 打开历史面板，把最近一条 Prompt 放进输入框 |
| ↑ / ↓           | 在更早与更新的 Prompt 之间切换             |
| ↓（最新一条）   | 回到打开面板前的草稿                       |
| Esc             | 回到打开面板前的草稿                       |
| Tab             | 保留当前这条，关闭面板继续编辑             |
| Enter           | 直接发送当前这条                           |

面板按日期分组，点任意一行也能把它放进输入框。`/`、`@` 菜单打开时方向键仍归菜单使用。

## Plugin: `dsh-autosuggest`

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-autosuggest)](https://www.npmjs.com/package/@agent-stash/dsh-autosuggest) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

Prompt 补全，参照 zsh-autosuggestions：输入的内容是某条历史 Prompt 的开头（区分大小写）时，光标后以灰字显示剩余部分，输入框上方列出最多五条匹配，标出来源会话与日期。录屏见[文档站](https://alice39s.github.io/agent-stash/zh/plugins/dsh-autosuggest/)。

| 按键    | 作用                       |
| ------- | -------------------------- |
| Tab / → | 填入高亮的那条             |
| ↑ / ↓   | 有多条匹配时切换           |
| Esc     | 收起建议，改动草稿后再出现 |

历史来自所有会话里最近发过 Prompt 的 50 个，按时间倒序，相同文本只保留最新一条。只有亲手输入才会出现建议，`dsh-recall` 放进输入框的内容不会触发。

### 安装

两个插件各是一个 DSH bundle，需要 DSH 0.2.1-alpha.4 或更新的版本。桌面版在「插件」页点「添加插件」，分别填入 `@agent-stash/dsh-recall` 与 `@agent-stash/dsh-autosuggest`；也可以从[插件索引](#deepseek-harness-dsh)安装。命令行：

```bash
dsh plugin --profile web add @agent-stash/dsh-recall
dsh plugin --profile web add @agent-stash/dsh-autosuggest
```

两个插件的界面都建立在 [Agent Stash 框架](#plugin-dsh-stash-kit)上。插件第一次启动时会通过插件管理器从 npm 自动安装并启用框架；profile 里已经装了框架但没有启用时，插件会把它启用。框架就绪之前，「插件」页里两个插件的浏览器半部显示「等待依赖」，Prompt 历史路由照常工作。

本地开发时可以直接装工作区里的目录，例如 `dsh plugin --profile web add "$PWD/dsh/recall"`，插件会从同一个仓库的 `dsh/kit` 安装框架。两个插件共用 `dsh/shared/` 下的历史读取与按键处理，Host 半部各注册一个只读路由（`/dsh-recall/prompts`、`/dsh-autosuggest/prompts`），从会话日志里取出用户亲手发送的 Prompt，经 DSH 的连接校验后返回。

## Plugin: `dsh-stash-kit`

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-stash-kit)](https://www.npmjs.com/package/@agent-stash/dsh-stash-kit) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

Agent Stash 框架（`dsh/kit`）为 Agent Stash 系列的 DSH 插件提供共用的面板、补全灰字、动画和外观配置。浏览器半部提供 `stashKit` 服务，`dsh-recall` 与 `dsh-autosuggest` 依赖这个服务渲染界面；Host 半部持有外观配置，在「插件」页统一修改，所有插件同时生效。

面板与宿主 `/` 菜单使用同一套几何：离输入框 4px，圆角与内边距一致，内容左边线对齐输入框的文字列。底色完全不透明，默认再加一层背景模糊。

在「插件」页打开「Agent Stash 框架」，点它的条目进入配置页。页面顶部有实时预览，可以重播动画；改动点保存后立即生效。配置页的录屏见[文档站](https://alice39s.github.io/agent-stash/zh/plugins/dsh-stash-kit/)：

| 配置项     | 字段        | 可选值                                             | 默认 |
| ---------- | ----------- | -------------------------------------------------- | ---- |
| 毛玻璃效果 | `glass`     | 开（不透明底色加背景模糊）/ 关（不透明底色）       | 开   |
| 动画       | `motion`    | `lively` 灵动、`subtle` 轻柔、`off` 关闭           | 灵动 |
| 补全灰字   | `ghost`     | `wave` 波浪、`fade` 淡入、`none` 直接显示          | 波浪 |
| 高亮移动   | `highlight` | `glide` 滑动、`instant` 即时                       | 滑动 |
| 行高       | `density`   | `comfortable` 舒适（34px）、`compact` 紧凑（28px） | 舒适 |
| 按键提示   | `hints`     | 开 / 关                                            | 开   |

各档动画：

- 灵动：面板从输入框方向浮起，由模糊变清晰，各行从贴近输入框的一行起依次出现；关闭时向下淡出。用 ↑ 回溯时，新草稿从翻看的方向滑入输入框。
- 轻柔：面板只做短淡入淡出，草稿切换不播放动画。
- 关闭：面板和灰字都直接出现、直接消失。
- 补全灰字的「波浪」用一道渐隐遮罩从左向右扫出剩余文字；沿着建议继续输入时灰字不重播，换成另一条建议时才重新出现。
- 系统开启「减少动态效果」时，所有位移和模糊都会去掉，只保留淡入淡出。

也可以在 profile 的 patch 里写：

```yaml
- id: dsh-stash-kit
  name: "@agent-stash/dsh-stash-kit"
  config:
    glass: false
    motion: subtle
```

单独安装框架：`@agent-stash/dsh-stash-kit`。停用框架后，依赖它的插件会停在「等待依赖」，再次启用这些插件时框架会被重新启用。

## Skills: `code-styleguide`

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest)

收录的风格指南：

- [google/styleguide](https://github.com/google/styleguide) README 列出的全部指南（CC-BY-3.0）
- [Angular 风格指南](https://angular.dev/style-guide)（CC-BY-4.0）
- [Android Kotlin 风格指南](https://developer.android.com/kotlin/style-guide)（Apache-2.0）

## Skills: `self-use-<model>-subagent`

在 DSH 里派发子代理时用的四个技能，每个模型一份：

| 技能                       | 模型                | 单个子代理的上下文预算 |
| -------------------------- | ------------------- | ---------------------- |
| `self-use-haiku-subagent`  | Haiku 5.5           | 100k                   |
| `self-use-sonnet-subagent` | Sonnet 5.5          | 400k                   |
| `self-use-luna-subagent`   | GPT-5.6 Luna        | 200k                   |
| `self-use-dpsk-subagent`   | DeepSeek V4.1 Flash | 200k                   |

每个技能写了调用参数、按预算估算一个子代理能做多少、提示词怎么写，以及子代理用满上下文被终止后怎么接手。

四份 `SKILL.md` 由同一份模板生成，模板、模型参数和生成脚本都在 `skills/self-use-haiku-subagent/scripts/` 下。改正文就改 `templates/` 下的模板，改模型参数就改 `models.yaml`，然后重新生成：

```bash
uv run skills/self-use-haiku-subagent/scripts/render.py
```

## 开发

```bash
pnpm install
pnpm check
pnpm bundle # 更新 dist/ 与 dsh/*/dist/：DSH、Cline 插件与 agent-stash 命令行都从这里加载
pnpm format
```

工作区包放在 `packages/` 下，各自的 `bundle` 脚本产出随仓库提交的 `dist/`；`dsh/recall`、`dsh/autosuggest` 与 `dsh/kit` 也是工作区包，由根目录的 `pnpm bundle` 构建。CI 与发布流程的步骤都由 `scripts/ci` 里的 Python 命令行执行（uv + Typer），本地可以用同一条命令复现：

```bash
uv run --project scripts/ci ci --help
uv run --project scripts/ci ci bundle --check # 重建所有工作区包的 dist/，与检出内容不一致时失败
uv run --project scripts/ci ci npm status     # 列出各包在 npm 上的版本与是否经 trusted publishing 发布
```

### 文档站

文档站在 `docs/` 下，是静态导出的 [Fumadocs](https://fumadocs.dev) 站点，由 `.github/workflows/pages.yml` 与插件索引一起发布到 GitHub Pages。改动 `docs/` 的 Pull Request 会构建一份预览产物，合并到 `main` 后部署。

```bash
pnpm --filter agent-stash-docs dev    # http://localhost:3883/agent-stash/
pnpm --filter agent-stash-docs build  # 输出到 docs/out/
```

修改文档站界面前先读 [`docs/design.md`](docs/design.md)。

### 发布

版本号遵循语义化版本，由 [Tegami](https://tegami.fuma-nama.dev) 管理，配置在 `scripts/tegami.ts`。

1. 在 `.tegami/` 下新建 Markdown 文件，frontmatter 写明每个改动的包与升级类型（`major`、`minor` 或 `patch`），正文是发布说明。正文至少要有一个 Markdown 标题，没有标题的文件 Tegami 不会读取：

   ```md
   ---
   packages:
     "@agent-stash/init": minor
   ---

   ## 新增 xxx 预设

   - xxx 预设从上游每天同步。
   ```

2. 推送到 `main` 后，`.github/workflows/release.yml` 开 Version Packages PR，更新各包的版本号与 `CHANGELOG.md`。
3. 合并这个 PR 后，同一个 workflow 经 npm trusted publishing（OIDC）把升级过的包发布到 npm 并附带 provenance，然后打 tag、创建 GitHub release：`@agent-stash/init` 用 `v<version>`，其他包用 `<name>@<version>`。workflow 等到 npm 能安装新版本才结束，随后运行的 Pages 工作流就会在插件索引里列出这次发布，并重新发布文档站。

npm 上的包禁止 bypass 2FA 的令牌发布，CI 只通过 trusted publishing 发布。

#### 新增一个 npm 包

npm 只能给已经存在的包配置 Trusted Publisher，新包要先用一次性的令牌占个名字：

1. 在 npmjs.com 生成一个只用于这一步的发布令牌，复制到剪贴板后运行 `uv run --project scripts/ci ci bootstrap store-token`，它把剪贴板内容存成仓库的 `NPM_TOKEN` secret 并清空剪贴板。
2. 运行 `uv run --project scripts/ci ci bootstrap publish --auth token`：release workflow 用令牌给还没有正式版本的包发布一个空的 `0.0.0-placeholder.<n>`（dist-tag `placeholder`）。
3. 在包的 npm 设置页添加 Trusted Publisher：仓库 `Alice39s/agent-stash`，workflow `release.yml`。
4. 运行 `uv run --project scripts/ci ci bootstrap publish --auth oidc`，确认 `ci npm status` 显示 trusted publishing 为 yes。
5. 运行 `uv run --project scripts/ci ci bootstrap remove-token`，在 npmjs.com 吊销令牌，并把包的发布权限设为禁止 bypass 2FA 令牌。

README 里的版本 badge 会自动读取最新的 GitHub release。

## 许可证

本仓库使用 [Apache License 2.0](LICENSE)。
