## agent-stash@1.1.0

### 支持更多 Agent 与预设

- `/init` 支持 Cline、Grok Build、goose 与 Aider：Cline 通过插件注册 `/init`，Grok Build 与 goose 由 `agent-stash init install` 写入 `/init-<预设名>` 命令，Aider 用 `agent-stash init aider` 启动。
- 新增从 Qwen Code 同步的 `qwen-code` 预设，去掉了开头介绍 Qwen Code 身份的一句。
- 新增从 Kilo Code 同步的 `kilo-code` 预设。
- `claude-code` 与 `claude-code-init-new` 预设生成 `AGENTS.md`。

## agent-stash@1.0.0

### 首个稳定版本

- `/init` 同时支持 pi 扩展与 DSH 插件，内置 `codex`、`kimi-code`、`opencode`、`crush`、`copilot` 五个从上游同步的预设，以及手动维护的 `claude-code`、`claude-code-init-new`。
- 新增 `code-styleguide` 技能，收录 Google、Angular 与 Android Kotlin 风格指南。
- `/init` 预设与风格指南每天从上游同步。
