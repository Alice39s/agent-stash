# agent-stash

[![CI](https://github.com/Alice39s/agent-stash/actions/workflows/ci.yml/badge.svg)](https://github.com/Alice39s/agent-stash/actions/workflows/ci.yml)
[![Sync init prompts](https://github.com/Alice39s/agent-stash/actions/workflows/sync-init-prompts.yml/badge.svg)](https://github.com/Alice39s/agent-stash/actions/workflows/sync-init-prompts.yml)
[![License](https://img.shields.io/github/license/Alice39s/agent-stash)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Alice39s/agent-stash)](https://github.com/Alice39s/agent-stash/commits/main)
[![pi package](https://img.shields.io/badge/pi-package-111111)](https://pi.dev)
[![DSH plugin](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-11-f69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.json)

自用的 Agent Skills、[pi](https://pi.dev) 扩展与 [DSH（DeepSeek Harness）](https://github.com/deepseek-ai/deepseek-harness)插件合集。

## 目录

| 路径                   | 内容                                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| `src/`                 | pi 与 DSH 共用的实现                                                              |
| `pi/extensions/`       | pi 扩展，由 `package.json` 的 `pi.extensions` 声明                                |
| `dsh/`                 | DSH 插件源码、`cordis.patch.yml`、本地化文案与图标                                |
| `dist/`                | DSH 插件的构建产物，由 `pnpm build` 生成，随仓库提交                              |
| `vendor/init-prompts/` | 从上游仓库同步的 `/init` prompt、许可证与 `manifest.json`，由脚本生成，不手动修改 |
| `skills/`              | Agent Skills，由 `package.json` 的 `pi.skills` 声明                               |
| `scripts/`             | 同步脚本                                                                          |

## 安装

### pi

```bash
pi install git:github.com/Alice39s/agent-stash
```

只在当前会话试用：

```bash
pi -e git:github.com/Alice39s/agent-stash
```

### DSH

DeepSeek Harness 桌面版：在「插件」页点「添加插件」，填入 `github:Alice39s/agent-stash` 后安装。

命令行：把仓库作为 bundle 装进某个 profile，例如 Web 界面使用的 `web`：

```bash
dsh plugin --profile web add github:Alice39s/agent-stash
```

`dist/` 已随仓库提交，安装时不需要构建。DSH 的斜杠命令目前只在 Web 界面与桌面版里可用。

## `/init`

让 agent 分析当前项目并写出 `AGENTS.md`，prompt 取自其他 coding agent 的开源实现。pi 与 DSH 的用法相同。

```text
/init                         使用默认预设
/init kimi-code               使用 kimi-code 预设
/init opencode 重点写测试流程    使用 opencode 预设并附加额外指令
/init 用中文写                 第一个词不是预设名时，整段文字作为默认预设的额外指令
```

pi：

- 输入 `/init ` 后，补全菜单列出每个预设及其上游来源，默认预设标出 `(default)`。
- 选中预设后，菜单提示可以继续输入 `[extra prompt]`。

DSH：

- 命令菜单列出全部预设，默认预设标出 `(default)`。
- 输入框提示可用的预设名，例如 `[codex|kimi-code|opencode] [extra prompt]`。
- 预设列表在 DSH 加载插件时生成，修改配置后要重启 DSH 才会更新。

### 内置预设

| 预设            | 上游                                                            | 文件                                                              | 许可证     |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| `codex`（默认） | [openai/codex](https://github.com/openai/codex)                 | `codex-rs/tui/assets/prompt_for_init_command.md`                  | Apache-2.0 |
| `kimi-code`     | [MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) | `packages/agent-core-v2/src/features/sessionInit/profile/init.md` | MIT        |
| `opencode`      | [anomalyco/opencode](https://github.com/anomalyco/opencode)     | `packages/core/src/plugin/command/initialize.txt`                 | MIT        |

每个预设对应的上游 commit 记录在 `vendor/init-prompts/manifest.json`。

### 额外指令与占位符

模板里的占位符在发送前替换：

- `${path}`：当前项目目录。DSH 里取会话的当前工作目录。
- `$ARGUMENTS`：额外指令。

模板没有 `$ARGUMENTS` 时，额外指令追加到 prompt 末尾的 `## Additional instructions from the user` 小节。

### 配置

配置文件按以下顺序读取，后读的覆盖先读的。

pi：

1. `~/.pi/agent/agent-stash/init.json`（设置了 `PI_CODING_AGENT_DIR` 时为 `$PI_CODING_AGENT_DIR/agent-stash/init.json`）
2. `<项目>/.pi/agent-stash/init.json`，仅在项目受信任时读取

DSH：

1. `$DSH_HOME/agent-stash/init.json`（未设置 `DSH_HOME` 时为 `~/.dsh/agent-stash/init.json`）

```json
{
  "defaultPreset": "team",
  "presets": {
    "team": {
      "file": "./team-init.md",
      "description": "团队的 AGENTS.md 模板"
    }
  }
}
```

- `defaultPreset`：不写预设名时使用的预设，默认为 `codex`。
- `presets`：自定义预设。`file` 是相对配置文件所在目录的路径，同名预设覆盖内置预设。`description` 显示在补全菜单里，不写时显示文件路径。

配置格式错误或默认预设不存在时，`/init` 直接报错。

## 上游同步

`.github/workflows/sync-init-prompts.yml` 每天运行一次，也可以手动触发。它拉取各上游默认分支最新 commit 中的 prompt 与根目录的 LICENSE、NOTICE 文件，按预设计算内容的 MurmurHash3（x64 128 位），与已收录的文件比较：

- 内容不变的预设保留 `manifest.json` 里原有的 commit，上游 HEAD 前进不产生改动。
- 有预设内容变化时，运行检查后向 `chore/sync-init-prompts` 分支开 PR，并直接 squash 合并。

仓库需要在 Settings → Actions → General 中开启「Allow GitHub Actions to create and approve pull requests」，workflow 才能创建 PR。

本地同步：

```bash
GITHUB_TOKEN=<token> pnpm sync:init-prompts
```

上游列表在 `scripts/sync-init-prompts.ts` 的 `SOURCES` 中维护。

## `code-styleguide` 技能

`skills/code-styleguide/` 收录以下风格指南，转换为 Markdown 后放在 `references/` 下：

- [google/styleguide](https://github.com/google/styleguide) README 列出的全部指南（CC-BY-3.0）
- [Angular 风格指南](https://angular.dev/style-guide)（CC-BY-4.0）
- [Android Kotlin 风格指南](https://developer.android.com/kotlin/style-guide)（Apache-2.0）

`SKILL.md` 只有一张索引表，列出每份指南的文件、目录行范围与总行数。每份 reference 开头是章节目录，标出各章节所在行，agent 先读目录，再按行号只读需要的章节。代码示例的围栏标注 `good` 或 `bad`，对应上游的推荐与反例写法。

`skills/code-styleguide/` 下的文件全部由 `scripts/sync-code-styleguide.ts` 生成，不手动修改：

- 转换：HTML 与 Markdown 统一经 unified（remark / rehype）解析，去掉站点目录、锚点与模板指令，相对链接改写为绝对地址。
- 元数据：`sources.json` 记录每份指南的上游路径、revision、更新日期与许可证。GitHub 上的指南取最后一次修改该文件的 commit；developer.android.com 没有公开的 Git 历史，用页面内容的 SHA-256 作为 revision，内容变化时更新日期。`SKILL.md` 的 `metadata` 与索引表由 `sources.json` 生成。
- 自动更新：`.github/workflows/sync-code-styleguide.yml` 每天运行一次，也可以手动触发。它重新生成整个技能目录，运行检查后向 `chore/sync-code-styleguide` 分支开 PR；上游没有变化时不开 PR。google/styleguide README 新增的指南会自动收录。

本地同步：

```bash
GITHUB_TOKEN=<token> pnpm sync:code-styleguide
```

## 开发

```bash
pnpm install
pnpm check    # oxfmt --check、oxlint 类型检查与 vitest
pnpm build    # 用 tsdown 生成 dist/dsh/init.js
pnpm format
```

改动 `src/` 或 `dsh/` 后要运行 `pnpm build` 并提交 `dist/`。CI 会重新构建，`dist/` 与源码不一致时失败。

## 许可证

本仓库使用 [Apache License 2.0](LICENSE)。`vendor/init-prompts/` 下的文件沿用各自上游的许可证，许可证原文与上游 prompt 放在同一目录。
