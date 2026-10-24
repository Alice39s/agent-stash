<div align="center">

# Agent-Stash

[![CI](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/ci.yml) [![sync init prompts](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/sync-init-prompts.yml?branch=main&label=sync%20init%20prompts&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/sync-init-prompts.yml) [![sync style guides](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/sync-code-styleguide.yml?branch=main&label=sync%20style%20guides&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/sync-code-styleguide.yml)

[![License](https://img.shields.io/github/license/Alice39s/agent-stash)](LICENSE) [![Last commit](https://img.shields.io/github/last-commit/Alice39s/agent-stash)](https://github.com/Alice39s/agent-stash/commits/main) [![GitHub repo size](https://img.shields.io/github/repo-size/Alice39s/agent-stash)](https://github.com/Alice39s/agent-stash) [![Stars](https://img.shields.io/github/stars/Alice39s/agent-stash?style=social)](https://github.com/Alice39s/agent-stash/stargazers)

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![Pi Plugins](https://img.shields.io/badge/pi-plugin-111111)](https://pi.dev) [![DSH Plugins](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness) ![powered by DSH](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white) ![powered by pi](https://img.shields.io/badge/powered_by-Pi-111111?style=flat-square&logo=pi&logoColor=white)

> 自用的 Agent Skills、[Pi](https://pi.dev) 扩展与 [DSH (DeepSeek Harness)](https://github.com/deepseek-ai/deepseek-harness) 插件合集。

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
  - [Plugin: `/init <preset> [extra prompt]`](#plugin-init-preset-extra-prompt)
    - [上游同步的预设](#上游同步的预设)
    - [手动维护的预设](#手动维护的预设)
    - [额外指令与占位符](#额外指令与占位符)
    - [配置](#配置)
    - [上游同步](#上游同步)
  - [Skills: `code-styleguide`](#skills-code-styleguide)
  - [开发](#开发)
    - [发布](#发布)
  - [许可证](#许可证)

## 清单

### Plugins

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![Pi Plugin](https://img.shields.io/badge/Pi-Plugin-111111)](https://pi.dev) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

| 名称           | 说明                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| [/init](#init) | 用其他 Coding Agent 的 `/init` prompt 分析项目，写出 `AGENTS.md` 等说明文件 |

### Agent Skills

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest)

| 名称                                | 说明                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| [code-styleguide](#code-styleguide) | Google、Angular 与 Android Kotlin 风格指南，每天从上游同步 |

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

## Plugin: `/init <preset> [extra prompt]`

[![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![Pi Plugin](https://img.shields.io/badge/Pi-Plugin-111111)](https://pi.dev) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

让 agent 分析当前项目并写出 AGENTS.md。pi 与 DSH 的用法相同：

```text
/init                         # 使用默认预设
/init kimi-code               # 使用 kimi-code 预设
/init opencode 重点写测试流程   # 使用 opencode 预设并附加额外 Prompt
/init 用中文写                 # 第一个词不是预设名时，将绕过 Profile、直接使用你定义的 Prompt
```

### 上游同步的预设

| 预设            | 上游                                                            | 许可证      |
| --------------- | --------------------------------------------------------------- | ----------- |
| `codex`（默认） | [openai/codex](https://github.com/openai/codex)                 | Apache-2.0  |
| `kimi-code`     | [MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) | MIT         |
| `opencode`      | [anomalyco/opencode](https://github.com/anomalyco/opencode)     | MIT         |
| `crush`         | [charmbracelet/crush](https://github.com/charmbracelet/crush)   | FSL-1.1-MIT |
| `copilot`       | [microsoft/vscode](https://github.com/microsoft/vscode)         | MIT         |

### 手动维护的预设

| 预设                   | 来源                                        |
| ---------------------- | ------------------------------------------- |
| `claude-code`          | Claude Code v2.1.306 的 `/init`（经典版）   |
| `claude-code-init-new` | Claude Code v2.1.306 的 `/init`（多阶段版） |

### 额外指令与占位符

发送前去掉模板开头的 YAML frontmatter，并替换以下占位符：

- `${path}`：当前项目目录。DSH 里取会话的当前工作目录。
- `{{.Config.Options.InitializeAs}}`：Crush 模板里的说明文件名，替换为 `AGENTS.md`。
- `$ARGUMENTS`：额外指令。

模板没有 `$ARGUMENTS` 时，额外指令追加到 prompt 末尾的 `## Additional instructions from the user` 小节。

### 配置

配置文件按以下顺序读取：

pi：

1. `~/.pi/agent/agent-stash/init.json`（设置了 `PI_CODING_AGENT_DIR` 时为 `$PI_CODING_AGENT_DIR/agent-stash/init.json`）
2. `<{PROJECT_ROOT}}>/.pi/agent-stash/init.json`，仅在项目受信任时读取

DSH：

1. `$DSH_HOME/agent-stash/init.json`（未设置 `DSH_HOME` 时为 `~/.dsh/agent-stash/init.json`）

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

`SKILL.md` 是一张索引表，列出每份指南的文件、目录所在的行范围与总行数。每份 reference 开头有章节目录，写明各章节的起始行，agent 读完目录后只读需要的章节。代码示例的围栏标注 `good` 或 `bad`，分别对应上游的推荐写法与反例。

`skills/code-styleguide/` 下的文件全部由 `scripts/sync-code-styleguide.ts` 生成，不手动修改。脚本用 unified（remark / rehype）解析上游的 HTML 与 Markdown，去掉站点目录、锚点与模板指令，并把相对链接改成绝对地址。

## 开发

```bash
pnpm install
pnpm check
pnpm bundle # 更新 dist/：DSH、Cline 插件与 agent-stash 命令行都从这里加载
pnpm format
```

打包脚本叫 `bundle`。`package.json` 里有 `build` 脚本时，npm 从 Git 安装会先在克隆目录里执行一遍 `npm install`，`npm install -g github:…` 装出来的是指向临时目录的链接，命令无法使用。

### 发布

版本号遵循语义化版本，由 [Tegami](https://tegami.fuma-nama.dev) 管理，配置在 `scripts/tegami.ts`。

1. 在 `.tegami/` 下新建 Markdown 文件，frontmatter 写明升级类型（`major`、`minor` 或 `patch`），正文是发布说明：

   ```md
   ---
   packages:
     agent-stash: minor
   ---

   新增 xxx 预设。
   ```

2. 推送到 `main` 后，`.github/workflows/release.yml` 开 Version Packages PR，更新 `package.json` 的版本号与 `CHANGELOG.md`。
3. 合并这个 PR 后，同一个 workflow 打 `v<version>` tag 并创建 GitHub release。包不发布到 npm。

README 里的版本 badge 读取最新的 GitHub release。

## 许可证

本仓库使用 [Apache License 2.0](LICENSE)。
