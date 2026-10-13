# agent-stash

自用的 Agent Skills、[pi](https://pi.dev) 扩展与 DSH（DeepSeek Harness）插件合集。

## 目录

| 路径                   | 内容                                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| `pi/extensions/`       | pi 扩展，由 `package.json` 的 `pi.extensions` 声明                                |
| `vendor/init-prompts/` | 从上游仓库同步的 `/init` prompt、许可证与 `manifest.json`，由脚本生成，不手动修改 |
| `scripts/`             | 同步脚本                                                                          |

## 安装到 pi

```bash
pi install /path/to/agent-stash
```

只在当前会话试用：

```bash
pi -e /path/to/agent-stash
```

## `/init`

让 agent 分析当前项目并写出 `AGENTS.md`，prompt 取自其他 coding agent 的开源实现。

```text
/init                       使用默认预设
/init kimi                  使用 kimi 预设
/init opencode 重点写测试流程  使用 opencode 预设并附加额外指令
/init 用中文写               第一个词不是预设名时，整段文字作为默认预设的额外指令
```

输入 `/init ` 后按 Tab 可以补全预设名，默认预设会标出 `default`。

### 内置预设

| 预设            | 上游                                                            | 文件                                                              | 许可证     |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| `codex`（默认） | [openai/codex](https://github.com/openai/codex)                 | `codex-rs/tui/assets/prompt_for_init_command.md`                  | Apache-2.0 |
| `kimi`          | [MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) | `packages/agent-core-v2/src/features/sessionInit/profile/init.md` | MIT        |
| `opencode`      | [anomalyco/opencode](https://github.com/anomalyco/opencode)     | `packages/core/src/plugin/command/initialize.txt`                 | MIT        |

每个预设对应的上游 commit 记录在 `vendor/init-prompts/manifest.json`。

### 额外指令与占位符

模板里的占位符在发送前替换：

- `${path}`：当前项目目录。
- `$ARGUMENTS`：额外指令。

模板没有 `$ARGUMENTS` 时，额外指令追加到 prompt 末尾的 `## Additional instructions from the user` 小节。

### 配置

配置文件按以下顺序读取，后读的覆盖先读的：

1. `~/.pi/agent/agent-stash/init.json`（设置了 `PI_CODING_AGENT_DIR` 时为 `$PI_CODING_AGENT_DIR/agent-stash/init.json`）
2. `<项目>/.pi/agent-stash/init.json`，仅在项目受信任时读取

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
- `presets`：自定义预设。`file` 是相对配置文件所在目录的路径，同名预设覆盖内置预设。

配置格式错误或默认预设不存在时，`/init` 直接报错。

## 上游同步

`.github/workflows/sync-init-prompts.yml` 每天运行一次，也可以手动触发。它拉取各上游默认分支最新 commit 中的 prompt 与根目录的 LICENSE、NOTICE 文件，运行检查后向 `chore/sync-init-prompts` 分支开 PR。

仓库需要在 Settings → Actions → General 中开启「Allow GitHub Actions to create and approve pull requests」，workflow 才能创建 PR。

本地同步：

```bash
GITHUB_TOKEN=<token> pnpm sync:init-prompts
```

上游列表在 `scripts/sync-init-prompts.ts` 的 `SOURCES` 中维护。

## 开发

```bash
pnpm install
pnpm check    # oxfmt --check、oxlint 类型检查与 vitest
pnpm format
```

## 许可证

本仓库使用 [Apache License 2.0](LICENSE)。`vendor/init-prompts/` 下的文件沿用各自上游的许可证，许可证原文与上游 prompt 放在同一目录。
