<div align="center">

# Agent-Stash

[![CI](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/ci.yml) [![sync init prompts](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/sync-init-prompts.yml?branch=main&label=sync%20init%20prompts&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/sync-init-prompts.yml) [![sync style guides](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/sync-code-styleguide.yml?branch=main&label=sync%20style%20guides&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/sync-code-styleguide.yml)

[![License](https://img.shields.io/github/license/Alice39s/agent-stash)](LICENSE) [![Last commit](https://img.shields.io/github/last-commit/Alice39s/agent-stash)](https://github.com/Alice39s/agent-stash/commits/main) [![GitHub repo size](https://img.shields.io/github/repo-size/Alice39s/agent-stash)](https://github.com/Alice39s/agent-stash) [![Stars](https://img.shields.io/github/stars/Alice39s/agent-stash?style=social)](https://github.com/Alice39s/agent-stash/stargazers)

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![Pi Plugins](https://img.shields.io/badge/pi-plugin-111111)](https://pi.dev) [![DSH Plugins](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness) ![powered by DSH](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white) ![powered by pi](https://img.shields.io/badge/powered_by-Pi-111111?style=flat-square&logo=pi&logoColor=white)

> 自用的 Agent Skills，以及给 [Pi](https://pi.dev)、[DSH (DeepSeek Harness)](https://github.com/deepseek-ai/deepseek-harness)、Cline、Grok Build、goose 与 Aider 用的 `/init` 插件。

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
  - [Skills: `code-styleguide`](#skills-code-styleguide)
  - [Skills: `self-use-<model>-subagent`](#skills-self-use-model-subagent)
  - [开发](#开发)
    - [发布](#发布)
  - [许可证](#许可证)

## 清单

### Plugins

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest)

![Pi Plugin](https://img.shields.io/badge/Pi-Plugin-111111) ![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe) ![Cline Plugin](https://img.shields.io/badge/Cline-Plugin-222222) ![goose Recipes](https://img.shields.io/badge/goose-Recipes-2f2f2f) ![Aider](https://img.shields.io/badge/Aider-CLI-14b014) ![Grok Build Skills](https://img.shields.io/badge/Grok%20Build-Skills-000000)

| 名称                                      | 支持的 Agent                             | 说明                                                                        |
| ----------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| [/init](#plugin-init-preset-extra-prompt) | pi、DSH、Cline、Grok Build、goose、Aider | 用其他 Coding Agent 的 `/init` prompt 分析项目，写出 `AGENTS.md` 等说明文件 |

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

DeepSeek Harness 桌面版：在「插件」页点「添加插件」，填入 `github:Alice39s/agent-stash` 后安装。

命令行：把仓库作为 bundle 装进某个 profile，例如 Web 界面使用的 `web`：

```bash
dsh plugin --profile web add github:Alice39s/agent-stash
```

`dist/` 随仓库提交，安装时不需要构建。DSH 的斜杠命令目前只能在 Web 界面与桌面版里使用。

插件索引：DSH 0.2.1-alpha.4 起可以在「发现」页浏览 JSON 插件索引并从中安装。在「插件」页的「实验性插件」里打开「自定义插件市场」（较新的 DSH 叫「自定义插件索引」），切到「发现」，点「添加索引源」，填入：

```text
https://alice39s.github.io/agent-stash/index.json
```

索引由 GitHub Actions 用 DSH 的参考生成器生成，每次发布后更新，列出每个 `v<version>` tag 和 `main` 上的版本。

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

让 agent 分析当前项目并写出 AGENTS.md。pi、DSH 与 Cline 的用法相同：

```text
/init                         # 使用默认预设
/init kimi-code               # 使用 kimi-code 预设
/init opencode 重点写测试流程   # 使用 opencode 预设并附加额外 Prompt
/init 用中文写                 # 第一个词不是预设名时，整句作为额外 Prompt，使用默认预设
```

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
- `description` 显示在补全菜单里，不写时显示文件路径。

### 上游同步

`.github/workflows/sync-init-prompts.yml` 每天运行一次。

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
pnpm bundle # 更新 dist/：DSH、Cline 插件与 agent-stash 命令行都从这里加载
pnpm format
```

### 发布

版本号遵循语义化版本，由 [Tegami](https://tegami.fuma-nama.dev) 管理，配置在 `scripts/tegami.ts`。

1. 在 `.tegami/` 下新建 Markdown 文件，frontmatter 写明升级类型（`major`、`minor` 或 `patch`），正文是发布说明。正文至少要有一个 Markdown 标题，没有标题的文件 Tegami 不会读取：

   ```md
   ---
   packages:
     "@agent-stash/init": minor
   ---

   ## 新增 xxx 预设

   - xxx 预设从上游每天同步。
   ```

2. 推送到 `main` 后，`.github/workflows/release.yml` 开 Version Packages PR，更新 `package.json` 的版本号与 `CHANGELOG.md`。
3. 合并这个 PR 后，同一个 workflow 打 `v<version>` tag 并创建 GitHub release。包不发布到 npm。

README 里的版本 badge 会自动读取最新的 GitHub release。

## 许可证

本仓库使用 [Apache License 2.0](LICENSE)。
